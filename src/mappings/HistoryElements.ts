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

function objectToAssetTransfer(
    id: string, 
    { assetId, amount, to, from, fee, eventIdx, success }
) {
    const assetTransfer = new AssetTransfer(id)

    assetTransfer.assetId = assetId;
    assetTransfer.amount = amount;
    assetTransfer.to = to;
    assetTransfer.from = from;
    assetTransfer.fee = fee;
    assetTransfer.eventIdx = eventIdx;
    assetTransfer.success = success;

    assetTransfer.save()

    return assetTransfer
}

async function saveFailedTransfers(transfers: Array<Transfer | AssetTransfer>, extrinsic: SubstrateExtrinsic): Promise<void> {
    let promises = transfers.map(transfer => {
        const elementFrom = createHistoryElement(extrinsic, transfer.from, `-from`);
        const elementTo = createHistoryElement(extrinsic, transfer.to, `-to`);

        if ('assetId' in transfer) {
            const assetTransferFrom = objectToAssetTransfer(elementFrom.id, transfer)
            elementFrom.assetTransferId = assetTransferFrom.id

            const assetTransferTo = objectToAssetTransfer(elementTo.id, transfer)
            elementTo.assetTransferId = assetTransferTo.id
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
function findFailedTransferCalls(extrinsic: SubstrateExtrinsic): Transfer[] | null {
    if (extrinsic.success) {
        return null;
    }

    let transferCallsArgs = determineTransferCallsArgs(extrinsic.extrinsic.method)
    if (transferCallsArgs.length == 0) {
        return null;
    }

    let sender = extrinsic.extrinsic.signer
    return transferCallsArgs.map(tuple => {
        let blockNumber = extrinsic.block.block.header.number.toNumber();
        return {
            extrinsicHash: extrinsic.extrinsic.hash.toString(),
            amount: tuple[1].toString(),
            assetId: tuple[2],
            from: sender.toString(),
            to: tuple[0],
            blockNumber: blockNumber,
            fee: calculateFeeAsString(extrinsic),
            eventIdx: -1,
            success: false
        }
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


