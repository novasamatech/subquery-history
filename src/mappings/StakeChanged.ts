import {SubstrateBlock, SubstrateEvent, SubstrateExtrinsic} from "@subql/types";
import {AccumulatedStake, StakeChange} from "../types";
import {blockNumber, eventId, timestamp} from "./common";
import {Balance} from "@polkadot/types/interfaces";
import {RewardDestination} from "@polkadot/types/interfaces/staking";

export async function handleBonded(event: SubstrateEvent): Promise<void> {
    const {event: {data: [stash, amount]}} = event;

    let address = stash.toString()
    let amountBalance = (amount as Balance).toBigInt()
    let accumulatedAmount = await handleAccumulatedStake(address, amountBalance)

    const element = new StakeChange(eventId(event));
    element.timestamp = timestamp(event.block)
    element.address = address
    element.amount = amountBalance.toString()
    element.accumulatedAmount = accumulatedAmount.toString()
    element.type = "bonded"

    await element.save()
}

export async function handleUnbonded(event: SubstrateEvent): Promise<void> {
    const {event: {data: [stash, amount]}} = event;

    let address = stash.toString()
    let amountBalance = (amount as Balance).toBigInt()
    let accumulatedAmount = await handleAccumulatedStake(address, -amountBalance)

    const element = new StakeChange(eventId(event));
    element.timestamp = timestamp(event.block)
    element.address = address
    element.amount = amountBalance.toString()
    element.accumulatedAmount = accumulatedAmount.toString()
    element.type = "unbonded"

    await element.save()
}

export async function handleSlashForAnalytics(event: SubstrateEvent): Promise<void> {
    const {event: {data: [validatorOrNominatorAccountId, amount]}} = event;

    let address = validatorOrNominatorAccountId.toString()
    let amountBalance = (amount as Balance).toBigInt()
    let accumulatedAmount = await handleAccumulatedStake(address, -amountBalance)

    const element = new StakeChange(eventId(event));
    element.timestamp = timestamp(event.block)
    element.address = validatorOrNominatorAccountId.toString()
    element.amount = amountBalance.toString()
    element.accumulatedAmount = accumulatedAmount.toString()
    element.type = "slashed"

    await element.save()
}

let rewardDestinationByAddress: {[address: string]: RewardDestination} = {}

async function cachedRewardDestination(accountAddress: string): Promise<RewardDestination> {
    let cachedValue = rewardDestinationByAddress[accountAddress]
    if (cachedValue !== undefined) {
        return cachedValue
    } else {
        const payee: RewardDestination = await api.query.staking.payee(accountAddress);
        rewardDestinationByAddress[accountAddress] = payee
        return payee
    }
}

export async function handleSetPayee(extrinsic: SubstrateExtrinsic): Promise<void> {
    let args = extrinsic.extrinsic.method.args
    let rewardDestination = args[0] as RewardDestination
    if (rewardDestination === undefined) {
        return
    }
    let accountId = rewardDestination.asAccount
    logger.info(`GOT SET_PAYEE: ${accountId.toString()}`)
    rewardDestinationByAddress[accountId.toString()] = rewardDestination
}

export async function handleRewardRestakeForAnalytics(event: SubstrateEvent): Promise<void> {
    let {event: {data: [accountId, amount]}} = event
    let accountAddress = accountId.toString()

    const payee: RewardDestination = await cachedRewardDestination(accountAddress)
    if (payee.isStaked) {
        let amountBalance = (amount as Balance).toBigInt()
        let accumulatedAmount = await handleAccumulatedStake(accountAddress, amountBalance)

        const element = new StakeChange(eventId(event));
        element.timestamp = timestamp(event.block)
        element.address = accountAddress
        element.amount = amountBalance.toString()
        element.accumulatedAmount = accumulatedAmount.toString()
        element.type = "rewarded"

        await element.save()
    }
}

async function handleAccumulatedStake(address: string, amount: bigint): Promise<bigint> {
    let accumulatedStake = await AccumulatedStake.get(address)
    if (accumulatedStake !== undefined) {
        let accumulatedAmount = BigInt(accumulatedStake.amount).valueOf()
        accumulatedAmount += amount
        accumulatedStake.amount = accumulatedAmount.toString()
        await accumulatedStake.save()
        return accumulatedAmount
    } else {
        let accumulatedStake = new AccumulatedStake(address)
        accumulatedStake.amount = amount.toString()
        await accumulatedStake.save()
        return amount
    }
}
