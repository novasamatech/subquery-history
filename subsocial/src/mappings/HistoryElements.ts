import {SubstrateExtrinsic} from '@subql/types';
import {HistoryElement, Transfer} from "../types";
import {
    callFromProxy, callsFromBatch,
    calculateFeeAsString,
    extrinsicIdFromBlockAndIdx, isBatch, isProxy,
    isTransfer,
    timestamp
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

async function saveFailedTransfers(transfers: Transfer[], extrinsic: SubstrateExtrinsic): Promise<void> {
    let promises = transfers.map(transfer => {
        let extrinsicHash = extrinsic.extrinsic.hash.toString();
        let blockNumber = extrinsic.block.block.header.number.toNumber();
        let extrinsicIdx = extrinsic.idx
        let extrinsicId = extrinsicIdFromBlockAndIdx(blockNumber, extrinsicIdx)
        let blockTimestamp = timestamp(extrinsic.block);

        const elementFrom = new HistoryElement(extrinsicId+`-from`);
        elementFrom.address = transfer.from
        elementFrom.blockNumber = blockNumber
        elementFrom.extrinsicHash = extrinsicHash
        elementFrom.extrinsicIdx = extrinsicIdx
        elementFrom.timestamp = blockTimestamp
        elementFrom.transfer = transfer

        const elementTo = new HistoryElement(extrinsicId+`-to`);
        elementTo.address = transfer.to
        elementTo.blockNumber = blockNumber
        elementTo.extrinsicHash = extrinsicHash
        elementTo.extrinsicIdx = extrinsicIdx
        elementTo.timestamp = blockTimestamp
        elementTo.transfer = transfer

        return [elementTo.save(), elementFrom.save()]
    })
    await Promise.allSettled(promises)
}

async function saveExtrinsic(extrinsic: SubstrateExtrinsic): Promise<void> {
    let blockNumber = extrinsic.block.block.header.number.toNumber();
    let extrinsicIdx = extrinsic.idx
    let extrinsicId = extrinsicIdFromBlockAndIdx(blockNumber, extrinsicIdx)

    const element = new HistoryElement(extrinsicId);
    element.address = extrinsic.extrinsic.signer.toString()
    element.blockNumber = blockNumber
    element.extrinsicHash = extrinsic.extrinsic.hash.toString()
    element.extrinsicIdx = extrinsicIdx
    element.timestamp = timestamp(extrinsic.block)
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
            from: sender.toString(),
            to: tuple[0],
            blockNumber: blockNumber,
            fee: calculateFeeAsString(extrinsic),
            eventIdx: -1,
            success: false
        }
    })
}

function determineTransferCallsArgs(causeCall: CallBase<AnyTuple>) : [string, bigint][] {
    if (isTransfer(causeCall)) {
        return [extractArgsFromTransfer(causeCall)]
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
