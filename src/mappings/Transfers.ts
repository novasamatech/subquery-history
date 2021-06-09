import {HistoryElement} from '../types/models/HistoryElement';
import {SubstrateEvent} from "@subql/types";
import {Balance} from "@polkadot/types/interfaces";

function eventId(event: SubstrateEvent): string {
    return `${event.block.block.header.number.toString()}-${event.idx}`
}

export async function handleTransfer(event: SubstrateEvent): Promise<void> {
    const {event: {data: [from, to, amount]}} = event;

    const {event: {data: [, fee]}} = event.extrinsic.events.find((event) => {
        return event.event.method == "Deposit" && event.event.section == "balances"
    })

    const elementFrom = new HistoryElement(eventId(event)+`-1`);
    elementFrom.address = from.toString()
    elementFrom.timestamp = event.block.timestamp.toISOString()
    elementFrom.transfer = {
        amount: amount.toString(),
        from: from.toString(),
        to: to.toString(),
        fee: (fee as Balance).toString()
    }
    await elementFrom.save();

    const elementTo = new HistoryElement(eventId(event)+`-2`);
    elementTo.address = to.toString()
    elementTo.timestamp = event.block.timestamp.toISOString()


    elementTo.transfer = {
        amount: amount.toString(),
        from: from.toString(),
        to: to.toString(),
        fee: (fee as Balance).toString()
    }
    await elementTo.save();
}
