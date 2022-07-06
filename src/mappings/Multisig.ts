import {SubstrateEvent} from "@subql/types";
import {Multisig} from "../types";
import {eventId} from "./common";

export async function handleCreateMultisig(event: SubstrateEvent): Promise<void> {
  logger.info(`multisig created ${event}`);
  const {event: {data: [createdBy, multisigAccount, callHash]}} = event;
  logger.info(`data ${createdBy}, ${multisigAccount}, ${callHash}`);
  let multisig: Multisig = new Multisig(callHash.toString());
  multisig.createdBy = createdBy.toString();
  multisig.signedBy = [multisig.createdBy];
  multisig.multisigAccount = multisigAccount.toString();
  multisig.status = "pending";

  await multisig.save();
}

export async function handleApproveMultisig(event: SubstrateEvent): Promise<void> {
  logger.info(`multisig approved ${event}`);
  const {event: {data: [approvedBy, , , callHash]}} = event;
  let multisig = await Multisig.get(callHash.toString());
  if (!multisig) {
    logger.error(`Multisig with call hash=${callHash} not found`);
    return;
  }
  multisig.signedBy.push(approvedBy.toString());
  await multisig.save();
}

export async function handleExecuteMultisig(event: SubstrateEvent): Promise<void> {
  logger.info(`multisig executed ${event}`);
  const {event: {data: [approvedBy, , , callHash]}} = event;
  let multisig = await Multisig.get(callHash.toString());
  if (!multisig) {
    logger.error(`Multisig with call hash=${callHash} not found`);
    return;
  }
  multisig.signedBy.push(approvedBy.toString());
  multisig.status = "Executed";
  await multisig.save();
}

export async function handleCancelMultisig(event: SubstrateEvent): Promise<void> {
  logger.info(`multisig cancelled ${event}`);
  const {event: {data: [cancelledBy, , , callHash]}} = event;
  let multisig = await Multisig.get(callHash.toString());
  if (!multisig) {
    logger.error(`Multisig with call hash=${callHash} not found`);
    return;
  }
  multisig.cancelledBy = cancelledBy.toString();
  multisig.status = "Cancelled";

  await multisig.save();
}
