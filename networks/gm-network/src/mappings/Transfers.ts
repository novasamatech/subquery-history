import { Codec } from "@polkadot/types/types";
import { HistoryElement } from "../types";
import { SubstrateEvent } from "@subql/types";
import {
  blockNumber,
  eventId,
  calculateFeeAsString,
  timestamp,
  getEventData,
  isEvmTransaction,
  isEvmExecutedEvent,
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
  event: SubstrateEvent
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
    assetId: currencyId.toHex().toString(),
  });
  await createTransfer({
    event,
    address: to,
    from,
    to,
    suffix: "-to",
    amount,
    assetId: currencyId.toHex().toString(),
  });
}

export async function handleTokenTransfer(
  event: SubstrateEvent
): Promise<void> {
  await handleOrmlTransfer(event);
}

export async function handleCurrencyTransfer(
  event: SubstrateEvent
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
  const element = new HistoryElement(`${eventId(event)}${suffix}`);
  element.address = address.toString();
  element.timestamp = timestamp(event.block);
  element.blockNumber = blockNumber(event);
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

  const transfer = {
    amount: amount.toString(),
    from: from.toString(),
    to: to.toString(),
    fee: calculateFeeAsString(event.extrinsic, from.toString()),
    eventIdx: event.idx,
    success: true,
  }

  if (assetId) {
    element.assetTransfer = {
      ...transfer,
      assetId: assetId,
    };
  } else {
    element.transfer = transfer
  }

  await element.save();
}
