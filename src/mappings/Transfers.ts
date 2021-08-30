import {HistoryElement} from '../types';
import {SubstrateEvent} from "@subql/types";
import {blockNumber, eventId, exportFeeFromDepositEventAsString, extrinsicIdx, timestamp} from "./common";

export async function handleTransfer(event: SubstrateEvent): Promise<void> {
    const {event: {data: [from, to, ]}} = event;

    let _blockNumber = blockNumber(event)
    const elementFrom = new HistoryElement(eventId(event)+`-from`);
    elementFrom.address = from.toString()
    elementFrom.blockNumber = _blockNumber;
    if (event.extrinsic !== undefined) {
        elementFrom.extrinsicHash = event.extrinsic.extrinsic.hash.toString();
        elementFrom.extrinsicIdx = event.extrinsic.idx;
    }
    await populateTransfer(elementFrom, event)

    const elementTo = new HistoryElement(eventId(event)+`-to`);
    elementTo.address = to.toString()
    elementTo.blockNumber = _blockNumber;
    if (event.extrinsic !== undefined) {
        elementTo.extrinsicHash = event.extrinsic.extrinsic.hash.toString();
        elementTo.extrinsicIdx = event.extrinsic.idx;
    }
    await populateTransfer(elementTo, event)
}

export async function handleTransferKeepAlive(event: SubstrateEvent): Promise<void> {
    await handleTransfer(event)
}

async function populateTransfer(element: HistoryElement, event: SubstrateEvent): Promise<void> {
    element.timestamp = timestamp(event.block)

    const {event: {data: [from, to, amount]}} = event;
    element.transfer = {
        amount: amount.toString(),
        from: from.toString(),
        to: to.toString(),
        blockNumber: blockNumber(event),
        fee: exportFeeFromDepositEventAsString(event.extrinsic),
        extrinsicId: extrinsicIdx(event),
        eventIdx: event.idx,
        success: true
    }
    await element.save();
}
