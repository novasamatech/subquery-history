import {
    AccountPoolReward,
    AccumulatedReward,
    AccumulatedPoolReward,
    HistoryElement, 
    RewardType,
} from '../types';
import {SubstrateEvent} from "@subql/types";
import {Codec} from "@polkadot/types/types";
import {INumber} from "@polkadot/types-codec/types/interfaces";
import {handleGenericForTxHistory, updateAccumulatedGenericReward, updateGenericAccountRewards} from "./Rewards";


export async function handlePoolReward(rewardEvent: SubstrateEvent<[accountId: Codec, poolId: INumber, reward: INumber]>): Promise<void> {
    await handlePoolRewardForTxHistory(rewardEvent)
    let accumulatedReward = await updateAccumulatedPoolReward(rewardEvent, true)
    await updateAccountPoolRewards(rewardEvent, RewardType.reward, accumulatedReward.amount)
}


// TODO: Unite with parachain tx history
async function handlePoolRewardForTxHistory(rewardEvent: SubstrateEvent<[accountId: Codec, poolId: INumber, reward: INumber]>): Promise<void> {
    handleGenericForTxHistory(rewardEvent, async (element: HistoryElement) => {
        const {event: {data: [account, poolId, amount]}} = rewardEvent
        element.address = account.toString()
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
    return await updateAccumulatedGenericReward(AccumulatedPoolReward, accountId, amount, isReward)
}

async function updateAccountPoolRewards(event: SubstrateEvent<[accountId: Codec, poolId: INumber, reward: INumber]>, rewardType: RewardType, accumulatedAmount: bigint): Promise<void> {
    let { event: { data: [accountId, poolId, amount] } } = event

    updateGenericAccountRewards(
        AccountPoolReward,
        event,
        accountId.toString(),
        amount.toBigInt(),
        rewardType,
        accumulatedAmount,
        (element: AccountPoolReward) => {
            element.poolId = poolId.toNumber()
            return element
        }
    )
}