import {SubstrateBlock, SubstrateEvent} from "@subql/types";
import {SubstrateExtrinsic} from "@subql/types";
import {Balance} from "@polkadot/types/interfaces";

export function eventId(event: SubstrateEvent): string {
    return extrinsicId(event)
}

export function extrinsicId(event: SubstrateEvent): string {
    return `${blockNumber(event)}-${event.extrinsic.idx.toString()}`
}

export function blockNumber(event: SubstrateEvent): string {
    return event.block.block.header.number.toString()
}

export function timestamp(block: SubstrateBlock): string {
    return Math.round((block.timestamp.getTime() / 1000)).toString()
}

export function exportFeeFromDepositEvent(extrinsic: SubstrateExtrinsic): Balance {
    const {event: {data: [, fee]}} = extrinsic.events.find((event) => {
        return event.event.method == "Deposit" && event.event.section == "balances"
    })
    return  fee as Balance
}