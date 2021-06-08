import { SubstrateExtrinsic } from '@subql/types';
import {HistoryElement} from "../types";

export async function handleHistoryElement(extrinsic: SubstrateExtrinsic): Promise<void> {
    const { isSigned } = extrinsic.extrinsic;
    if (isSigned) {
        const element = new HistoryElement(extrinsic.extrinsic.hash.toString());
        element.address = extrinsic.extrinsic.signer.toString()
        element.timestamp = extrinsic.block.timestamp.toISOString()
        element.extrincis = {
            hash: extrinsic.extrinsic.hash.toString(),
            module: extrinsic.extrinsic.method.section,
            call: extrinsic.extrinsic.method.method,
            success: extrinsic.success
        }
        await element.save()
    }
}
