import {SubstrateEvent} from "@subql/types";
import {StakeChange} from "../types";
import {eventId, timestamp} from "./common";
import {Balance} from "@polkadot/types/interfaces";
import {RewardDestination} from "@polkadot/types/interfaces/staking";

export async function handleBonded(event: SubstrateEvent): Promise<void> {
    const {event: {data: [stash, amount]}} = event;

    const element = new StakeChange(eventId(event));
    element.timestamp = timestamp(event.extrinsic.block)
    element.address = stash.toString()
    element.amount = (amount as Balance).toString()
    element.type = "bonded"

    await element.save()
}

export async function handleUnbonded(event: SubstrateEvent): Promise<void> {
    const {event: {data: [stash, amount]}} = event;

    const element = new StakeChange(eventId(event));
    element.timestamp = timestamp(event.extrinsic.block)
    element.address = stash.toString()
    element.amount = (amount as Balance).toString()
    element.type = "unbonded"

    await element.save()
}

export async function handleSlashForAnalytics(event: SubstrateEvent): Promise<void> {
    const {event: {data: [validatorOrNominatorAccountId, amount]}} = event;

    const element = new StakeChange(eventId(event));
    element.timestamp = timestamp(event.block)
    element.address = validatorOrNominatorAccountId.toString()
    element.amount = (amount as Balance).toString()
    element.type = "slashed"

    await element.save()
}

export async function handleRewardRestakeForAnalytics(event: SubstrateEvent): Promise<void> {
    let {event: {data: [accountId, amount]}} = event
    let accountAddress = accountId.toString()

    const payee: RewardDestination = await api.query.staking.payee(accountAddress);
    if (payee.isStaked) {
        const element = new StakeChange(eventId(event));
        element.timestamp = timestamp(event.block)
        element.address = accountAddress
        element.amount = (amount as Balance).toString()
        element.type = "rewarded"

        await element.save()
    }
}
