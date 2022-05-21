import { AccumulatedReward, CrowdloanContribute, AccumulatedContribute } from '../types';
import { SubstrateEvent } from "@subql/types";
import {
    timestamp,
    eventId,
} from "./common";
import { Balance } from "@polkadot/types/interfaces";


export async function handleContributed(event: SubstrateEvent): Promise<void> {
    await handleContribute(event)
}


async function handleContribute(event: SubstrateEvent): Promise<void> {
    await handleContributeForContributionHistory(event)
    await updateAccumulatedContribution(event)
    Promise.resolve()
}


async function handleContributeForContributionHistory(event: SubstrateEvent) {
    const contribute = new CrowdloanContribute(eventId(event))
    logger.info(contribute)
    const block = event.block;
    const blockNumber = block.block.header.number.toNumber()
    const blockTimestamp = timestamp(block)
    contribute.blockNumber = blockNumber
    contribute.timestamp = blockTimestamp
    const { event: { data: [account, para_id, amount] } } = event
    contribute.amount = (amount as Balance).toBigInt()
    contribute.parachain_id = para_id.toString()
    contribute.address = account.toString()
    await contribute.save()
}

async function updateAccumulatedContribution(event: SubstrateEvent) {
    let { event: { data: [accountId, parachain_id, amount] } } = event
    let accountAddress = accountId.toString()

    let accumulatedContribute = await AccumulatedContribute.get(accountAddress);
    if (!accumulatedContribute) {
        accumulatedContribute = new AccumulatedContribute(accountAddress);
        accumulatedContribute.amount = BigInt(0)
        accumulatedContribute.parachains = [{
            parachain_id: parachain_id.toString(),
            amount: (amount as Balance).toBigInt()
        }]
    }
    const exist_parachain = accumulatedContribute.parachains.filter(args => args.parachain_id == parachain_id.toString())

    if (exist_parachain) {
        accumulatedContribute.parachains
            .filter(args => args.parachain_id == parachain_id.toString())
            .map(parachain => parachain.amount += (amount as Balance).toBigInt())
    } else {
        accumulatedContribute.parachains
            .filter(args => args.parachain_id == parachain_id.toString())
            .push(
                {
                    parachain_id: parachain_id.toString(),
                    amount: (amount as Balance).toBigInt()
                }
            )
    }

    const newAmount = (amount as Balance).toBigInt()
    accumulatedContribute.amount = accumulatedContribute.amount + newAmount
    await accumulatedContribute.save()
}
