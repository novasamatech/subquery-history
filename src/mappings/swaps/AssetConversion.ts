import {SubstrateEvent} from "@subql/types";
import {
    BigIntFromCodec,
    calculateFeeAsString,
    eventId,
    eventRecordToSubstrateEvent, getAssetIdFromMultilocation,
    getEventData,
    isAssetTxFeePaidEvent,
    isSwapExecutedEvent
} from "../common";
import {HistoryElement} from "../../types";
import {createAssetTransmission} from "../Transfers";

export async function handleAssetConversionSwap(event: SubstrateEvent): Promise<void> {
    const [from, to, path, amountIn, amountOut] = getEventData(event);

    let element = await HistoryElement.get(`${eventId(event)}-from`)

    if (element !== undefined) {
        // already processed swap previously
        return;
    }

    let assetIdFee: string
    let fee: string
    let foundAssetTxFeePaid = event.block.events.find((e) => isAssetTxFeePaidEvent(eventRecordToSubstrateEvent(e)));
    let swaps = event.block.events.filter((e) => isSwapExecutedEvent(eventRecordToSubstrateEvent(e)));
    if (foundAssetTxFeePaid === undefined) {
        assetIdFee = "native"
        fee = calculateFeeAsString(event.extrinsic, from.toString())
    } else {
        const [who, actualFee, tip, rawAssetIdFee] = getEventData(eventRecordToSubstrateEvent(foundAssetTxFeePaid))
        assetIdFee = getAssetIdFromMultilocation(rawAssetIdFee)
        fee = actualFee.toString()

        let { event: { data: [feeFrom, feeTo, feePath, feeAmountIn, feeAmountOut] } } = swaps[0]

        swaps = swaps.slice(1)
        if (BigIntFromCodec(actualFee) != BigIntFromCodec(feeAmountIn)) {
            let { event: { data: [refundFrom, refundTo, refundPath, refundAmountIn, refundAmountOut] } } = swaps[swaps.length - 1]

            if (BigIntFromCodec(feeAmountIn) == BigIntFromCodec(actualFee) + BigIntFromCodec(refundAmountOut) &&
                getAssetIdFromMultilocation(feePath[0]) == getAssetIdFromMultilocation(refundPath[refundPath["length"] - 1])) {
                swaps = swaps.slice(swaps.length - 1)
                // TODO: if fee splitted, than we will process the same block two times
            }
        }
    }
    await Promise.all(swaps.map((e) => processAssetConversionSwap(eventRecordToSubstrateEvent(e), assetIdFee, fee)))
}

async function processAssetConversionSwap(event: SubstrateEvent, assetIdFee: string, fee: string): Promise<void> {
    const [from, to, path, amountIn, amountOut] = getEventData(event)

    const swap = {
        assetIdIn: getAssetIdFromMultilocation(path[0]),
        amountIn: amountIn.toString(),
        assetIdOut: getAssetIdFromMultilocation(path[path["length"] - 1]),
        amountOut: amountOut.toString(),
        sender: from.toString(),
        receiver: to.toString(),
        assetIdFee: assetIdFee,
        fee: fee,
        eventIdx: event.idx,
        success: true
    }

    await createAssetTransmission(event, from.toString(), "-from", {"swap": swap});
    if (from.toString() != to.toString()) {
        await createAssetTransmission(event, to.toString(), "-to", {"swap": swap});
    }
}