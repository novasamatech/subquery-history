#!/usr/bin/env node
/**
 * check_block.js
 *
 * One-shot helper used by the Python binary-search script.
 * It connects to a Substrate RPC, fetches the requested block and forces
 * @polkadot/api to decode all extrinsics using the historic metadata of that
 * block.  If the operation succeeds, the program prints **OK** to STDOUT,
 * otherwise **FAIL**.
 *
 * The exit code is always 0, so the caller should rely solely on the string
 * written to STDOUT.
 *
 * --------------------------------------------------------------------------
 * Usage
 *   node check_block.js <ws-endpoint> <blockNumber> [preset]
 *
 * Example
 *   node check_block.js wss://moonriver.unitedbloc.com 581188 moonriver
 *
 * The optional `preset` argument is forwarded to `registryPreset`, e.g.
 *   - "moonriver", "moonbeam" for Moonbeam-family chains
 *   - "substrate"  (default)  for generic chains
 *
 * For Moonbeam-family we automatically inject `typesBundlePre900` from the
 * `moonbeam-types-bundle` package so that decoding works without additional
 * user input.
 * --------------------------------------------------------------------------
 */

const { ApiPromise, WsProvider } = require("@polkadot/api");

// ---- argument parsing -----------------------------------------------------

if (process.argv.length < 4) {
  console.error(
    "Usage: node check_block.js <ws-endpoint> <blockNumber> [preset]",
  );
  process.exit(2);
}

const [endpoint, blockStr, presetArg] = process.argv.slice(2);
const blockNumber = Number(blockStr);
if (!Number.isFinite(blockNumber) || blockNumber < 0) {
  console.error("Invalid <blockNumber>");
  process.exit(2);
}
const preset = presetArg || "substrate";

// ---- optional Moonbeam types bundle ---------------------------------------

let typesBundle;
if (["moonriver", "moonbeam", "moonbase"].includes(preset)) {
  try {
    typesBundle = require("moonbeam-types-bundle").typesBundlePre900;
  } catch (e) {
    console.error(
      "moonbeam-types-bundle is required for this preset. Please install it.",
    );
    process.exit(2);
  }
}

// ---- main logic -----------------------------------------------------------

(async () => {
  let api;
  try {
    api = await ApiPromise.create({
      provider: new WsProvider(endpoint),
      registryPreset: preset,
      noInitWarn: true,
      throwOnConnect: true,
      throwOnUnknown: true,
      typesBundle,
    });

    const hash = await api.rpc.chain.getBlockHash(blockNumber);
    // This call decodes header + extrinsics using metadata at `hash`.
    await api.rpc.chain.getBlock(hash);

    console.log("OK");
  } catch (err) {
    console.log("FAIL");
  } finally {
    if (api) await api.disconnect();
  }
})();
