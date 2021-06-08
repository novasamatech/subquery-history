import { SubstrateExtrinsic } from '@subql/types';
import {HistoryElement} from "../types";
import {Balance} from '@polkadot/types/interfaces';

export async function handleHistoryElement(extrinsic: SubstrateExtrinsic): Promise<void> {
    const { isSigned } = extrinsic.extrinsic;
    if (isSigned) {
        const element = new HistoryElement(extrinsic.extrinsic.hash.toString());
        element.address = extrinsic.extrinsic.signer.toString()
        element.timestamp = extrinsic.block.timestamp.toISOString()

        const {event: {data: [, fee]}} = extrinsic.events.find((event) => {
            return event.event.method == "Deposit" && event.event.section == "balances"
        })

        element.extrincis = {
            hash: extrinsic.extrinsic.hash.toString(),
            module: extrinsic.extrinsic.method.section,
            call: extrinsic.extrinsic.method.method,
            success: extrinsic.success,
            fee: (fee as Balance).toString()
        }

        await element.save()
    }
}
