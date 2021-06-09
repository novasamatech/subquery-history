import {HistoryElement} from '../types/models/HistoryElement';
import {SubstrateEvent} from "@subql/types";
import {eventId, exportFeeFromDepositEvent} from "./common";

export async function handleTransfer(event: SubstrateEvent): Promise<void> {
    const {event: {data: [from, to, amount]}} = event;

    let fee = exportFeeFromDepositEvent(event.extrinsic)

    const elementFrom = new HistoryElement(eventId(event)+`-1`);
    elementFrom.address = from.toString()
    elementFrom.timestamp = event.block.timestamp.toISOString()
    elementFrom.transfer = {
        amount: amount.toString(),
        from: from.toString(),
        to: to.toString(),
        fee: fee.toString()
    }
    await elementFrom.save();

    const elementTo = new HistoryElement(eventId(event)+`-2`);
    elementTo.address = to.toString()
    elementTo.timestamp = event.block.timestamp.toISOString()


    elementTo.transfer = {
        amount: amount.toString(),
        from: from.toString(),
        to: to.toString(),
        fee: fee.toString()
    }
    await elementTo.save();
}
