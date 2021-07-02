import {SubstrateEvent} from "@subql/types";
import {Bonded, HistoryElement} from "../types";
import {eventId, timestamp} from "./common";
import {Balance} from "@polkadot/types/interfaces";

export async function handleBonded(event: SubstrateEvent): Promise<void> {
    const {event: {data: [stash, amount]}} = event;

    const element = new Bonded(eventId(event));
    element.timestamp = timestamp(event.extrinsic.block)
    element.stash = stash.toString()
    element.amount = (amount as Balance).toString()

    await element.save()
}
