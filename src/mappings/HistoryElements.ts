import { SubstrateExtrinsic } from '@subql/types';
import {HistoryElement} from "../types";
import {exportFeeFromDepositEvent, timestamp} from "./common";

export async function handleHistoryElement(extrinsic: SubstrateExtrinsic): Promise<void> {
    const { isSigned } = extrinsic.extrinsic;
    if (isSigned) {
        const element = new HistoryElement(extrinsic.extrinsic.hash.toString());
        element.address = extrinsic.extrinsic.signer.toString()
        element.timestamp = timestamp(extrinsic.block)

        element.extrinsic = {
            hash: extrinsic.extrinsic.hash.toString(),
            module: extrinsic.extrinsic.method.section,
            call: extrinsic.extrinsic.method.method,
            success: extrinsic.success,
            fee: exportFeeFromDepositEvent(extrinsic).toString()
        }

        await element.save()
    }
}
