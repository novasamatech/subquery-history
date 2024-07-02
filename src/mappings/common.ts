import { SubstrateBlock, SubstrateEvent, TypedEventRecord } from "@subql/types";
import { SubstrateExtrinsic } from "@subql/types";
import { Balance, EventRecord } from "@polkadot/types/interfaces";
import { CallBase } from "@polkadot/types/types/calls";
import { AnyTuple, Codec } from "@polkadot/types/types/codec";
import { Vec, GenericEventData } from "@polkadot/types";
import { INumber } from "@polkadot/types-codec/types/interfaces";
import { u8aToHex } from "@polkadot/util";

const batchCalls = ["batch", "batchAll", "forceBatch"];
const transferCalls = ["transfer", "transferKeepAlive"];
const ormlSections = ["currencies", "tokens"];

export function distinct<T>(array: Array<T>): Array<T> {
  return [...new Set(array)];
}

export function isBatch(call: CallBase<AnyTuple>): boolean {
  return call.section == "utility" && batchCalls.includes(call.method);
}

export function isProxy(call: CallBase<AnyTuple>): boolean {
  return call.section == "proxy" && call.method == "proxy";
}

export function isNativeTransfer(call: CallBase<AnyTuple>): boolean {
  return (
    (call.section == "balances" && transferCalls.includes(call.method)) ||
    (call.section == "currencies" && call.method == "transferNativeCurrency")
  );
}

export function isAssetTransfer(call: CallBase<AnyTuple>): boolean {
  return call.section == "assets" && transferCalls.includes(call.method);
}

export function isEquilibriumTransfer(call: CallBase<AnyTuple>): boolean {
  return call.section == "eqBalances" && transferCalls.includes(call.method);
}

export function isEvmTransaction(call: CallBase<AnyTuple>): boolean {
  return call.section === "ethereum" && call.method === "transact";
}

export function isEvmExecutedEvent(event: TypedEventRecord<Codec[]>): boolean {
  return (
    event.event.section === "ethereum" && event.event.method === "Executed"
  );
}

export function isAssetTxFeePaidEvent(event: SubstrateEvent): boolean {
  return (
    event.event.section === "assetTxPayment" &&
    event.event.method === "AssetTxFeePaid"
  );
}

export function isCurrencyDepositedEvent(event: SubstrateEvent): boolean {
  return (
    event.event.section === "currencies" && event.event.method === "Deposited"
  );
}

export function isSwapExecutedEvent(event: SubstrateEvent): boolean {
  return (
    event.event.section === "assetConversion" &&
    event.event.method === "SwapExecuted"
  );
}

export function isSwapExactTokensForTokens(call: CallBase<AnyTuple>): boolean {
  return (
    call.section === "assetConversion" &&
    call.method === "swapExactTokensForTokens"
  );
}

export function isSwapTokensForExactTokens(call: CallBase<AnyTuple>): boolean {
  return (
    call.section === "assetConversion" &&
    call.method === "swapTokensForExactTokens"
  );
}

export function isHydraOmnipoolBuy(call: CallBase<AnyTuple>): boolean {
  return call.section === "omnipool" && call.method == "buy";
}

export function isHydraOmnipoolSell(call: CallBase<AnyTuple>): boolean {
  return call.section === "omnipool" && call.method == "sell";
}

export function isHydraRouterBuy(call: CallBase<AnyTuple>): boolean {
  return call.section === "router" && call.method == "buy";
}

export function isHydraRouterSell(call: CallBase<AnyTuple>): boolean {
  return call.section === "router" && call.method == "sell";
}

export function isOrmlTransfer(call: CallBase<AnyTuple>): boolean {
  return (
    ormlSections.includes(call.section) && transferCalls.includes(call.method)
  );
}

export function isNativeTransferAll(call: CallBase<AnyTuple>): boolean {
  return call.section == "balances" && call.method === "transferAll";
}

export function isOrmlTransferAll(call: CallBase<AnyTuple>): boolean {
  return ormlSections.includes(call.section) && call.method === "transferAll";
}

export function callsFromBatch(
  batchCall: CallBase<AnyTuple>,
): CallBase<AnyTuple>[] {
  return batchCall.args[0] as Vec<CallBase<AnyTuple>>;
}

export function callFromProxy(
  proxyCall: CallBase<AnyTuple>,
): CallBase<AnyTuple> {
  return proxyCall.args[2] as CallBase<AnyTuple>;
}

export function eventIdWithAddress(
  event: SubstrateEvent,
  address: String,
): string {
  return `${eventId(event)}-${address}`;
}

export function eventId(event: SubstrateEvent): string {
  return `${blockNumber(event)}-${event.idx}`;
}

export function eventIdFromBlockAndIdx(blockNumber: string, eventIdx: string) {
  return `${blockNumber}-${eventIdx}`;
}

export function eventIdFromBlockAndIdxAndAddress(
  blockNumber: string,
  eventIdx: string,
  address: string,
) {
  return `${blockNumber}-${eventIdx}-${address}`;
}

export function extrinsicIdx(event: SubstrateEvent): string {
  let idx: string = event.extrinsic
    ? event.extrinsic.idx.toString()
    : event.idx.toString();
  return idx;
}

export function blockNumber(event: SubstrateEvent): number {
  return event.block.block.header.number.toNumber();
}

export function extrinsicIdFromBlockAndIdx(
  blockNumber: number,
  extrinsicIdx: number,
): string {
  return `${blockNumber.toString()}-${extrinsicIdx.toString()}`;
}

export function timestamp(block: SubstrateBlock): bigint {
  return BigInt(
    Math.round(block.timestamp ? block.timestamp.getTime() / 1000 : -1),
  );
}

export function calculateFeeAsString(
  extrinsic?: SubstrateExtrinsic,
  from: string = "",
): string {
  if (extrinsic) {
    const transactionPaymentFee =
      exportFeeFromTransactionFeePaidEvent(extrinsic);

    if (transactionPaymentFee != undefined) {
      return transactionPaymentFee.toString();
    }

    const withdrawFee = exportFeeFromBalancesWithdrawEvent(extrinsic, from);

    if (withdrawFee !== BigInt(0)) {
      if (isEvmTransaction(extrinsic.extrinsic.method)) {
        const feeRefund = exportFeeRefund(extrinsic, from);
        return feeRefund
          ? (withdrawFee - feeRefund).toString()
          : withdrawFee.toString();
      }
      return withdrawFee.toString();
    }

    let balancesFee = exportFeeFromBalancesDepositEvent(extrinsic);
    let treasureFee = exportFeeFromTreasureDepositEvent(extrinsic);

    let totalFee = balancesFee + treasureFee;
    return totalFee.toString();
  } else {
    return BigInt(0).toString();
  }
}

export function getEventData(event: SubstrateEvent): GenericEventData {
  return event.event.data as GenericEventData;
}

export function eventRecordToSubstrateEvent(
  eventRecord: EventRecord,
): SubstrateEvent {
  return eventRecord as unknown as SubstrateEvent;
}

export function BigIntFromCodec(eventRecord: Codec): bigint {
  return (eventRecord as unknown as INumber).toBigInt();
}

export function convertOrmlCurrencyIdToString(currencyId: Codec): string {
  // make sure first we have scale encoded bytes
  const bytes = currencyId.toU8a();

  return u8aToHex(bytes).toString();
}

function exportFeeRefund(
  extrinsic: SubstrateExtrinsic,
  from: string = "",
): bigint {
  const extrinsicSigner = from || extrinsic.extrinsic.signer.toString();

  const eventRecord = extrinsic.events.find(
    (event) =>
      event.event.method == "Deposit" &&
      event.event.section == "balances" &&
      event.event.data[0].toString() === extrinsicSigner,
  );

  if (eventRecord != undefined) {
    const {
      event: {
        data: [, fee],
      },
    } = eventRecord;

    return (fee as unknown as Balance).toBigInt();
  }

  return BigInt(0);
}

function exportFeeFromBalancesWithdrawEvent(
  extrinsic: SubstrateExtrinsic,
  from: string = "",
): bigint {
  const eventRecord = extrinsic.events.find(
    (event) =>
      event.event.method == "Withdraw" && event.event.section == "balances",
  );

  if (eventRecord !== undefined) {
    const {
      event: {
        data: [accountid, fee],
      },
    } = eventRecord;

    const extrinsicSigner = from || extrinsic.extrinsic.signer.toString();
    const withdrawAccountId = accountid.toString();
    return extrinsicSigner === withdrawAccountId
      ? (fee as unknown as Balance).toBigInt()
      : BigInt(0);
  }

  return BigInt(0);
}

function exportFeeFromTransactionFeePaidEvent(
  extrinsic: SubstrateExtrinsic,
  from: string = "",
): bigint | undefined {
  const eventRecord = extrinsic.events.find(
    (event) =>
      event.event.method == "TransactionFeePaid" &&
      event.event.section == "transactionPayment",
  );

  if (eventRecord !== undefined) {
    const {
      event: {
        data: [accountid, fee, tip],
      },
    } = eventRecord;

    const fullFee = (fee as Balance).toBigInt() + (tip as Balance).toBigInt();

    const extrinsicSigner = from || extrinsic.extrinsic.signer.toString();
    const withdrawAccountId = accountid.toString();
    return extrinsicSigner === withdrawAccountId ? fullFee : undefined;
  }

  return undefined;
}

function exportFeeFromBalancesDepositEvent(
  extrinsic: SubstrateExtrinsic,
): bigint {
  const eventRecord = extrinsic.events.find((event) => {
    return event.event.method == "Deposit" && event.event.section == "balances";
  });

  if (eventRecord != undefined) {
    const {
      event: {
        data: [, fee],
      },
    } = eventRecord;

    return (fee as unknown as Balance).toBigInt();
  }

  return BigInt(0);
}

function exportFeeFromTreasureDepositEvent(
  extrinsic: SubstrateExtrinsic,
): bigint {
  const eventRecord = extrinsic.events.find((event) => {
    return event.event.method == "Deposit" && event.event.section == "treasury";
  });

  if (eventRecord != undefined) {
    const {
      event: {
        data: [fee],
      },
    } = eventRecord;

    return (fee as unknown as Balance).toBigInt();
  } else {
    return BigInt(0);
  }
}

export function getAssetIdFromMultilocation(
  multilocation: any,
  safe = false,
): string | undefined {
  try {
    let junctions = multilocation.interior;

    if (junctions.isHere) {
      return "native";
    } else if (multilocation.parents != "0") {
      return multilocation.toHex();
    } else {
      return junctions.asX2[1].asGeneralIndex.toString();
    }
  } catch (e) {
    if (safe) {
      return undefined;
    } else {
      throw e;
    }
  }
}

export function getRewardData(event: SubstrateEvent): [Codec, Codec] {
  const {
    event: { data: innerData },
  } = event;
  let account: Codec, amount: Codec;
  if (innerData.length == 2) {
    [account, amount] = innerData;
  } else {
    [account, , amount] = innerData;
  }
  return [account, amount];
}

export function extractTransactionPaidFee(
  events: EventRecord[],
): string | undefined {
  const eventRecord = events.find(
    (event) =>
      event.event.method == "TransactionFeePaid" &&
      event.event.section == "transactionPayment",
  );

  if (eventRecord == undefined) return undefined;

  const {
    event: {
      data: [_, fee, tip],
    },
  } = eventRecord;

  const fullFee = (fee as Balance).toBigInt() + (tip as Balance).toBigInt();

  return fullFee.toString();
}
