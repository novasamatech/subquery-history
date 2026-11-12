import { decodeAddress } from "@polkadot/util-crypto";
import { SubstrateBlock } from "@subql/types";

export function isValidAccountAddress(address: string): boolean {
  // AccountId32 hex is the longest supported representation (SS58 is shorter).
  // Bound the input before decoding: MultiAddress::Raw may contain an entire proof.
  if (!address || address.length > 66) return false;
  if (
    address.startsWith("0x") &&
    !/^0x(?:[0-9a-fA-F]{40}|[0-9a-fA-F]{64})$/.test(address)
  ) {
    return false;
  }

  try {
    // No SS58 prefix restriction; decodeAddress also checks its checksum.
    // Hex decoding alone is insufficient: it accepts arbitrary byte lengths.
    const decoded = decodeAddress(address);
    return decoded.length === 20 || decoded.length === 32;
  } catch {
    return false;
  }
}

export function shouldIndexAddress(
  address: string,
  block: SubstrateBlock,
  extrinsicIdx?: number,
  expectedFormat: "account" | "h160" = "account",
): boolean {
  const valid =
    expectedFormat === "h160"
      ? /^0x[0-9a-fA-F]{40}$/.test(address)
      : isValidAccountAddress(address);
  if (valid) return true;

  logger.warn(
    `Skipping entity with invalid account address: block=${block.block.header.number.toString()} extrinsicIdx=${
      extrinsicIdx ?? "none"
    } prefix=${JSON.stringify(address.slice(0, 42))} length=${address.length}`,
  );
  return false;
}
