import {ErrorEvent, HistoryElement, Reward} from '../types';
import {SubstrateBlock, SubstrateEvent} from "@subql/types";
import {
    callsFromBatch,
    eventIdFromBlockAndIdx,
    isBatch,
    timestamp,
    eventId,
    isProxy,
    callFromProxy
} from "./common";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";
import {EraIndex} from "@polkadot/types/interfaces/staking"
import {AugmentedEvent} from "@polkadot/api/types";
import {ApiTypes} from "@polkadot/api/types/base";
import {handleRewardRestakeForAnalytics, handleSlashForAnalytics} from "./StakeChanged"

function isPayoutStakers(call: CallBase<AnyTuple>): boolean {
    return call.method == "payoutStakers"
}

function isPayoutValidator(call: CallBase<AnyTuple>): boolean {
    return call.method == "payoutValidator"
}

function extractArgsFromPayoutStakers(call: CallBase<AnyTuple>): [string, number] {
    const [validatorAddressRaw, eraRaw] = call.args

    return [validatorAddressRaw.toString(), (eraRaw as EraIndex).toNumber()]
}

function extractArgsFromPayoutValidator(call: CallBase<AnyTuple>, sender: string): [string, number] {
    const [eraRaw] = call.args

    return [sender, (eraRaw as EraIndex).toNumber()]
}

export async function handleRewarded(rewardEvent: SubstrateEvent): Promise<void> {
    await handleReward(rewardEvent)
}

export async function handleReward(rewardEvent: SubstrateEvent): Promise<void> {
    let rewardEventId = eventId(rewardEvent)
    try {
        let errorOccursOnEvent = await ErrorEvent.get(rewardEventId)
        if (errorOccursOnEvent !== undefined) {
            logger.info(`Skip rewardEvent: ${rewardEventId}`)
            return;
        }

        await handleRewardRestakeForAnalytics(rewardEvent)
        await handleRewardForTxHistory(rewardEvent)
    } catch (error) {
        logger.error(`Got error on reward event: ${rewardEventId}: ${error.toString()}`)
        let saveError = new ErrorEvent(rewardEventId)
        saveError.description = error.toString()
        await saveError.save()
    }
}

async function handleRewardForTxHistory(rewardEvent: SubstrateEvent): Promise<void> {
    let element = await HistoryElement.get(eventId(rewardEvent))

    if (element !== undefined) {
        // already processed reward previously
        return;
    }

    let payoutCallsArgs = rewardEvent.block.block.extrinsics
        .map(extrinsic => determinePayoutCallsArgs(extrinsic.method, extrinsic.signer.toString()))
        .filter(args => args.length != 0)
        .flat()

    if (payoutCallsArgs.length == 0) {
        return
    }

    const distinctValidators = new Set(
        payoutCallsArgs.map(([validator,]) => validator)
    )

    const initialCallIndex = -1

    await buildRewardEvents(
        rewardEvent.block,
        rewardEvent.event.method,
        rewardEvent.event.section,
        initialCallIndex,
        (currentCallIndex, eventAccount) => {
            return distinctValidators.has(eventAccount) ? currentCallIndex + 1 : currentCallIndex
        },
        (currentCallIndex, amount) => {
            const [validator, era] = payoutCallsArgs[currentCallIndex]

            return {
                amount: amount,
                isReward: true,
                validator: validator,
                era: era
            }
        }
    )
}

function determinePayoutCallsArgs(causeCall: CallBase<AnyTuple>, sender: string) : [string, number][] {
    if (isPayoutStakers(causeCall)) {
        return [extractArgsFromPayoutStakers(causeCall)]
    } else if (isPayoutValidator(causeCall)) {
        return [extractArgsFromPayoutValidator(causeCall, sender)]
    } else if (isBatch(causeCall)) {
        return callsFromBatch(causeCall)
            .map(call => {
                return determinePayoutCallsArgs(call, sender)
                    .map((value, index, array) => {
                        return value
                    })
            })
            .flat()
    } else if (isProxy(causeCall)) {
        let proxyCall = callFromProxy(causeCall)
        return determinePayoutCallsArgs(proxyCall, sender)
    } else {
        return []
    }
}

export async function handleSlashed(slashEvent: SubstrateEvent): Promise<void> {
    await handleSlash(slashEvent)
}

export async function handleSlash(slashEvent: SubstrateEvent): Promise<void> {
    let slashEventId = eventId(slashEvent)
    try {
        let errorOccursOnEvent = await ErrorEvent.get(slashEventId)
        if (errorOccursOnEvent !== undefined) {
            logger.info(`Skip slashEvent: ${slashEventId}`)
            return;
        }

        await handleSlashForAnalytics(slashEvent)
        await handleSlashForTxHistory(slashEvent)
    } catch (error) {
        logger.error(`Got error on slash event: ${slashEventId}: ${error.toString()}`)
        let saveError = new ErrorEvent(slashEventId)
        saveError.description = error.toString()
        await saveError.save()
    }
}

async function handleSlashForTxHistory(slashEvent: SubstrateEvent): Promise<void> {
    let element = await HistoryElement.get(eventId(slashEvent))

    if (element !== undefined) {
        // already processed reward previously
        return;
    }

    const currentEra = (await api.query.staking.currentEra()).unwrap()
    const slashDefferDuration = api.consts.staking.slashDeferDuration

    const slashEra = currentEra.toNumber() - slashDefferDuration.toNumber()

    const eraStakersInSlashEra = await api.query.staking.erasStakersClipped.entries(slashEra);
    const validatorsInSlashEra = eraStakersInSlashEra.map(([key, exposure]) => {
        let [, validatorId] = key.args

        return validatorId.toString()
    })
    const validatorsSet = new Set(validatorsInSlashEra)

    const initialValidator: string = ""

    await buildRewardEvents(
        slashEvent.block,
        slashEvent.event.method,
        slashEvent.event.section,
        initialValidator,
        (currentValidator, eventAccount) => {
            return validatorsSet.has(eventAccount) ? eventAccount : currentValidator
        },
        (validator, amount) => {

            return {
                amount: amount,
                isReward: false,
                validator: validator,
                era: slashEra
            }
        }
    )
}

async function buildRewardEvents<A>(
    block: SubstrateBlock,
    eventMethod: String,
    eventSection: String,
    initialInnerAccumulator: A,
    produceNewAccumulator: (currentAccumulator: A, eventAccount: string) => A,
    produceReward: (currentAccumulator: A, amount: string) => Reward
) {
    let blockNumber = block.block.header.number.toString()
    let blockTimestamp = timestamp(block)

    const [, savingPromises] = block.events.reduce<[A, Promise<void>[]]>(
        (accumulator, eventRecord, eventIndex) => {
            let [innerAccumulator, currentPromises] = accumulator

            if (!(eventRecord.event.method == eventMethod && eventRecord.event.section == eventSection)) return accumulator

            let {event: {data: [account, amount]}} = eventRecord

            const newAccumulator = produceNewAccumulator(innerAccumulator, account.toString())

            const eventId = eventIdFromBlockAndIdx(blockNumber, eventIndex.toString())

            const element = new HistoryElement(eventId);

            element.timestamp = blockTimestamp
            element.address = account.toString()
            element.reward = produceReward(newAccumulator, amount.toString())

            currentPromises.push(element.save())

            return [newAccumulator, currentPromises];
        }, [initialInnerAccumulator, []])

    await Promise.allSettled(savingPromises);
}
