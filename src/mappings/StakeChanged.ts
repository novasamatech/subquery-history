import {SubstrateEvent} from "@subql/types";
import {AccumulatedStake, StakeChange} from "../types";
import {blockNumber, eventId, timestamp} from "./common";
import {Balance} from "@polkadot/types/interfaces";
import {RewardDestination} from "@polkadot/types/interfaces/staking";
import {cachedRewardDestination} from "./Cache"

export async function handleBonded(event: SubstrateEvent): Promise<void> {
    const {event: {data: [stash, amount]}} = event;

    let address = stash.toString()
    let amountBalance = (amount as Balance).toBigInt()
    let accumulatedAmount = await handleAccumulatedStake(address, amountBalance)

    const element = new StakeChange(eventId(event));
    if (event.extrinsic !== undefined) {
        element.extrinsicHash = event.extrinsic?.extrinsic.hash.toString()
    }
    element.blockNumber = event.block.block.header.number.toNumber()
    element.eventIdx = event.idx
    element.timestamp = timestamp(event.block)
    element.address = address
    element.amount = amountBalance
    element.accumulatedAmount = accumulatedAmount
    element.type = "bonded"

    await element.save()
}

export async function handleUnbonded(event: SubstrateEvent): Promise<void> {
    const {event: {data: [stash, amount]}} = event;

    let address = stash.toString()
    let amountBalance = (amount as Balance).toBigInt()
    let accumulatedAmount = await handleAccumulatedStake(address, -amountBalance)

    const element = new StakeChange(eventId(event));
    if (event.extrinsic !== undefined) {
        element.extrinsicHash = event.extrinsic?.extrinsic.hash.toString()
    }
    element.blockNumber = event.block.block.header.number.toNumber()
    element.eventIdx = event.idx
    element.timestamp = timestamp(event.block)
    element.address = address
    element.amount = amountBalance
    element.accumulatedAmount = accumulatedAmount
    element.type = "unbonded"

    await element.save()
}

export async function handleSlashForAnalytics(event: SubstrateEvent): Promise<void> {
    const {event: {data: [validatorOrNominatorAccountId, amount]}} = event;

    let address = validatorOrNominatorAccountId.toString()
    let amountBalance = (amount as Balance).toBigInt()
    let accumulatedAmount = await handleAccumulatedStake(address, -amountBalance)

    const element = new StakeChange(eventId(event));
    if (event.extrinsic !== undefined) {
        element.extrinsicHash = event.extrinsic?.extrinsic.hash.toString()
    }
    element.blockNumber = event.block.block.header.number.toNumber()
    element.eventIdx = event.idx
    element.timestamp = timestamp(event.block)
    element.address = validatorOrNominatorAccountId.toString()
    element.amount = amountBalance
    element.accumulatedAmount = accumulatedAmount
    element.type = "slashed"

    await element.save()
}

export async function handleRewardRestakeForAnalytics(event: SubstrateEvent): Promise<void> {
    let {event: {data: [accountId, amount]}} = event
    let accountAddress = accountId.toString()

    const payee = await cachedRewardDestination(accountAddress, event)
    if (payee.isStaked) {
        let amountBalance = (amount as Balance).toBigInt()
        let accumulatedAmount = await handleAccumulatedStake(accountAddress, amountBalance)

        const element = new StakeChange(eventId(event));
        if (event.extrinsic !== undefined) {
            element.extrinsicHash = event.extrinsic?.extrinsic.hash.toString()
        }
        element.blockNumber = event.block.block.header.number.toNumber()
        element.eventIdx = event.idx
        element.timestamp = timestamp(event.block)
        element.address = accountAddress
        element.amount = amountBalance
        element.accumulatedAmount = accumulatedAmount
        element.type = "rewarded"

        await element.save()
    }
}

async function handleAccumulatedStake(address: string, amount: bigint): Promise<bigint> {
    let accumulatedStake = await AccumulatedStake.get(address)
    if (accumulatedStake !== undefined) {
        let accumulatedAmount = BigInt(accumulatedStake.amount).valueOf()
        accumulatedAmount += amount
        accumulatedStake.amount = accumulatedAmount
        await accumulatedStake.save()
        return accumulatedAmount
    } else {
        let accumulatedStake = new AccumulatedStake(address)
        accumulatedStake.amount = amount
        await accumulatedStake.save()
        return amount
    }
}
