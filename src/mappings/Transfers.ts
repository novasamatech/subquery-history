import { Codec } from "@polkadot/types/types";
import { HistoryElement } from "../types";
import { HistoryElementProps } from "../types/models/HistoryElement";
import { SubstrateEvent } from "@subql/types";
import {
  blockNumber,
  eventId,
  calculateFeeAsString,
  timestamp,
  getEventData,
  isEvmTransaction,
  isEvmExecutedEvent,
  isAssetTxFeePaidEvent,
  isSwapExecutedEvent,
  eventRecordToSubstrateEvent,
  getAssetIdFromMultilocation,
  BigIntFromCodec,
  convertOrmlCurrencyIdToString,
} from "./common";

type TransferPayload = {
  event: SubstrateEvent;
  address: Codec;
  from: Codec;
  to: Codec;
  amount: Codec;
  suffix: string;
  assetId?: string;
};

export async function handleSwap(event: SubstrateEvent): Promise<void> {
  const [from, to, path, amountIn, amountOut] = getEventData(event);

  let element = await HistoryElement.get(`${eventId(event)}-from`);

  if (element !== undefined) {
    // already processed swap previously
    return;
  }

  let assetIdFee: string;
  let fee: string;
  let foundAssetTxFeePaid = event.block.events.find((e) =>
    isAssetTxFeePaidEvent(eventRecordToSubstrateEvent(e)),
  );
  let swaps = event.block.events.filter((e) =>
    isSwapExecutedEvent(eventRecordToSubstrateEvent(e)),
  );
  if (foundAssetTxFeePaid === undefined) {
    assetIdFee = "native";
    fee = calculateFeeAsString(event.extrinsic, from.toString());
  } else {
    const [who, actualFee, tip, rawAssetIdFee] = getEventData(
      eventRecordToSubstrateEvent(foundAssetTxFeePaid),
    );
    assetIdFee = getAssetIdFromMultilocation(rawAssetIdFee);
    fee = actualFee.toString();

    let {
      event: {
        data: [feeFrom, feeTo, feePath, feeAmountIn, feeAmountOut],
      },
    } = swaps[0];

    swaps = swaps.slice(1);
    if (BigIntFromCodec(actualFee) != BigIntFromCodec(feeAmountIn)) {
      let {
        event: {
          data: [
            refundFrom,
            refundTo,
            refundPath,
            refundAmountIn,
            refundAmountOut,
          ],
        },
      } = swaps[swaps.length - 1];

      if (
        BigIntFromCodec(feeAmountIn) ==
          BigIntFromCodec(actualFee) + BigIntFromCodec(refundAmountOut) &&
        getAssetIdFromMultilocation((feePath as any)[0]) ==
          getAssetIdFromMultilocation(
            (refundPath as any)[(refundPath as any)["length"] - 1],
          )
      ) {
        swaps = swaps.slice(swaps.length - 1);
        // TODO: if fee splitted, than we will process the same block two times
      }
    }
  }

  for (const swap of swaps) {
    await processSwap(eventRecordToSubstrateEvent(swap), assetIdFee, fee);
  }
}

async function processSwap(
  event: SubstrateEvent,
  assetIdFee: string,
  fee: string,
): Promise<void> {
  const [from, to, path, amountIn, amountOut] = getEventData(event);

  const swap = {
    assetIdIn: getAssetIdFromMultilocation((path as any)[0]),
    amountIn: amountIn.toString(),
    assetIdOut: getAssetIdFromMultilocation(
      (path as any)[(path as any)["length"] - 1],
    ),
    amountOut: amountOut.toString(),
    sender: from.toString(),
    receiver: to.toString(),
    assetIdFee: assetIdFee,
    fee: fee,
    eventIdx: event.idx,
    success: true,
  };

  await createAssetTransmission(event, from.toString(), "-from", {
    swap: swap,
  });
  if (from.toString() != to.toString()) {
    await createAssetTransmission(event, to.toString(), "-to", { swap: swap });
  }
}

export async function handleTransfer(event: SubstrateEvent): Promise<void> {
  const [from, to, amount] = getEventData(event);

  await createTransfer({
    event,
    address: from,
    from,
    to,
    suffix: "-from",
    amount,
  });
  await createTransfer({ event, address: to, from, to, suffix: "-to", amount });
}

export async function handleAssetTransfer(
  event: SubstrateEvent,
): Promise<void> {
  const [assetId, from, to, amount] = getEventData(event);

  await createTransfer({
    event,
    address: from,
    from,
    to,
    suffix: "-from",
    amount,
    assetId: assetId.toString(),
  });
  await createTransfer({
    event,
    address: to,
    from,
    to,
    suffix: "-to",
    amount,
    assetId: assetId.toString(),
  });
}

export async function handleOrmlTransfer(event: SubstrateEvent): Promise<void> {
  const [currencyId, from, to, amount] = getEventData(event);

  await createTransfer({
    event,
    address: from,
    from,
    to,
    suffix: "-from",
    amount,
    assetId: convertOrmlCurrencyIdToString(currencyId),
  });
  await createTransfer({
    event,
    address: to,
    from,
    to,
    suffix: "-to",
    amount,
    assetId: convertOrmlCurrencyIdToString(currencyId),
  });
}

export async function handleEquilibriumTransfer(
  event: SubstrateEvent,
): Promise<void> {
  const [from, to, assetId, amount] = getEventData(event);

  await createTransfer({
    event,
    address: from,
    from,
    to,
    suffix: "-from",
    amount,
    assetId: assetId.toString(),
  });
  await createTransfer({
    event,
    address: to,
    from,
    to,
    suffix: "-to",
    amount,
    assetId: assetId.toString(),
  });
}

export async function handleTokenTransfer(
  event: SubstrateEvent,
): Promise<void> {
  await handleOrmlTransfer(event);
}

export async function handleCurrencyTransfer(
  event: SubstrateEvent,
): Promise<void> {
  await handleOrmlTransfer(event);
}

async function createTransfer({
  event,
  address,
  suffix,
  from,
  to,
  amount,
  assetId = null,
}: TransferPayload) {
  const transfer = {
    amount: amount.toString(),
    from: from.toString(),
    to: to.toString(),
    fee: calculateFeeAsString(event.extrinsic, from.toString()),
    eventIdx: event.idx,
    success: true,
  };

  let data;
  if (assetId) {
    data = {
      assetTransfer: {
        ...transfer,
        assetId: assetId,
      },
    };
  } else {
    data = {
      transfer: transfer,
    };
  }

  await createAssetTransmission(event, address, suffix, data);
}

export async function createAssetTransmission(
  event: SubstrateEvent,
  address: any,
  suffix: string,
  data: Partial<HistoryElementProps>,
) {
  const element = new HistoryElement(
    `${eventId(event)}${suffix}`,
    blockNumber(event),
    timestamp(event.block),
    address.toString(),
  );
  if (event.extrinsic !== undefined) {
    if (isEvmTransaction(event.extrinsic.extrinsic.method)) {
      const executedEvent = event.extrinsic.events.find(isEvmExecutedEvent);
      element.extrinsicHash =
        executedEvent?.event.data?.[2]?.toString() ||
        event.extrinsic.extrinsic.hash.toString();
    } else {
      element.extrinsicHash = event.extrinsic.extrinsic.hash.toString();
    }

    element.extrinsicIdx = event.extrinsic.idx;
  }

  for (var key in data) {
    (element[key as keyof HistoryElementProps] as any) =
      data[key as keyof HistoryElementProps];
  }

  await element.save();
}
