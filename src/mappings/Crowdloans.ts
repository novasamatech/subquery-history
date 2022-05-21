import {CrowdloanContribute, AccumulatedContribute} from '../types';
import {SubstrateEvent} from "@subql/types";
import {
    timestamp,
    eventId,
} from "./common";
import {Balance} from "@polkadot/types/interfaces";


export async function handleContributed(event: SubstrateEvent): Promise<void> {
    await handleContribute(event)
}


async function handleContribute(event: SubstrateEvent): Promise<void> {
    await handleContributeForContributionHistory(event)
    await updateAccumulatedContribution(event)
}


async function handleContributeForContributionHistory(event: SubstrateEvent) {
    const contribute = new CrowdloanContribute(eventId(event))
    const block = event.block;
    const blockNumber = block.block.header.number.toNumber()
    const blockTimestamp = timestamp(block)
    const { event: { data: [account, parachainId, amount] } } = event

    contribute.blockNumber = blockNumber
    contribute.timestamp = blockTimestamp
    contribute.amount = (amount as Balance).toBigInt()
    contribute.parachainId = parachainId.toString()
    contribute.address = account.toString()

    await contribute.save()
}

async function updateAccumulatedContribution(event: SubstrateEvent) {
    let { event: { data: [accountId, parachainId, amount] } } = event
    const bigIntAmount = (amount as Balance).toBigInt()

    let accountAddress = accountId.toString()

    let accumulatedContribute = await AccumulatedContribute.get(accountAddress);

    const exist_parachain = accumulatedContribute?.parachains?.find(args => args.parachainId == parachainId.toString())

    if (exist_parachain) { //Check that account already has a contribution for that parachain

        let parachain = accumulatedContribute.parachains
            .find(args => args.parachainId == parachainId.toString())
        parachain.amount = (BigInt(parachain.amount) + bigIntAmount).toString()

    } else {

        if (!accumulatedContribute) { //Check that account already has a contribution for someone parachain
            accumulatedContribute = new AccumulatedContribute(accountAddress);
            accumulatedContribute.totalContributionAmount = BigInt(0)
            accumulatedContribute.parachains = [{
                parachainId: parachainId.toString(),
                amount: bigIntAmount.toString()
            }]
        } else { //If account already has a contribution to another parachain will add current parachain in the parachains array
            accumulatedContribute.parachains.push(
                {
                    parachainId: parachainId.toString(),
                    amount: bigIntAmount.toString()
                }
            )
        }
    }

    accumulatedContribute.totalContributionAmount = accumulatedContribute.totalContributionAmount + bigIntAmount
    await accumulatedContribute.save()
}
