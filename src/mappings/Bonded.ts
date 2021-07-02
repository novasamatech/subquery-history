import {SubstrateEvent} from "@subql/types";
import {HistoryElement} from "../types";
import {eventId, timestamp} from "./common";
import {Balance} from "@polkadot/types/interfaces";

export async function handleBonded(event: SubstrateEvent): Promise<void> {
    const {event: {data: [stash, amount]}} = event;

    const element = new HistoryElement(eventId(event));
    element.address = event.extrinsic.extrinsic.signer.toString()
    element.timestamp = timestamp(event.extrinsic.block)
    element.bonded = {
        stash: stash.toString(),
        amount: (amount as Balance).toString()
    }
    await element.save()
}
