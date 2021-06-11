import {SubstrateEvent} from "@subql/types";
import {SubstrateExtrinsic} from "@subql/types";
import {Balance} from "@polkadot/types/interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";
import { Vec } from '@polkadot/types';

const batchCalls = ["batch", "batch_all"]

export function distinct<T>(array: Array<T>): Array<T> {
    return [...new Set(array)];
}

export function isBatch(call: CallBase<AnyTuple>) : boolean {
    return call.section == "utility" && batchCalls.includes(call.method)
}

export function callsFromBatch(batchCall: CallBase<AnyTuple>) : CallBase<AnyTuple>[] {
    return batchCall.args[0] as Vec<CallBase<AnyTuple>>
}

export function eventId(event: SubstrateEvent): string {
    return extrinsicId(event)
}

export function extrinsicId(event: SubstrateEvent): string {
    return `${blockNumber(event)}-${event.extrinsic.idx.toString()}`
}

export function blockNumber(event: SubstrateEvent): string {
    return event.block.block.header.number.toString()
}

export function exportFeeFromDepositEvent(extrinsic: SubstrateExtrinsic): Balance | null {
    const eventRecord = extrinsic.events.find((event) => {
        return event.event.method == "Deposit" && event.event.section == "balances"
    })

    if (eventRecord != undefined) {
        const {event: {data: [, fee]}}= eventRecord

        return fee as Balance
    } else  {
        return null
    }
}