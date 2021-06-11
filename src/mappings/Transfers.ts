import {HistoryElement} from '../types';
import {SubstrateEvent} from "@subql/types";
import {blockNumber, eventId, exportFeeFromDepositEvent, extrinsicId} from "./common";

export async function handleTransfer(event: SubstrateEvent): Promise<void> {
    const {event: {data: [from, to, ]}} = event;

    const elementFrom = new HistoryElement(eventId(event)+`-from`);
    elementFrom.address = from.toString()
    await populateTransfer(elementFrom, event)

    const elementTo = new HistoryElement(eventId(event)+`-to`);
    elementTo.address = to.toString()
    await populateTransfer(elementTo, event)
}

export async function handleTransferKeepAlive(event: SubstrateEvent): Promise<void> {
    await handleTransfer(event)
}

async function populateTransfer(element: HistoryElement, event: SubstrateEvent): Promise<void> {
    element.timestamp = event.block.timestamp.toISOString()

    const {event: {data: [from, to, amount]}} = event;
    element.transfer = {
        amount: amount.toString(),
        from: from.toString(),
        to: to.toString(),
        block: blockNumber(event),
        fee: exportFeeFromDepositEvent(event.extrinsic).toString(),
        extrinsicId: extrinsicId(event)
    }
    await element.save();
}
