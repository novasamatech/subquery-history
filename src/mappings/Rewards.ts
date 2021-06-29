import {HistoryElement} from '../types';
import {SubstrateEvent} from "@subql/types";
import {callsFromBatch, eventIdFromBlockAndIdx, isBatch, distinct, timestamp, eventId} from "./common";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";

function isPayoutStakers(call: CallBase<AnyTuple>): boolean {
    return call.method == "payoutStakers"
}

export async function handleReward(rewardEvent: SubstrateEvent): Promise<void> {
    const {event: {data: [account, newReward]}} = rewardEvent;
    let blockNumber = rewardEvent.block.block.header.number.toString()
    let blockTimestamp = timestamp(rewardEvent.block)

    let element = await HistoryElement.get(eventId(rewardEvent))

    if (element != undefined) {
        // already processed reward previously
        return;
    }

    const cause = rewardEvent.extrinsic
    const causeCall = cause.extrinsic.method

    let payoutedValidators: string[]

    if (isPayoutStakers(causeCall)) {
        const [validatorAddress,] = cause.extrinsic.method.args

        payoutedValidators = [validatorAddress.toString()]
    } else if (isBatch(causeCall)) {
        payoutedValidators = callsFromBatch(causeCall)
            .filter(isPayoutStakers)
            .map(payoutCall => payoutCall.args[0].toString()) // validator address
    }

    const distinctValidators = new Set(payoutedValidators)
    let rewardEventType = api.events.staking.Reward;

    const initialState: [string, Promise<void>[]] = [payoutedValidators[0], []]

    const [, savingPromises] = rewardEvent.block.events
        .reduce<[string, Promise<void>[]]>(
            (accumulator, eventRecord, eventIndex) => {
                let [currentValidator, currentPromises] = accumulator

                // ignore non reward events in the block
                if (!rewardEventType.is(eventRecord.event)) return accumulator

                let {event: {data: [account, newReward]}} = eventRecord
                let eventAccountAddress = account.toString()

                let newValidator = distinctValidators.has(eventAccountAddress) ? eventAccountAddress : currentValidator

                const eventId = eventIdFromBlockAndIdx(blockNumber, eventIndex.toString())
                const rewardHistoryElement = new HistoryElement(eventId)

                rewardHistoryElement.address = account.toString()
                rewardHistoryElement.timestamp = blockTimestamp
                rewardHistoryElement.reward = {
                    amount: newReward.toString(),
                    isReward: true,
                    validator: newValidator
                }

                currentPromises.push(rewardHistoryElement.save())

                return [currentValidator, currentPromises]
            }, initialState)


    await Promise.all(savingPromises)
}

export async function handleSlash(event: SubstrateEvent): Promise<void> {
    const {event: {data: [account, newSlash]}} = event;

    const element = new HistoryElement(eventId(event));

    element.address = account.toString()
    element.timestamp = timestamp(event.block)
    element.reward = {
        amount: newSlash.toString(),
        isReward: false,
        validator: null // TODO is it possible to determine validator for slash?
    }

    await element.save();
}
