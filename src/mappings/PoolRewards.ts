import {
    AccountPoolReward,
    AccumulatedReward,
    AccumulatedPoolReward,
    HistoryElement, 
    RewardType,
} from '../types';
import {SubstrateEvent} from "@subql/types";
import Big from "big.js";
import {eventIdFromBlockAndIdxAndAddress, timestamp, eventIdWithAddress, blockNumber} from "./common";
import {Codec} from "@polkadot/types/types";
import {INumber} from "@polkadot/types-codec/types/interfaces";
import {PalletNominationPoolsPoolMember} from "@polkadot/types/lookup";
import {handleGenericForTxHistory, updateAccumulatedGenericReward} from "./Rewards";
import {getPoolMembers} from "./Cache";


export async function handlePoolReward(rewardEvent: SubstrateEvent<[accountId: Codec, poolId: INumber, reward: INumber]>): Promise<void> {
    await handlePoolRewardForTxHistory(rewardEvent)
    let accumulatedReward = await updateAccumulatedPoolReward(rewardEvent, true)
    let { event: { data: [accountId, poolId, amount] } } = rewardEvent
    await updateAccountPoolRewards(rewardEvent, accountId.toString(), amount.toBigInt(), poolId.toNumber(), RewardType.reward, accumulatedReward.amount)
}


async function handlePoolRewardForTxHistory(rewardEvent: SubstrateEvent<[accountId: Codec, poolId: INumber, reward: INumber]>): Promise<void> {
    const {event: {data: [account, poolId, amount]}} = rewardEvent
    handleGenericForTxHistory(rewardEvent, account.toString(), async (element: HistoryElement) => {
        element.poolReward = {
            eventIdx: rewardEvent.idx,
            amount: amount.toString(),
            isReward: true,
            poolId: poolId.toNumber()
        } 
        return element       
    })
}

async function updateAccumulatedPoolReward(event: SubstrateEvent<[accountId: Codec, poolId: INumber, reward: INumber]>, isReward: boolean): Promise<AccumulatedReward> {
    let {event: {data: [accountId, _, amount]}} = event
    return await updateAccumulatedGenericReward(AccumulatedPoolReward, accountId.toString(), amount.toBigInt(), isReward)
}

async function updateAccountPoolRewards(event: SubstrateEvent, accountAddress: string, amount: bigint, poolId: number, rewardType: RewardType, accumulatedAmount: bigint): Promise<void> {
    let id = eventIdWithAddress(event, accountAddress)
    let accountPoolReward = new AccountPoolReward(
        id,
        accountAddress,
        blockNumber(event),
        timestamp(event.block),
        amount,
        accumulatedAmount,
        rewardType,
        poolId
    );
    await accountPoolReward.save()
}

export async function handlePoolBondedSlash(bondedSlashEvent: SubstrateEvent<[poolId: INumber, slash: INumber]>): Promise<void> {
    const {event: {data: [poolIdEncoded, slash]}} = bondedSlashEvent
    const poolId = poolIdEncoded.toNumber()

    const pool = (await api.query.nominationPools.bondedPools(poolId)).unwrap()

    await handleRelaychainPooledStakingSlash(
        bondedSlashEvent,
        poolId,
        Big(pool.points.toString()),
        Big(slash.toString()),
        (member: PalletNominationPoolsPoolMember) : Big => {
            return Big(member.points.toString())
        }
    )
}

export async function handlePoolUnbondingSlash(unbondingSlashEvent: SubstrateEvent<[era: INumber, poolId: INumber, slash: INumber]>): Promise<void> {
    const {event: {data: [era, poolId, slash]}} = unbondingSlashEvent
    const poolIdNumber = poolId.toNumber()
    const eraIdNumber = era.toNumber()

    const unbondingPools = (await api.query.nominationPools.subPoolsStorage(poolIdNumber)).unwrap()

    const pool = unbondingPools.withEra[eraIdNumber] ?? unbondingPools.noEra

    await handleRelaychainPooledStakingSlash(
        unbondingSlashEvent,
        poolIdNumber,
        Big(pool.points.toString()),
        Big(slash.toString()),
        (member: PalletNominationPoolsPoolMember) : Big => {
            return Big(member.unbondingEras[eraIdNumber]?.toString() ?? 0)
        }
    )
}

async function handleRelaychainPooledStakingSlash(
    event: SubstrateEvent,
    poolId: number,
    poolPoints: Big,
    slash: Big,
    memberPointsCounter: (member: PalletNominationPoolsPoolMember) => Big
): Promise<void> {
    if(poolPoints.eq(0)) {
        return
    }

    const members = await getPoolMembers(blockNumber(event))

    await Promise.all(members.map(async ([accountId, member]) => {
        let memberPoints: Big
        if (member.poolId.toNumber() === poolId) {
            memberPoints = memberPointsCounter(member)
            if (!memberPoints.eq(0)) {
                const personalSlash = BigInt(slash.mul(memberPoints).div(poolPoints).round().toString())

                await handlePoolSlashForTxHistory(event, poolId, accountId, personalSlash)
                let accumulatedReward = await updateAccumulatedGenericReward(AccumulatedPoolReward, accountId, personalSlash, false)
                await updateAccountPoolRewards(
                    event,
                    accountId,
                    personalSlash,
                    poolId,
                    RewardType.slash,
                    accumulatedReward.amount
                )
            }
        }
    }))
}

async function handlePoolSlashForTxHistory(slashEvent: SubstrateEvent, poolId: number, accountId: string, personalSlash: bigint): Promise<void> {
    const extrinsic = slashEvent.extrinsic;
    const block = slashEvent.block;
    const blockNumber = block.block.header.number.toString()
    const blockTimestamp = timestamp(block)
    const eventId = eventIdFromBlockAndIdxAndAddress(blockNumber, slashEvent.idx.toString(), accountId)

    const element = new HistoryElement(
        eventId,
        block.block.header.number.toNumber(),
        blockTimestamp,
        accountId
    );
    if (extrinsic !== undefined) {
        element.extrinsicHash = extrinsic.extrinsic.hash.toString()
        element.extrinsicIdx = extrinsic.idx
    }
    element.poolReward = {
        eventIdx: slashEvent.idx,
        amount: personalSlash.toString(),
        isReward: false,
        poolId: poolId
    }
    await element.save()
}