import {
    AccountPoolReward,
    AccumulatedReward,
    AccumulatedPoolReward,
    HistoryElement, 
    RewardType,
} from '../types';
import {SubstrateEvent} from "@subql/types";
import {timestamp, eventIdWithAddress, blockNumber} from "./common";
import {Codec} from "@polkadot/types/types";
import {INumber} from "@polkadot/types-codec/types/interfaces";
import {handleGenericForTxHistory, updateAccumulatedGenericReward} from "./Rewards";


export async function handlePoolReward(rewardEvent: SubstrateEvent<[accountId: Codec, poolId: INumber, reward: INumber]>): Promise<void> {
    await handlePoolRewardForTxHistory(rewardEvent)
    let accumulatedReward = await updateAccumulatedPoolReward(rewardEvent, true)
    await updateAccountPoolRewards(rewardEvent, RewardType.reward, accumulatedReward.amount)
}


// TODO: Unite with parachain tx history
async function handlePoolRewardForTxHistory(rewardEvent: SubstrateEvent<[accountId: Codec, poolId: INumber, reward: INumber]>): Promise<void> {
    const {event: {data: [account, poolId, amount]}} = rewardEvent
    handleGenericForTxHistory(rewardEvent, account.toString(), async (element: HistoryElement) => {
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

    const accountAddress = accountId.toString()
    let id = eventIdWithAddress(event, accountAddress)
    let accountPoolReward = new AccountPoolReward(
        id,
        accountAddress,
        blockNumber(event),
        timestamp(event.block),
        amount.toBigInt(),
        accumulatedAmount,
        rewardType,
        poolId.toNumber()
    );
    await accountPoolReward.save()
}