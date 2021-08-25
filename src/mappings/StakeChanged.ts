import {SubstrateEvent} from "@subql/types";
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

// Due to memory consumption optimization `rewardDestinationByAddress` contains only one key
let rewardDestinationByAddress: {[blockId: string]: {[address: string]: RewardDestination}} = {}

async function cachedRewardDestination(accountAddress: string, event: SubstrateEvent): Promise<RewardDestination> {
    const blockId = blockNumber(event)
    let cachedBlock = rewardDestinationByAddress[blockId]
    
    if (cachedBlock !== undefined) {
        return cachedBlock[accountAddress]
    } else {
        rewardDestinationByAddress = {}
        
        let method = event.event.method
        let section = event.event.section

        const allAccountsInBlock = event.block.events
            .filter(blockEvent => { 
                return blockEvent.event.method == method && blockEvent.event.section == section
            })
            .map(event => { 
                let {event: {data: [accountId, ]}} = event
                return accountId
            });

        const payees = await api.query.staking.payee.multi(allAccountsInBlock);
        const rewardDestinations = payees.map(payee => { return payee as RewardDestination });
        
        let destinationByAddress: {[address: string]: RewardDestination} = {}
        
        // something went wrong, so just query for single accountAddress
        if (rewardDestinations.length !== allAccountsInBlock.length) {
            const payee = await api.query.staking.payee(accountAddress);
            destinationByAddress[accountAddress] = payee;
            rewardDestinationByAddress[blockId] = destinationByAddress
            return payee
        }
        allAccountsInBlock.forEach((account, index) => { 
            let accountAddress = account.toString()
            let rewardDestination = rewardDestinations[index]
            destinationByAddress[accountAddress] = rewardDestination
        })
        rewardDestinationByAddress[blockId] = destinationByAddress
        return destinationByAddress[accountAddress]
    }
}

export async function handleRewardRestakeForAnalytics(event: SubstrateEvent): Promise<void> {
    let {event: {data: [accountId, amount]}} = event
    let accountAddress = accountId.toString()

    const payee = await cachedRewardDestination(accountAddress, event)
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
