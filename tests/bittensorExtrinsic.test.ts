import { Metadata, TypeRegistry } from "@polkadot/types";
import { SubstrateExtrinsic } from "@subql/types";
import chainTypes from "../chainTypes/bittensorChainTypes";
import fixture from "./fixtures/bittensor-9484708.json";
import { HistoryElement } from "../src/types";
import { handleHistoryElement } from "../src/mappings/HistoryElements";
import { handleTransfer } from "../src/mappings/Transfers";
import { isValidAccountAddress } from "../src/mappings/addresses";
import {
  SubstrateTestEventBuilder,
  mockAddress,
  mockNumber,
} from "./utils/mockFunctions";

function decodeIncident() {
  const registry = new TypeRegistry();
  registry.setKnownTypes(chainTypes);
  // Actual runtime specName is node-subtensor; its v14 metadata supplies the
  // address, signature and extension layouts. No decoder overrides are needed.
  registry.setMetadata(new Metadata(registry, fixture.metadata));
  return registry.createType("Extrinsic", fixture.extrinsic);
}

function incident(success = true): SubstrateExtrinsic {
  const { block } = new SubstrateTestEventBuilder()
    .withBlock(undefined, fixture.source.block)
    .build();
  return {
    block,
    extrinsic: decodeIncident(),
    idx: 23,
    success,
    events: [],
  } as SubstrateExtrinsic;
}

describe("Bittensor block 9484708 extrinsic 23", () => {
  beforeEach(() => {
    (global as any).logger = { warn: jest.fn() };
  });

  afterEach(() => jest.restoreAllMocks());

  it("decodes the real signed-v4 Raw authorization proof with exact bytes/hash", () => {
    const extrinsic = decodeIncident();
    expect(extrinsic.isSigned).toBe(true);
    expect(extrinsic.type).toBe(4);
    expect(extrinsic.version).toBe(0x84);
    expect(extrinsic.signer.type).toBe("Raw");
    const proof = extrinsic.signer.toString();
    expect(proof.length).toBe(10736); // 5367 bytes, formatted as hex
    expect(
      proof.startsWith(
        "0x908c0f57188ee3da542a2c55738c591c0ed3981d6be9e76051ddf3ed3a12378702050000000000000000",
      ),
    ).toBe(true);
    expect(isValidAccountAddress(proof)).toBe(false);
    // ML-DSA-65 v2, fixed-key profile 5, generation 0; the real signature is
    // inside Raw. The conventional signature is only the runtime's 0x4d carrier.
    expect(extrinsic.signature.toHex()).toBe("0x" + "4d".repeat(64));
    expect(extrinsic.nonce.toNumber()).toBe(0);
    expect(extrinsic.era.toHex()).toBe("0x1300");
    expect(extrinsic.tip.toNumber()).toBe(0);
    expect(extrinsic.method.section).toBe("balances");
    expect(extrinsic.method.method).toBe("transferAll");
    expect(extrinsic.method.args[0].toString()).toBe(
      "5FLnK6C2PmowmwsN5rC4g2TVWbwqd1m5bu19WuwdnTGAGJ6x",
    );
    expect(extrinsic.method.args[1].toString()).toBe("false");
    expect(extrinsic.toHex()).toBe(fixture.extrinsic);
    expect(Buffer.from(extrinsic.toU8a()).toString("hex")).toBe(
      fixture.extrinsic.slice(2),
    );
    expect(extrinsic.hash.toHex()).toBe(fixture.extrinsicHash);
  });

  it("skips the Raw signer and still saves a valid extrinsic in the same block", async () => {
    const save = jest
      .spyOn(HistoryElement.prototype, "save")
      .mockResolvedValue();
    const bad = incident();
    await handleHistoryElement(bad);
    expect(save).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("block=9484708 extrinsicIdx=23"),
    );

    const valid = {
      ...bad,
      idx: 24,
      extrinsic: {
        isSigned: true,
        signer: mockAddress("0x" + "ab".repeat(32)),
        hash: mockAddress("0x" + "cd".repeat(32)),
        method: { section: "system", method: "remark" },
      },
    } as unknown as SubstrateExtrinsic;
    await handleHistoryElement(valid);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.instances[0].id).toBe("9484708-24-extrinsic");
  });

  it("validates failed-transfer sides independently", async () => {
    const saved: HistoryElement[] = [];
    jest
      .spyOn(HistoryElement.prototype, "save")
      .mockImplementation(async function () {
        saved.push(this);
      });
    await handleHistoryElement(incident(false));
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe("9484708-23-to");
    expect(saved[0].address).toBe(
      "5FLnK6C2PmowmwsN5rC4g2TVWbwqd1m5bu19WuwdnTGAGJ6x",
    );
    expect(saved[0].transfer.success).toBe(false);
  });

  it("retains the successful transfer history for both real account addresses", async () => {
    const saved: HistoryElement[] = [];
    jest
      .spyOn(HistoryElement.prototype, "save")
      .mockImplementation(async function () {
        saved.push(this);
      });
    const event = new SubstrateTestEventBuilder()
      .withBlock(undefined, fixture.source.block)
      .withExtrinsic(incident())
      .withEvent(
        [
          mockAddress("5FLEMn5kjiYcKJzToYiyBMKtgvCay9KnRP9x6iuPxzVdwez1"),
          mockAddress("5FLnK6C2PmowmwsN5rC4g2TVWbwqd1m5bu19WuwdnTGAGJ6x"),
          mockNumber(1659112),
        ],
        100,
      )
      .build();
    await handleTransfer(event);
    expect(saved.map((e) => e.address)).toEqual(
      event.event.data.slice(0, 2).map((a) => a.toString()),
    );
    expect(saved.every((e) => e.transfer.success)).toBe(true);
  });
});
