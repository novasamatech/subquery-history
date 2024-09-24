import { SubstrateEvent, TypedEventRecord } from "@subql/types";
import {
  eventId,
  eventRecordToSubstrateEvent,
  extractTransactionPaidFee,
  isCurrencyDepositedEvent,
  convertOrmlCurrencyIdToString,
} from "../common";
import { HistoryElement } from "../../types";
import { createAssetTransmission } from "../Transfers";
import { AccountId32 } from "@polkadot/types/interfaces/runtime";
import { u128, u32 } from "@polkadot/types-codec";
import { EventRecord } from "@polkadot/types/interfaces";
import { Codec } from "@polkadot/types/types";
import { INumber } from "@polkadot/types-codec/types/interfaces";

type OmnipoolSwapArgs = [
  who: AccountId32,
  assetIn: u32,
  assetOut: u32,
  amountIn: u128,
  amountOut: u128,
  assetFeeAmount: u128,
  protocolFeeAmount: u128,
];

type RouterSwapArgs = [
  assetIn: u32,
  assetOut: u32,
  amountIn: u128,
  amountOut: u128,
];

export async function handleOmnipoolSwap(
  event: SubstrateEvent<OmnipoolSwapArgs>,
): Promise<void> {
  let element = await HistoryElement.get(`${eventId(event)}-from`);
  if (element !== undefined) {
    // already processed swap previously
    return;
  }
  if (event.extrinsic == undefined) {
    // TODO we dont yet process swap events that were initiated by the system and not by the user
    // Example: https://hydradx.subscan.io/block/4361343?tab=event&event=4361343-27
    return;
  }

  if (isPartOfRouterSwap(event.extrinsic.events)) {
    // TODO: we currently don't support swaps in batch
    return;
  }

  const fee = findHydraDxFeeTyped(event.extrinsic.events);
  const [who, assetIn, assetOut, amountIn, amountOut] = event.event.data;

  const swap = {
    assetIdIn: convertHydraDxTokenIdToString(assetIn),
    amountIn: amountIn.toString(),
    assetIdOut: convertHydraDxTokenIdToString(assetOut),
    amountOut: amountOut.toString(),
    sender: who.toString(),
    receiver: who.toString(),
    assetIdFee: fee.tokenId,
    fee: fee.amount,
    eventIdx: event.idx,
    success: true,
  };

  const blockNumber = event.block.block.header.number;
  logger.info(
    `Constructed omnipool swap ${JSON.stringify(
      swap,
    )} for block ${blockNumber.toString()}`,
  );

  await createAssetTransmission(event, who.toString(), "-from", { swap: swap });
}

export async function handleHydraRouterSwap(
  event: SubstrateEvent<RouterSwapArgs>,
): Promise<void> {
  let element = await HistoryElement.get(`${eventId(event)}-from`);
  if (element !== undefined) {
    return;
  }
  if (event.extrinsic == undefined) {
    return;
  }

  const who = event.extrinsic.extrinsic.signer.toString();
  const fee = findHydraDxFeeTyped(event.extrinsic.events);
  const [assetIn, assetOut, amountIn, amountOut] = event.event.data;

  const swap = {
    assetIdIn: convertHydraDxTokenIdToString(assetIn),
    amountIn: amountIn.toString(),
    assetIdOut: convertHydraDxTokenIdToString(assetOut),
    amountOut: amountOut.toString(),
    sender: who.toString(),
    receiver: who.toString(),
    assetIdFee: fee.tokenId,
    fee: fee.amount,
    eventIdx: event.idx,
    success: true,
  };

  const blockNumber = event.block.block.header.number;
  logger.info(
    `Constructed router swap ${JSON.stringify(
      swap,
    )} for block ${blockNumber.toString()}`,
  );

  await createAssetTransmission(event, who.toString(), "-from", { swap: swap });
}

export type Fee = {
  tokenId: string;
  amount: string;
};

export function findHydraDxFeeTyped(events: TypedEventRecord<Codec[]>[]): Fee {
  return findHydraDxFee(events as EventRecord[]);
}

export function findHydraDxFee(events: EventRecord[]): Fee {
  const lastCurrenciesDepositEvent = findLastEvent(events, (event) =>
    isCurrencyDepositedEvent(eventRecordToSubstrateEvent(event)),
  );

  if (lastCurrenciesDepositEvent == undefined) return findNativeFee(events);

  const {
    event: {
      data: [currencyId, _, amount],
    },
  } = lastCurrenciesDepositEvent;

  return {
    tokenId: convertHydraDxTokenIdToString(currencyId),
    amount: (amount as INumber).toString(),
  };
}

function isPartOfRouterSwap(events: TypedEventRecord<Codec[]>[]): boolean {
  const eventRecords = events as EventRecord[];
  for (const eventRecord of eventRecords) {
    if (
      eventRecord.event.section == "router" &&
      (eventRecord.event.method == "Executed" ||
        eventRecord.event.method == "RouteExecuted")
    ) {
      return true;
    }
  }

  return false;
}

function findNativeFee(events: EventRecord[]): Fee {
  let foundAssetTxFeePaid = extractTransactionPaidFee(events);
  if (foundAssetTxFeePaid == undefined) foundAssetTxFeePaid = "0";

  return {
    tokenId: "native",
    amount: foundAssetTxFeePaid,
  };
}

export function convertHydraDxTokenIdToString(hydraDxTokenId: Codec): string {
  const asString = hydraDxTokenId.toString();

  if (asString == "0") {
    return "native";
  } else {
    return convertOrmlCurrencyIdToString(hydraDxTokenId);
  }
}

function findLastEvent(
  events: EventRecord[],
  expression: (event: EventRecord) => boolean,
): EventRecord | undefined {
  const currenciesDepositedEvents = events.filter(expression);

  if (currenciesDepositedEvents.length == 0) {
    return undefined;
  }

  return currenciesDepositedEvents[currenciesDepositedEvents.length - 1];
}
