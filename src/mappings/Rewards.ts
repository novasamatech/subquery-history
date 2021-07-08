import {HistoryElement, Reward} from '../types';
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

function extractArgsFromPayoutStakers(call: CallBase<AnyTuple>): [string, number] {
    const [validatorAddressRaw, eraRaw] = call.args

    return [validatorAddressRaw.toString(), (eraRaw as EraIndex).toNumber()]
}

export async function handleReward(rewardEvent: SubstrateEvent): Promise<void> {
    await handleRewardRestakeForAnalytics(rewardEvent)
    await handleRewardForTxHistory(rewardEvent)
}

async function handleRewardForTxHistory(rewardEvent: SubstrateEvent): Promise<void> {
    let element = await HistoryElement.get(eventId(rewardEvent))

    if (element != undefined) {
        // already processed reward previously
        return;
    }

    const causeCall = rewardEvent.extrinsic.extrinsic.method
    let payoutCallsArgs = determinePayoutCallsArgs(causeCall)

    const distinctValidators = new Set(
        payoutCallsArgs.map(([validator,]) => validator)
    )

    const initialCallIndex = -1

    await buildRewardEvents(
        rewardEvent.block,
        api.events.staking.Reward,
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

function determinePayoutCallsArgs(causeCall: CallBase<AnyTuple>) : [string, number][] {
    if (isPayoutStakers(causeCall)) {
        return [extractArgsFromPayoutStakers(causeCall)]
    } else if (isBatch(causeCall)) {
        let calls = callsFromBatch(causeCall)
        let payoutStakers = calls
            .filter(isPayoutStakers)
            .map(extractArgsFromPayoutStakers)

        let proxyCalls = calls
            .filter(isProxy)
            .map(callFromProxy)
            .flatMap(determinePayoutCallsArgs)

        return payoutStakers.concat(proxyCalls)
    } else if (isProxy(causeCall)) {
        let proxyCall = callFromProxy(causeCall)
        return determinePayoutCallsArgs(proxyCall)
    }
}

export async function handleSlash(slashEvent: SubstrateEvent): Promise<void> {
    await handleSlashForAnalytics(slashEvent)
    await handleSlashForTxHistory(slashEvent)
}

async function handleSlashForTxHistory(slashEvent: SubstrateEvent): Promise<void> {
    let element = await HistoryElement.get(eventId(slashEvent))

    if (element != undefined) {
        // already processed reward previously
        return;
    }

    const currentEra = (await api.query.staking.currentEra()).unwrap();
    const slashDefferDuration = api.consts.staking.slashDeferDuration

    const slashEra = currentEra.toNumber() - slashDefferDuration.toNumber()

    const eraStakersInSlashEra = await api.query.staking.erasStakers.entries(slashEra);
    const validatorsInSlashEra = eraStakersInSlashEra.map(([key, exposure]) => {
        let [, validatorId] = key.args

        return validatorId.toString()
    })
    const validatorsSet = new Set(validatorsInSlashEra)

    const initialValidator: string | null = null

    await buildRewardEvents(
        slashEvent.block,
        api.events.staking.Slash,
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
    eventType: AugmentedEvent<ApiTypes>,
    initialInnerAccumulator: A,
    produceNewAccumulator: (currentAccumulator: A, eventAccount: string) => A,
    produceReward: (currentAccumulator: A, amount: string) => Reward
) {
    let blockNumber = block.block.header.number.toString()
    let blockTimestamp = timestamp(block)

    const [, savingPromises] = block.events.reduce<[A, Promise<void>[]]>(
        (accumulator, eventRecord, eventIndex) => {
            let [innerAccumulator, currentPromises] = accumulator

            if (!eventType.is(eventRecord.event)) return accumulator

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

    await Promise.all(savingPromises);
}
