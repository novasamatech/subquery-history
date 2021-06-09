import {HistoryElement} from '../types/models/HistoryElement';
import {SubstrateEvent} from "@subql/types";

export async function handleTransfer(event: SubstrateEvent): Promise<void> {
    const {event: {data: [from, to, amount]}} = event;

    const element = new HistoryElement(event.block.block.header.number.toString() + event.idx);

    element.address = from.toString()
    element.timestamp = event.block.timestamp.toISOString()
    element.transfer = {
        amount: amount.toString(),
        from: from.toString(),
        to: to.toString()
    }

    await element.save();
}
