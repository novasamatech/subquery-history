import {SubstrateBlock, SubstrateEvent} from "@subql/types";
import {SubstrateExtrinsic} from "@subql/types";
import {Balance} from "@polkadot/types/interfaces";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";
import { Vec, GenericEventData } from '@polkadot/types';

const batchCalls = ["batch", "batchAll"]
const transferCalls = ["transfer", "transferKeepAlive"]
const ormlSections = ["currencies", "tokens"]

export function distinct<T>(array: Array<T>): Array<T> {
    return [...new Set(array)];
}

export function isBatch(call: CallBase<AnyTuple>) : boolean {
    return call.section == "utility" && batchCalls.includes(call.method)
}

export function isProxy(call: CallBase<AnyTuple>) : boolean {
    return call.section == "proxy" && call.method == "proxy"
}

export function isNativeTransfer(call: CallBase<AnyTuple>) : boolean {
    return (
        (call.section == "balances" && transferCalls.includes(call.method)) ||
        (call.section == "currencies" && call.method == "transferNativeCurrency")
    )
}

export function isAssetTransfer(call: CallBase<AnyTuple>) : boolean {
    return call.section == "assets" && transferCalls.includes(call.method)
}

export function isEvmTransaction(call: CallBase<AnyTuple>): boolean {
    return call.section === "ethereum" && call.method === "transact"
}

export function isEvmExecutedEvent(event: SubstrateEvent): boolean {
    return event.event.section === 'ethereum' && event.event.method === "Executed"
}

export function isOrmlTransfer(call: CallBase<AnyTuple>) : boolean {
    return ormlSections.includes(call.section) && transferCalls.includes(call.method)
}

export function isNativeTransferAll(call: CallBase<AnyTuple>) : boolean {
    return call.section == "balances" && call.method === "transferAll"
}

export function isOrmlTransferAll(call: CallBase<AnyTuple>) : boolean {
    return ormlSections.includes(call.section) && call.method === "transferAll"
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

export function extrinsicIdx(event: SubstrateEvent): string {
    let idx: string = event.extrinsic ? event.extrinsic.idx.toString() : event.idx.toString()
    return idx
}

export function blockNumber(event: SubstrateEvent): number {
    return event.block.block.header.number.toNumber()
}

export function extrinsicIdFromBlockAndIdx(blockNumber: number, extrinsicIdx: number): string {
    return `${blockNumber.toString()}-${extrinsicIdx.toString()}`
}

export function timestamp(block: SubstrateBlock): bigint {
    return BigInt(Math.round(block.timestamp ? block.timestamp.getTime() / 1000 : -1))
}

export function calculateFeeAsString(extrinsic?: SubstrateExtrinsic, from: string = ''): string {
    if (extrinsic) {
        const withdrawFee = exportFeeFromBalancesWithdrawEvent(extrinsic, from)

        if (withdrawFee !== BigInt(0)) {
            if (isEvmTransaction(extrinsic.extrinsic.method)){
                const feeRefund = exportFeeRefund(extrinsic, from)
                return feeRefund ? (withdrawFee - feeRefund).toString() : withdrawFee.toString();
            }
            return withdrawFee.toString()
        }

        let balancesFee = exportFeeFromBalancesDepositEvent(extrinsic)
        let treasureFee = exportFeeFromTreasureDepositEvent(extrinsic)

        let totalFee = balancesFee + treasureFee
        return totalFee.toString()
    } else {
        return BigInt(0).toString()
    }
}

export function getEventData(event: SubstrateEvent): GenericEventData {
    return event.event.data
}

function exportFeeRefund(extrinsic: SubstrateExtrinsic, from: string = ''): bigint {
    const extrinsicSigner = from || extrinsic.extrinsic.signer.toString()

    const eventRecord = extrinsic.events.find((event) => 
        event.event.method == "Deposit" &&
        event.event.section == "balances" &&
        event.event.data[0].toString() === extrinsicSigner
    )

    if (eventRecord != undefined) {
        const {event: {data: [, fee]}}= eventRecord

        return (fee as Balance).toBigInt()
    }

    return BigInt(0)
}

function exportFeeFromBalancesWithdrawEvent(extrinsic: SubstrateExtrinsic, from: string = ''): bigint {
    const eventRecord = extrinsic.events.find((event) =>
        event.event.method == "Withdraw" && event.event.section == "balances"
    )
    
    if (eventRecord !== undefined) {
        const {
            event: {
                data: [ accountid, fee ]
            }
        } = eventRecord

        const extrinsicSigner = from || extrinsic.extrinsic.signer.toString()
        const withdrawAccountId = accountid.toString()
        
        return extrinsicSigner === withdrawAccountId ? (fee as Balance).toBigInt() :  BigInt(0)
    }

    return BigInt(0)
}

function exportFeeFromBalancesDepositEvent(extrinsic: SubstrateExtrinsic): bigint {
    const eventRecord = extrinsic.events.find((event) => {
        return event.event.method == "Deposit" && event.event.section == "balances"
    })

    if (eventRecord != undefined) {
        const {event: {data: [, fee]}}= eventRecord

        return (fee as Balance).toBigInt()
    }

    return BigInt(0)
}

function exportFeeFromTreasureDepositEvent(extrinsic: SubstrateExtrinsic): bigint {
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
