import { SubstrateEvent } from "@subql/types";
import { EraValidatorInfo } from "../types/models/EraValidatorInfo";
import { IndividualExposure } from "../types";
import {
  SpStakingPagedExposureMetadata,
  SpStakingExposurePage,
  PalletStakingActiveEraInfo,
} from "@polkadot/types/lookup";
import { Option } from "@polkadot/types";
import { INumber } from "@polkadot/types-codec/types/interfaces";
import { Exposure } from "@polkadot/types/interfaces";

export async function handleStakersElected(
  event: SubstrateEvent,
): Promise<void> {
  await handleNewEra(event);
}

// Asset Hub (staking-async): currentEra at the EraPaid block already points to
// the next planned era whose exposures are not on-chain yet, and election events
// are not reliable either (recent runtimes stopped emitting PagedElectionProceeded
// for every page on the success path). The era that just became active is the
// invariant: it cannot start without its full validator set, so snapshot activeEra
// at the rotation block. getByEra guards against double-writes (backfill, reindex).
export async function handleAHEraPaid(event: SubstrateEvent): Promise<void> {
  const activeEra = (
    (await api.query.staking.activeEra()) as Option<PalletStakingActiveEraInfo>
  )
    .unwrap()
    .index.toNumber();

  const existing = await EraValidatorInfo.getByEra(activeEra);
  if (existing !== undefined && existing.length > 0) {
    return;
  }

  await processEraStakersPaged(activeEra);
}

export async function handleNewEra(event: SubstrateEvent): Promise<void> {
  const currentEra = ((await api.query.staking.currentEra()) as Option<INumber>)
    .unwrap()
    .toNumber();

  if (api.query.staking.erasStakersOverview) {
    await processEraStakersPaged(currentEra);
  } else {
    await processEraStakersClipped(currentEra);
  }
}

async function processEraStakersClipped(currentEra: number): Promise<void> {
  const exposures =
    await api.query.staking.erasStakersClipped.entries(currentEra);

  for (const [key, exposure] of exposures) {
    const [, validatorId] = key.args;
    let validatorIdString = validatorId.toString();
    const exp = exposure as unknown as Exposure;
    const eraValidatorInfo = new EraValidatorInfo(
      `${currentEra}-${validatorIdString}`,
      validatorIdString,
      currentEra,
      exp.total.toBigInt(),
      exp.own.toBigInt(),
      exp.others.map((other) => {
        return {
          who: other.who.toString(),
          value: other.value.toString(),
        } as IndividualExposure;
      }),
    );
    await eraValidatorInfo.save();
  }
}

async function processEraStakersPaged(currentEra: number): Promise<void> {
  const overview =
    await api.query.staking.erasStakersOverview.entries(currentEra);
  const pages = await api.query.staking.erasStakersPaged.entries(currentEra);

  interface AccumulatorType {
    [key: string]: any;
  }

  const othersCounted = pages.reduce(
    (accumulator: AccumulatorType, [key, exp]) => {
      const exposure = (
        exp as unknown as Option<SpStakingExposurePage>
      ).unwrap();
      const [, validatorId, pageId] = key.args;
      const pageNumber = (pageId as INumber).toNumber();
      const validatorIdString = validatorId.toString();

      const others = exposure.others.map(({ who, value }) => {
        return {
          who: who.toString(),
          value: value.toString(),
        } as IndividualExposure;
      });

      (accumulator[validatorIdString] = accumulator[validatorIdString] || {})[
        pageNumber
      ] = others;
      return accumulator;
    },
    {},
  );

  for (const [key, exp] of overview) {
    const exposure = (
      exp as unknown as Option<SpStakingPagedExposureMetadata>
    ).unwrap();
    const [, validatorId] = key.args;
    let validatorIdString = validatorId.toString();

    let others = [];
    for (let i = 0; i < exposure.pageCount.toNumber(); ++i) {
      others.push(...othersCounted[validatorIdString][i]);
    }

    const eraValidatorInfo = new EraValidatorInfo(
      `${currentEra}-${validatorIdString}`,
      validatorIdString,
      currentEra,
      exposure.total.toBigInt(),
      exposure.own.toBigInt(),
      others,
    );
    await eraValidatorInfo.save();
  }
}
