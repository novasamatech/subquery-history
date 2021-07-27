import { SubstrateExtrinsic } from '@subql/types';
import {HistoryElement, Transfer} from "../types";
import {
    blockNumber,
    eventIdFromBlockAndIdx,
    exportFeeFromDepositEvent,
    extrinsicId,
    isTransfer,
    timestamp
} from "./common";
import {Balance} from "@polkadot/types/interfaces";

export async function handleHistoryElement(extrinsic: SubstrateExtrinsic): Promise<void> {
    const { isSigned } = extrinsic.extrinsic;
    if (isSigned) {
        const element = new HistoryElement(extrinsic.extrinsic.hash.toString());
        element.address = extrinsic.extrinsic.signer.toString()
        element.timestamp = timestamp(extrinsic.block)

        let transfer = findTransferCall(extrinsic)
        if (transfer != undefined) {
            element.transfer = transfer
        } else {
            element.extrinsic = {
                hash: extrinsic.extrinsic.hash.toString(),
                module: extrinsic.extrinsic.method.section,
                call: extrinsic.extrinsic.method.method,
                success: extrinsic.success,
                fee: exportFeeFromDepositEvent(extrinsic)?.toString()
            }
        }

        await element.save()
    }
}

function findTransferCall(extrinsic: SubstrateExtrinsic): Transfer | null {
    if (!isTransfer(extrinsic.extrinsic.method)) {
        return null;
    }

    let args = extrinsic.extrinsic.args
    let destination = args[0]
    let amount = (args[1] as Balance).toBigInt()
    let sender = extrinsic.extrinsic.signer

    let blockNumber = extrinsic.block.block.header.number.toString()
    return {
        amount: amount.toString(),
        from: sender.toString(),
        to: destination.toString(),
        block: blockNumber,
        fee: exportFeeFromDepositEvent(extrinsic).toString(),
        extrinsicId: eventIdFromBlockAndIdx(blockNumber, extrinsic.idx.toString()),
        success: extrinsic.success
    }
}
