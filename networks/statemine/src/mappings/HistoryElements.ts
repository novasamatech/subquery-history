import {SubstrateExtrinsic} from '@subql/types';
import {AssetTransfer, HistoryElement, Transfer} from "../types";
import {
    callFromProxy, callsFromBatch,
    calculateFeeAsString,
    extrinsicIdFromBlockAndIdx, isBatch, isProxy,
    isTransfer,
    timestamp,
    isAssetTransfer,
    isOrmlTransfer
} from "./common";
import {CallBase} from "@polkadot/types/types/calls";
import {AnyTuple} from "@polkadot/types/types/codec";
import {u64} from "@polkadot/types";

export async function handleHistoryElement(extrinsic: SubstrateExtrinsic): Promise<void> {
    const { isSigned } = extrinsic.extrinsic;
    if (isSigned) {
        let failedTransfers = findFailedTransferCalls(extrinsic)
        if (failedTransfers != null) {
            await saveFailedTransfers(failedTransfers, extrinsic)
        } else {
            await saveExtrinsic(extrinsic)
        }
    }
}

function createHistoryElement (extrinsic: SubstrateExtrinsic, address: string, suffix: string = '') {
    let extrinsicHash = extrinsic.extrinsic.hash.toString();
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

async function saveFailedTransfers(transfers: Array<Transfer | AssetTransfer>, extrinsic: SubstrateExtrinsic): Promise<void> {
    let promises = transfers.map(transfer => {
        const elementFrom = createHistoryElement(extrinsic, transfer.from, `-from`);
        const elementTo = createHistoryElement(extrinsic, transfer.to, `-to`);

        if ('assetId' in transfer) {
            elementFrom.assetTransfer = transfer
            elementTo.assetTransfer = transfer
        } else {
            elementFrom.transfer = transfer
            elementTo.transfer = transfer
        }

        return [elementTo.save(), elementFrom.save()]
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

/// Success Transfer emits Transfer event that is handled at Transfers.ts handleTransfer()
function findFailedTransferCalls(extrinsic: SubstrateExtrinsic): Array<Transfer | AssetTransfer> | null {
    if (extrinsic.success) {
        return null;
    }

    let transferCallsArgs = determineTransferCallsArgs(extrinsic.extrinsic.method)
    if (transferCallsArgs.length == 0) {
        return null;
    }

    let sender = extrinsic.extrinsic.signer
    return transferCallsArgs.map(([address, amount, assetId]) => {
        const transfer: Transfer =  {
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

        return transfer;
    })
}

function determineTransferCallsArgs(causeCall: CallBase<AnyTuple>) : [string, bigint, string?][] {
    if (isTransfer(causeCall)) {
        return [extractArgsFromTransfer(causeCall)]
    } else if (isAssetTransfer(causeCall)) {
        return [extractArgsFromAssetTransfer(causeCall)]
    } else if (isOrmlTransfer(causeCall)) {
        return [extractArgsFromOrmlTransfer(causeCall)]
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


