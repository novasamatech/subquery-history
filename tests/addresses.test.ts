import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import {
  isValidAccountAddress,
  shouldIndexAddress,
} from "../src/mappings/addresses";
import { SubstrateTestEventBuilder } from "./utils/mockFunctions";

const ACCOUNT = "0x" + "ab".repeat(32);

describe("account address validation", () => {
  it.each([0, 2, 42, 63, 64, 1000, 1285, 16383])(
    "accepts SS58 prefix %i without a network restriction",
    (prefix) => {
      expect(isValidAccountAddress(encodeAddress(ACCOUNT, prefix))).toBe(true);
    },
  );

  it.each([
    "0x54D435009Ee265d5967cc1Ed8b37cf8426De1149",
    "0x" + "ab".repeat(20),
    ACCOUNT,
    ACCOUNT.toUpperCase().replace("0X", "0x"),
  ])("accepts account hex %s", (address) => {
    expect(isValidAccountAddress(address)).toBe(true);
  });

  it.each([
    "",
    "0x",
    "0x" + "ab".repeat(5367),
    "0x" + "ab".repeat(19),
    "0x" + "ab".repeat(21),
    "0x" + "ab".repeat(31),
    "0x" + "ab".repeat(33),
    "0x" + "z".repeat(40),
    "0x" + "a".repeat(63),
    "not-an-address",
    " " + encodeAddress(ACCOUNT),
    encodeAddress(new Uint8Array([1])), // SS58 account index, not an account id
    encodeAddress(ACCOUNT).slice(0, -1) + "1", // invalid checksum
  ])("rejects unsupported input (case %#)", (address) => {
    expect(isValidAccountAddress(address)).toBe(false);
  });

  it("rejects arbitrary-length hex even though decodeAddress accepts it", () => {
    const address = "0x" + "ab".repeat(10000);
    expect(decodeAddress(address)).toHaveLength(10000);
    expect(isValidAccountAddress(address)).toBe(false);
  });

  it("logs bounded evidence and returns false without throwing", () => {
    const warn = jest.fn();
    (global as any).logger = { warn };
    const { block } = new SubstrateTestEventBuilder()
      .withBlock(undefined, 9484708)
      .build();
    const address = "0x" + "ab".repeat(5367);

    expect(shouldIndexAddress(address, block, 23)).toBe(false);
    const message = warn.mock.calls[0][0];
    expect(message).toContain("block=9484708 extrinsicIdx=23");
    expect(message).toContain(address.slice(0, 42));
    expect(message).not.toContain(address.slice(0, 44));
    expect(message.length).toBeLessThan(200);
    expect(shouldIndexAddress(ACCOUNT, block)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
