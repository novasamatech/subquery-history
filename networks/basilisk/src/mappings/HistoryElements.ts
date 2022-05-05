import {SubstrateExtrinsic} from '@subql/types';
import {AssetTransfer, HistoryElement, Transfer} from "../types";
import {
    callFromProxy,
    callsFromBatch,
    calculateFeeAsString,
    extrinsicIdFromBlockAndIdx,
    isBatch,
    isProxy,
    timestamp,
    isNativeTransfer,
    isAssetTransfer,
    isOrmlTransfer,
    isNativeTransferAll,
    isOrmlTransferAll,
    isEvmTransaction,
    isEvmExecutedEvent,
} from "./common";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";
import {u64} from "@polkadot/types";
import { ethereumEncode } from '@polkadot/util-crypto';

type TransferData = {
    isTransferAll: boolean,
    transfer: Transfer | AssetTransfer,
}

export async function handleHistoryElement(extrinsic: SubstrateExtrinsic): Promise<void> {
    const { isSigned } = extrinsic.extrinsic;

    if (isSigned) {
        let failedTransfers = findFailedTransferCalls(extrinsic)
        if (failedTransfers != null) {
            await saveFailedTransfers(failedTransfers, extrinsic)
        } else {
            await saveExtrinsic(extrinsic)
        }
    } else if (isEvmTransaction(extrinsic.extrinsic.method) && extrinsic.success) {
        await saveEvmExtrinsic(extrinsic)
    }
}

function createHistoryElement (extrinsic: SubstrateExtrinsic, address: string, suffix: string = '', hash?: string) {
    let extrinsicHash = hash || extrinsic.extrinsic.hash.toString();
    let blockNumber = extrinsic.block.block.header.number.toNumber();
    let extrinsicIdx = extrinsic.idx
    let extrinsicId = extrinsicIdFromBlockAndIdx(blockNumber, extrinsicIdx)
    let blockTimestamp = timestamp(extrinsic.block);

    const historyElement = new HistoryElement(`${extrinsicId}${suffix}`);
    historyElement.address = address
    historyElement.blockNumber = blockNumber
    historyElement.extrinsicHash = extrinsicHash
    historyElement.extrinsicIdx = extrinsicIdx
    historyElement.timestamp = blockTimestamp

    return historyElement
}

function addTransferToHistoryElement(element: HistoryElement, transfer: Transfer | AssetTransfer) {
    if ('assetId' in transfer) {
        element.assetTransfer = transfer
    } else {
        element.transfer = transfer
    }
}

async function saveFailedTransfers(transfers: Array<TransferData>, extrinsic: SubstrateExtrinsic): Promise<void> {
    let promises = transfers.map(({ isTransferAll, transfer }) => {
        const elementFrom = createHistoryElement(extrinsic, transfer.from, `-from`);
        addTransferToHistoryElement(elementFrom, transfer)

        // FIXME: Try to find more appropriate way to handle failed transferAll events
        if (!isTransferAll) {
            const elementTo = createHistoryElement(extrinsic, transfer.to, `-to`);
            addTransferToHistoryElement(elementTo, transfer)

            return [elementTo.save(), elementFrom.save()]
        }

        return [elementFrom.save()]
    })
    await Promise.allSettled(promises)
}

async function saveExtrinsic(extrinsic: SubstrateExtrinsic): Promise<void> {
    const element = createHistoryElement(extrinsic, extrinsic.extrinsic.signer.toString())

    element.extrinsic = {
        hash: extrinsic.extrinsic.hash.toString(),
        module: extrinsic.extrinsic.method.section,
        call: extrinsic.extrinsic.method.method,
        success: extrinsic.success,
        fee: calculateFeeAsString(extrinsic)
    }
    await element.save()
}

async function saveEvmExtrinsic(extrinsic: SubstrateExtrinsic): Promise<void> {
    const executedEvent = extrinsic.events.find(isEvmExecutedEvent)
    if (!executedEvent) {
        return
    }

    const addressFrom = ethereumEncode(executedEvent.event.data?.[0]?.toString());
    const hash = executedEvent.event.data?.[2]?.toString();
    const success = !!(executedEvent.event.data?.[3].toJSON() as any).succeed;

    const element = createHistoryElement(extrinsic, addressFrom, '', hash)

    element.extrinsic = {
        hash,
        module: extrinsic.extrinsic.method.section,
        call: extrinsic.extrinsic.method.method,
        success,
        fee: calculateFeeAsString(extrinsic, addressFrom)
    }

    await element.save()
}

/// Success Transfer emits Transfer event that is handled at Transfers.ts handleTransfer()
function findFailedTransferCalls(extrinsic: SubstrateExtrinsic): Array<TransferData> | null {
    if (extrinsic.success) {
        return null;
    }

    let transferCallsArgs = determineTransferCallsArgs(extrinsic.extrinsic.method)
    if (transferCallsArgs.length == 0) {
        return null;
    }

    let sender = extrinsic.extrinsic.signer
    return transferCallsArgs.map(([isTransferAll, address, amount, assetId]) => {
        const transfer: Transfer = {
            amount: amount.toString(),
            from: sender.toString(),
            to: address,
            fee: calculateFeeAsString(extrinsic),
            eventIdx: -1,
            success: false
        }

        if (assetId) {
            (transfer as AssetTransfer).assetId = assetId
        }

        return {
            isTransferAll,
            transfer,
        }
    })
}

function determineTransferCallsArgs(causeCall: CallBase<AnyTuple>) : [boolean, string, bigint, string?][] {
    if (isNativeTransfer(causeCall)) {
        return [[false, ...extractArgsFromTransfer(causeCall)]]
    } else if (isAssetTransfer(causeCall)) {
        return [[false, ...extractArgsFromAssetTransfer(causeCall)]]
    } else if (isOrmlTransfer(causeCall)) {
        return [[false, ...extractArgsFromOrmlTransfer(causeCall)]]
    } else if (isNativeTransferAll(causeCall)) {
        return [[true, ...extractArgsFromTransferAll(causeCall)]]
    } else if (isOrmlTransferAll(causeCall)) {
        return [[true, ...extractArgsFromOrmlTransferAll(causeCall)]]
    } else if (isBatch(causeCall)) {
        return callsFromBatch(causeCall)
            .map(call => {
                return determineTransferCallsArgs(call)
                    .map((value, index, array) => {
                        return value
                    })
            })
            .flat()
    } else if (isProxy(causeCall)) {
        let proxyCall = callFromProxy(causeCall)
        return determineTransferCallsArgs(proxyCall)
    } else {
        return []
    }
}

function extractArgsFromTransfer(call: CallBase<AnyTuple>): [string, bigint] {
    const [destinationAddress, amount] = call.args

    return [destinationAddress.toString(), (amount as u64).toBigInt()]
}

function extractArgsFromAssetTransfer(call: CallBase<AnyTuple>): [string, bigint, string] {
    const [assetId, destinationAddress, amount] = call.args

    return [
        destinationAddress.toString(),
        (amount as u64).toBigInt(),
        assetId.toString()
    ]
}

function extractArgsFromOrmlTransfer(call: CallBase<AnyTuple>): [string, bigint, string] {
    const [destinationAddress, currencyId, amount] = call.args

    return [
        destinationAddress.toString(),
        (amount as u64).toBigInt(),
        currencyId.toHex().toString()
    ]
}

function extractArgsFromTransferAll(call: CallBase<AnyTuple>): [string, bigint] {
    const [destinationAddress] = call.args

    return [destinationAddress.toString(), BigInt(0)]
}

function extractArgsFromOrmlTransferAll(call: CallBase<AnyTuple>): [string, bigint, string] {
    const [destinationAddress, currencyId] = call.args

    return [
        destinationAddress.toString(),
        BigInt(0),
        currencyId.toHex().toString()
    ]
}
