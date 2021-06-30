import {HistoryElement} from '../types';
import {SubstrateEvent} from "@subql/types";
import {callsFromBatch, eventIdFromBlockAndIdx, isBatch, timestamp, eventId} from "./common";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";
import {EraIndex} from "@polkadot/types/interfaces/staking"

function isPayoutStakers(call: CallBase<AnyTuple>): boolean {
    return call.method == "payoutStakers"
}

function extractArgsFromPayoutStakers(call: CallBase<AnyTuple>): [string, number] {
    const [validatorAddressRaw, eraRaw] = call.args

    return [validatorAddressRaw.toString(), (eraRaw as EraIndex).toNumber()]
}

export async function handleReward(rewardEvent: SubstrateEvent): Promise<void> {
    let blockNumber = rewardEvent.block.block.header.number.toString()
    let blockTimestamp = timestamp(rewardEvent.block)

    let element = await HistoryElement.get(eventId(rewardEvent))

    if (element != undefined) {
        // already processed reward previously
        return;
    }

    const cause = rewardEvent.extrinsic
    const causeCall = cause.extrinsic.method

    let payoutCallsArgs: [string, number][]

    if (isPayoutStakers(causeCall)) {
        payoutCallsArgs = [extractArgsFromPayoutStakers(cause.extrinsic.method)]
    } else if (isBatch(causeCall)) {
        payoutCallsArgs = callsFromBatch(causeCall)
            .filter(isPayoutStakers)
            .map(extractArgsFromPayoutStakers)
    }

    const distinctValidators = new Set(
        payoutCallsArgs.map(([validator,]) => validator)
    )

    let rewardEventType = api.events.staking.Reward;

    const initialState: [number, Promise<void>[]] = [-1, []]

    const [, savingPromises] = rewardEvent.block.events
        .reduce<[number, Promise<void>[]]>(
            (accumulator, eventRecord, eventIndex) => {
                let [currentCallIndex, currentPromises] = accumulator

                // ignore non reward events in the block
                if (!rewardEventType.is(eventRecord.event)) return accumulator

                let {event: {data: [account, newReward]}} = eventRecord
                let eventAccountAddress = account.toString()

                let newCallIndex = distinctValidators.has(eventAccountAddress) ? currentCallIndex + 1 : currentCallIndex

                const eventId = eventIdFromBlockAndIdx(blockNumber, eventIndex.toString())
                const rewardHistoryElement = new HistoryElement(eventId)

                const [validator, era] = payoutCallsArgs[newCallIndex]

                rewardHistoryElement.address = account.toString()
                rewardHistoryElement.timestamp = blockTimestamp
                rewardHistoryElement.reward = {
                    amount: newReward.toString(),
                    isReward: true,
                    validator: validator,
                    era: era
                }

                currentPromises.push(rewardHistoryElement.save())

                return [newCallIndex, currentPromises]
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
        validator: null, // TODO is it possible to determine validator for slash?
        era: null // TODO
    }

    await element.save();
}
