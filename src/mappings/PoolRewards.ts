import {
  AccountPoolReward,
  AccumulatedReward,
  AccumulatedPoolReward,
  HistoryElement,
  RewardType,
} from "../types";
import { SubstrateEvent } from "@subql/types";
import {
  eventIdFromBlockAndIdxAndAddress,
  timestamp,
  eventIdWithAddress,
  blockNumber,
} from "./common";
import { Codec } from "@polkadot/types/types";
import { u32 } from "@polkadot/types-codec";
import { INumber } from "@polkadot/types-codec/types/interfaces";
import {
  PalletNominationPoolsBondedPoolInner,
  PalletNominationPoolsPoolMember,
  PalletNominationPoolsSubPools,
} from "@polkadot/types/lookup";
import {
  handleGenericForTxHistory,
  updateAccumulatedGenericReward,
} from "./Rewards";
import { getPoolMembers } from "./Cache";
import { Option } from "@polkadot/types";

export async function handlePoolReward(
  rewardEvent: SubstrateEvent<
    [accountId: Codec, poolId: INumber, reward: INumber]
  >,
): Promise<void> {
  await handlePoolRewardForTxHistory(rewardEvent);
  let accumulatedReward = await updateAccumulatedPoolReward(rewardEvent, true);
  let {
    event: {
      data: [accountId, poolId, amount],
    },
  } = rewardEvent;
  await updateAccountPoolRewards(
    rewardEvent,
    accountId.toString(),
    amount.toBigInt(),
    poolId.toNumber(),
    RewardType.reward,
    accumulatedReward.amount,
  );
}

async function handlePoolRewardForTxHistory(
  rewardEvent: SubstrateEvent<
    [accountId: Codec, poolId: INumber, reward: INumber]
  >,
): Promise<void> {
  const {
    event: {
      data: [account, poolId, amount],
    },
  } = rewardEvent;
  handleGenericForTxHistory(
    rewardEvent,
    account.toString(),
    async (element: HistoryElement) => {
      element.poolReward = {
        eventIdx: rewardEvent.idx,
        amount: amount.toString(),
        isReward: true,
        poolId: poolId.toNumber(),
      };
      return element;
    },
  );
}

async function updateAccumulatedPoolReward(
  event: SubstrateEvent<[accountId: Codec, poolId: INumber, reward: INumber]>,
  isReward: boolean,
): Promise<AccumulatedReward> {
  let {
    event: {
      data: [accountId, _, amount],
    },
  } = event;
  return await updateAccumulatedGenericReward(
    AccumulatedPoolReward,
    accountId.toString(),
    amount.toBigInt(),
    isReward,
  );
}

async function updateAccountPoolRewards(
  event: SubstrateEvent,
  accountAddress: string,
  amount: bigint,
  poolId: number,
  rewardType: RewardType,
  accumulatedAmount: bigint,
): Promise<void> {
  let id = eventIdWithAddress(event, accountAddress);
  let accountPoolReward = new AccountPoolReward(
    id,
    accountAddress,
    blockNumber(event),
    timestamp(event.block),
    amount,
    accumulatedAmount,
    rewardType,
    poolId,
  );
  await accountPoolReward.save();
}

export async function handlePoolBondedSlash(
  bondedSlashEvent: SubstrateEvent<[poolId: INumber, slash: INumber]>,
): Promise<void> {
  const {
    event: {
      data: [poolIdEncoded, slash],
    },
  } = bondedSlashEvent;
  const poolId = poolIdEncoded.toNumber();

  const poolOption = (await api.query.nominationPools.bondedPools(
    poolId,
  )) as Option<PalletNominationPoolsBondedPoolInner>;
  const pool = poolOption.unwrap();

  await handleRelaychainPooledStakingSlash(
    bondedSlashEvent,
    poolId,
    pool.points.toBigInt(),
    slash.toBigInt(),
    (member: PalletNominationPoolsPoolMember): bigint => {
      return member.points.toBigInt();
    },
  );
}

export async function handlePoolUnbondingSlash(
  unbondingSlashEvent: SubstrateEvent<
    [poolId: INumber, era: INumber, slash: INumber]
  >,
): Promise<void> {
  const {
    event: {
      data: [poolId, era, slash],
    },
  } = unbondingSlashEvent;
  const poolIdNumber = poolId.toNumber();
  const eraIdNumber = era.toNumber();

  const unbondingPools = (
    (await api.query.nominationPools.subPoolsStorage(
      poolIdNumber,
    )) as Option<PalletNominationPoolsSubPools>
  ).unwrap();

  const pool =
    unbondingPools.withEra.get(eraIdNumber as unknown as u32) ??
    unbondingPools.noEra;

  await handleRelaychainPooledStakingSlash(
    unbondingSlashEvent,
    poolIdNumber,
    pool.points.toBigInt(),
    slash.toBigInt(),
    (member: PalletNominationPoolsPoolMember): bigint => {
      return (
        member.unbondingEras.get(eraIdNumber as unknown as u32)?.toBigInt() ??
        BigInt(0)
      );
    },
  );
}

async function handleRelaychainPooledStakingSlash(
  event: SubstrateEvent,
  poolId: number,
  poolPoints: bigint,
  slash: bigint,
  memberPointsCounter: (member: PalletNominationPoolsPoolMember) => bigint,
): Promise<void> {
  if (poolPoints == BigInt(0)) {
    return;
  }

  const members = await getPoolMembers(blockNumber(event));

  for (const [accountId, member] of members) {
    let memberPoints: bigint;
    if (member.poolId.toNumber() === poolId) {
      memberPoints = memberPointsCounter(member);
      if (memberPoints != BigInt(0)) {
        const personalSlash = (slash * memberPoints) / poolPoints;

        await handlePoolSlashForTxHistory(
          event,
          poolId,
          accountId,
          personalSlash,
        );
        let accumulatedReward = await updateAccumulatedGenericReward(
          AccumulatedPoolReward,
          accountId,
          personalSlash,
          false,
        );
        await updateAccountPoolRewards(
          event,
          accountId,
          personalSlash,
          poolId,
          RewardType.slash,
          accumulatedReward.amount,
        );
      }
    }
  }
}

async function handlePoolSlashForTxHistory(
  slashEvent: SubstrateEvent,
  poolId: number,
  accountId: string,
  personalSlash: bigint,
): Promise<void> {
  const extrinsic = slashEvent.extrinsic;
  const block = slashEvent.block;
  const blockNumber = block.block.header.number.toString();
  const blockTimestamp = timestamp(block);
  const eventId = eventIdFromBlockAndIdxAndAddress(
    blockNumber,
    slashEvent.idx.toString(),
    accountId,
  );

  const element = HistoryElement.create({
    id: eventId,
    timestamp: blockTimestamp,
    blockNumber: block.block.header.number.toNumber(),
    extrinsicHash:
      extrinsic !== undefined ? extrinsic.extrinsic.hash.toString() : null,
    extrinsicIdx: extrinsic !== undefined ? extrinsic.idx : null,
    address: accountId,
    poolReward: {
      eventIdx: slashEvent.idx,
      amount: personalSlash.toString(),
      isReward: false,
      poolId: poolId,
    },
  });

  await element.save();
}
