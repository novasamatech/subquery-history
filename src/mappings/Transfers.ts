import {HistoryElement} from '../types/models/HistoryElement';
import {SubstrateEvent} from "@subql/types";
import {eventId, exportFeeFromDepositEvent} from "./common";

export async function handleTransfer(event: SubstrateEvent): Promise<void> {
    const {event: {data: [from, to, ]}} = event;

    const elementFrom = new HistoryElement(eventId(event)+`-1`);
    elementFrom.address = from.toString()
    await populateTransfer(elementFrom, event)

    const elementTo = new HistoryElement(eventId(event)+`-2`);
    elementTo.address = to.toString()
    await populateTransfer(elementTo, event)
}

async function populateTransfer(element: HistoryElement, event: SubstrateEvent): Promise<void> {
    element.timestamp = event.block.timestamp.toISOString()

    const {event: {data: [from, to, amount]}} = event;
    element.transfer = {
        amount: amount.toString(),
        from: from.toString(),
        to: to.toString(),
        fee: exportFeeFromDepositEvent(event.extrinsic).toString()
    }
    await element.save();
}
