import {HistoryElement} from '../types';
import {SubstrateEvent} from "@subql/types";
import {callsFromBatch, eventId, isBatch, distinct} from "./common";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";

function isPayoutStakers(call: CallBase<AnyTuple>): boolean {
    return call.method == "payoutStakers"
}

export async function handleReward(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, newReward]}} = event;

    const element = new HistoryElement(eventId(event));

    element.address = account.toString()
    element.timestamp = event.block.timestamp.toISOString()

    const cause = event.extrinsic
    const causeCall = cause.extrinsic.method

    let validator;

    if (isPayoutStakers(causeCall)) {
        const [validatorAddress,] = cause.extrinsic.method.args

        validator = validatorAddress.toString()
    } else if (isBatch(causeCall)) {
        const validatorsInBatch = callsFromBatch(causeCall)
            .filter(isPayoutStakers)
            .map(payoutCall => payoutCall.args[0].toString()) // validator address

        const distinctValidatorsInBatch = distinct(validatorsInBatch)

        // cannot say which reward_stakers triggered this specific event,
        // so can only be sure if there is only one distinct validator throughout all reward_stakers in batch
        if (distinctValidatorsInBatch.length == 1) {
            validator = distinctValidatorsInBatch[0]
        } else {
            validator = null
        }
    } else {
        validator = null
    }

    element.reward = {
        amount: newReward.toString(),
        isReward: true,
        validator: validator
    }

    await element.save();
}

export async function handleSlash(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, newSlash]}} = event;

    const element = new HistoryElement(eventId(event));

    element.address = account.toString()
    element.timestamp = event.block.timestamp.toISOString()
    element.reward = {
        amount: newSlash.toString(),
        isReward: false,
        validator: null // TODO is it possible to determine validator for slash?
    }

    await element.save();
}
