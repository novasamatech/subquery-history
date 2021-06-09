import {SubstrateEvent} from "@subql/types";
import {SubstrateExtrinsic} from "@subql/types";
import {Balance} from "@polkadot/types/interfaces";

export function eventId(event: SubstrateEvent): string {
    return `${event.block.block.header.number.toString()}-${event.idx}`
}

export function exportFeeFromDepositEvent(extrinsic: SubstrateExtrinsic): Balance {
    const {event: {data: [, fee]}} = extrinsic.events.find((event) => {
        return event.event.method == "Deposit" && event.event.section == "balances"
    })
    return  fee as Balance
}