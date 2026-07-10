#!/usr/bin/env node
/**
 * Backfills the era_validator_infos table from current on-chain state.
 *
 * Asset Hub indexers stopped saving EraValidatorInfo after the staking-async
 * runtime upgrade (see handlePagedElectionProceeded in src/mappings/NewEra.ts).
 * The chain keeps exposures for the last `historyDepth` (84) eras in state, so
 * the missing part of the payout window can be restored without reindexing.
 *
 * The script reads erasStakersOverview/erasStakersPaged for each era in the
 * range and generates a SQL file with idempotent INSERTs (ON CONFLICT DO
 * NOTHING), to be applied with psql against the project database:
 *
 *   node scripts/backfill_era_validator_infos.js \
 *     --ws wss://asset-hub-polkadot-rpc.n.dwellir.com \
 *     --out polkadot-ah-backfill.sql \
 *     [--from 2144] [--to 2227] [--schema app] [--no-timestamps]
 *
 *   psql -h <host> -p <port> -U <user> -d <db> -f polkadot-ah-backfill.sql
 *
 * Defaults: from = currentEra - historyDepth, to = currentEra, schema = app.
 * Eras whose exposures are already pruned from state are skipped with a warning.
 * Row ids use the `<era>-backfill-<validator>` format so they never collide
 * with handler-written rows (`<block>-<eventIdx><validator>`).
 */

const { ApiPromise, WsProvider } = require("@polkadot/api");
const fs = require("fs");

function parseArgs() {
  const args = { schema: "app", timestamps: true };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--ws":
        args.ws = argv[++i];
        break;
      case "--out":
        args.out = argv[++i];
        break;
      case "--from":
        args.from = parseInt(argv[++i], 10);
        break;
      case "--to":
        args.to = parseInt(argv[++i], 10);
        break;
      case "--schema":
        args.schema = argv[++i];
        break;
      case "--no-timestamps":
        args.timestamps = false;
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  if (!args.ws || !args.out) {
    throw new Error(
      "Usage: backfill_era_validator_infos.js --ws <endpoint> --out <file.sql> [--from <era>] [--to <era>] [--schema app] [--no-timestamps]",
    );
  }
  return args;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

async function fetchEraRows(api, era) {
  const overview = await api.query.staking.erasStakersOverview.entries(era);
  if (overview.length === 0) {
    return [];
  }
  const pages = await api.query.staking.erasStakersPaged.entries(era);

  const othersByValidator = {};
  for (const [key, exp] of pages) {
    const [, validatorId, pageId] = key.args;
    const validator = validatorId.toString();
    const others = exp.unwrap().others.map(({ who, value }) => {
      return { who: who.toString(), value: value.toString() };
    });
    (othersByValidator[validator] = othersByValidator[validator] || {})[
      pageId.toNumber()
    ] = others;
  }

  return overview.map(([key, exp]) => {
    const [, validatorId] = key.args;
    const validator = validatorId.toString();
    const exposure = exp.unwrap();

    const others = [];
    const pageMap = othersByValidator[validator] || {};
    for (let page = 0; page < exposure.pageCount.toNumber(); page++) {
      if (pageMap[page]) {
        others.push(...pageMap[page]);
      } else {
        console.warn(
          `warning: missing page ${page} for validator ${validator} in era ${era}`,
        );
      }
    }

    return {
      id: `${era}-backfill-${validator}`,
      address: validator,
      era: era,
      total: exposure.total.toBigInt().toString(),
      own: exposure.own.toBigInt().toString(),
      others: others,
    };
  });
}

function rowsToSql(rows, schema, timestamps) {
  const columns = ["id", "address", "era", "total", "own", "others"];
  if (timestamps) {
    columns.push("created_at", "updated_at");
  }
  const values = rows
    .map((row) => {
      const value = [
        sqlString(row.id),
        sqlString(row.address),
        row.era,
        row.total,
        row.own,
        `${sqlString(JSON.stringify(row.others))}::jsonb`,
      ];
      if (timestamps) {
        value.push("now()", "now()");
      }
      return `(${value.join(", ")})`;
    })
    .join(",\n");

  return (
    `INSERT INTO "${schema}".era_validator_infos (${columns.join(", ")})\n` +
    `VALUES\n${values}\nON CONFLICT (id) DO NOTHING;\n\n`
  );
}

async function main() {
  const args = parseArgs();

  const api = await ApiPromise.create({ provider: new WsProvider(args.ws) });

  const currentEra = (await api.query.staking.currentEra()).unwrap().toNumber();
  const historyDepth = api.consts.staking.historyDepth.toNumber();
  const from = args.from ?? currentEra - historyDepth;
  const to = args.to ?? currentEra;
  console.log(
    `currentEra=${currentEra} historyDepth=${historyDepth}; backfilling eras ${from}..${to} into "${args.schema}".era_validator_infos`,
  );

  const out = fs.createWriteStream(args.out);
  out.write(
    `-- era_validator_infos backfill generated by scripts/backfill_era_validator_infos.js\n` +
      `-- endpoint: ${args.ws}, eras: ${from}..${to}\n\n`,
  );

  let totalRows = 0;
  const skipped = [];
  for (let era = from; era <= to; era++) {
    const rows = await fetchEraRows(api, era);
    if (rows.length === 0) {
      skipped.push(era);
      console.warn(`era ${era}: no exposures in state (pruned?), skipping`);
      continue;
    }
    out.write(rowsToSql(rows, args.schema, args.timestamps));
    totalRows += rows.length;
    console.log(`era ${era}: ${rows.length} validators`);
  }

  await new Promise((resolve) => out.end(resolve));
  console.log(
    `done: ${totalRows} rows written to ${args.out}` +
      (skipped.length > 0 ? `; skipped eras: ${skipped.join(", ")}` : ""),
  );
  process.exit(0);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
