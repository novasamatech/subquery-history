import {SubstrateBlock, SubstrateEvent} from "@subql/types";
import {SubstrateExtrinsic} from "@subql/types";
import {Balance} from "@polkadot/types/interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";
import { Vec } from '@polkadot/types';
import {EraIndex} from "@polkadot/types/interfaces/staking"
import { StorageKey } from "@polkadot/types";
import { AccountId } from "@polkadot/types/interfaces";
import { Exposure } from "@polkadot/types/interfaces";

const batchCalls = ["batch", "batchAll"]
const transferCalls = ["transfer", "transferKeepAlive"]

export function distinct<T>(array: Array<T>): Array<T> {
    return [...new Set(array)];
}

export function isBatch(call: CallBase<AnyTuple>) : boolean {
    return call.section == "utility" && batchCalls.includes(call.method)
}

export function isProxy(call: CallBase<AnyTuple>) : boolean {
    return call.section == "proxy" && call.method == "proxy"
}

export function isTransfer(call: CallBase<AnyTuple>) : boolean {
    return call.section == "balances" && transferCalls.includes(call.method)
}

export function callsFromBatch(batchCall: CallBase<AnyTuple>) : CallBase<AnyTuple>[] {
    return batchCall.args[0] as Vec<CallBase<AnyTuple>>
}

export function callFromProxy(proxyCall: CallBase<AnyTuple>) : CallBase<AnyTuple> {
    return proxyCall.args[2] as CallBase<AnyTuple>
}

export function eventId(event: SubstrateEvent): string {
    return `${blockNumber(event)}-${event.idx}`
}

export function eventIdFromBlockAndIdx(blockNumber: string, eventIdx: string) {
    return `${blockNumber}-${eventIdx}`
}

export function extrinsicId(event: SubstrateEvent): string {
    let idx: string = event.extrinsic ? event.extrinsic.idx.toString() : event.idx.toString()
    return `${blockNumber(event)}-${idx}`
}

export function blockNumber(event: SubstrateEvent): string {
    return event.block.block.header.number.toString()
}

export function extrinsicIdFromBlockAndIdx(blockNumber: string, eventIdx: string) {
    return `${blockNumber}-${eventIdx}`
}

export function timestamp(block: SubstrateBlock): string {
    return Math.round((block.timestamp.getTime() / 1000)).toString()
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

export function exportFeeFromDepositEventAsString(extrinsic?: SubstrateExtrinsic): string {
    if (extrinsic) {
        let balancesFee = calculateBlockAuthorFee(extrinsic)
        let treasureFee = calculateTreasuryFee(extrinsic)

        let totalFee = balancesFee + treasureFee
        return totalFee.toString()
    } else {
        return BigInt(0).toString()
    }
}

function calculateBlockAuthorFee(extrinsic: SubstrateExtrinsic): bigint {
    const eventRecord = extrinsic.events.find((event) => {
        return event.event.method == "Deposit" && event.event.section == "balances"
    })

    if (eventRecord != undefined) {
        const {event: {data: [, fee]}}= eventRecord

        return (fee as Balance).toBigInt()
    } else  {
        return BigInt(0)
    }
}

function calculateTreasuryFee(extrinsic: SubstrateExtrinsic): bigint {
    const eventRecord = extrinsic.events.find((event) => {
        return event.event.method == "Deposit" && event.event.section == "treasury"
    })

    if (eventRecord != undefined) {
        const {event: {data: [fee]}}= eventRecord

        return (fee as Balance).toBigInt()
    } else  {
        return BigInt(0)
    }
}