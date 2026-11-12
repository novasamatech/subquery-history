import {
  AccountPoolReward,
  AccountReward,
  AccumulatedPoolReward,
  AccumulatedReward,
  HistoryElement,
} from "../src/types";
import { handleHistoryElement } from "../src/mappings/HistoryElements";
import { handleMythosRewarded } from "../src/mappings/Rewards";
import { handlePoolReward } from "../src/mappings/PoolRewards";
import {
  createAssetTransmission,
  handleAssetTransfer,
  handleCurrencyTransfer,
  handleEquilibriumTransfer,
  handleTokenTransfer,
  handleTransfer,
} from "../src/mappings/Transfers";
import { SubstrateExtrinsic } from "@subql/types";
import {
  SubstrateTestEventBuilder,
  mockAddress,
  mockNumber,
} from "./utils/mockFunctions";

const VALID = "0x" + "ab".repeat(32);
const INVALID = "0x" + "cd".repeat(5367);

describe("indexed address writers", () => {
  let history: HistoryElement[];

  beforeEach(() => {
    history = [];
    (global as any).logger = { warn: jest.fn() };
    jest
      .spyOn(HistoryElement.prototype, "save")
      .mockImplementation(async function () {
        history.push(this);
      });
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ["native", handleTransfer, (from, to) => [from, to, mockNumber(10)]],
    [
      "asset",
      handleAssetTransfer,
      (from, to) => [mockNumber(1), from, to, mockNumber(10)],
    ],
    [
      "currency",
      handleCurrencyTransfer,
      (from, to) => [
        { toU8a: () => new Uint8Array([1]) },
        from,
        to,
        mockNumber(10),
      ],
    ],
    [
      "token",
      handleTokenTransfer,
      (from, to) => [
        { toU8a: () => new Uint8Array([1]) },
        from,
        to,
        mockNumber(10),
      ],
    ],
    [
      "equilibrium",
      handleEquilibriumTransfer,
      (from, to) => [from, to, mockNumber(1), mockNumber(10)],
    ],
  ])("keeps the valid side of a %s transfer", async (_, handler, data) => {
    for (const [from, to] of [
      [INVALID, VALID],
      [VALID, INVALID],
    ]) {
      const event = new SubstrateTestEventBuilder()
        .withBlock(undefined, 9484708)
        .withEvent(data(mockAddress(from), mockAddress(to)), 0)
        .build();
      await handler(event);
    }
    expect(history.map((e) => e.address)).toEqual([VALID, VALID]);
    expect(logger.warn).toHaveBeenCalledTimes(2);
  });

  it("applies the same guard to the shared swap writer", async () => {
    const event = new SubstrateTestEventBuilder()
      .withBlock()
      .withEvent([], 0)
      .build();
    const swap = {
      assetIdIn: "native",
      assetIdOut: "1",
      amountIn: "1",
      amountOut: "2",
      sender: INVALID,
      receiver: VALID,
      assetIdFee: "native",
      fee: "0",
      eventIdx: 0,
      success: true,
    };
    await createAssetTransmission(event, INVALID, "-from", { swap });
    await createAssetTransmission(event, VALID, "-to", { swap });
    expect(history).toHaveLength(1);
    expect(history[0].address).toBe(VALID);
    expect(history[0].swap).toEqual(swap);
  });

  it("preserves the unsigned EVM path and its checksummed H160 address", async () => {
    const event = new SubstrateTestEventBuilder()
      .withBlock(undefined, 9484708)
      .build();
    const evm = {
      block: event.block,
      idx: 18,
      success: true,
      extrinsic: {
        isSigned: false,
        hash: mockAddress(VALID),
        method: { section: "ethereum", method: "transact" },
      },
      events: [
        {
          event: {
            section: "ethereum",
            method: "Executed",
            data: [
              mockAddress("0x54d435009ee265d5967cc1ed8b37cf8426de1149"),
              mockAddress(VALID),
              mockAddress(VALID),
              { toJSON: () => ({ succeed: "Returned" }) },
            ],
          },
        },
      ],
    } as unknown as SubstrateExtrinsic;
    await handleHistoryElement(evm);
    expect(history).toHaveLength(1);
    expect(history[0].address).toBe(
      "0x54D435009Ee265d5967cc1Ed8b37cf8426De1149",
    );
  });

  it.each([
    ["long hex", INVALID],
    ["empty string", ""],
    ["missing address", undefined],
    ["short hex", "0x" + "ab".repeat(19)],
    ["AccountId32", VALID],
    ["SS58", "5FLEMn5kjiYcKJzToYiyBMKtgvCay9KnRP9x6iuPxzVdwez1"],
  ])(
    "skips an invalid ethereum.Executed address (%s) and keeps the next transaction",
    async (_, address) => {
      const { block } = new SubstrateTestEventBuilder()
        .withBlock(undefined, 9484708)
        .build();
      const evm = {
        block,
        idx: 18,
        success: true,
        extrinsic: {
          isSigned: false,
          hash: mockAddress(VALID),
          method: { section: "ethereum", method: "transact" },
        },
        events: [
          {
            event: {
              section: "ethereum",
              method: "Executed",
              data: [
                address === undefined ? undefined : mockAddress(address),
                mockAddress(VALID),
                mockAddress(VALID),
                { toJSON: () => ({ succeed: "Returned" }) },
              ],
            },
          },
        ],
      } as unknown as SubstrateExtrinsic;

      await expect(handleHistoryElement(evm)).resolves.toBeUndefined();
      expect(history).toHaveLength(0);
      expect(logger.warn).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("block=9484708 extrinsicIdx=18"),
      );
      expect((logger.warn as jest.Mock).mock.calls[0][0].length).toBeLessThan(
        200,
      );

      // ethereum.Executed carries H160, even on chains with SS58 substrate accounts.
      evm.idx = 19;
      evm.events[0].event.data[0] = mockAddress(
        "0x54d435009ee265d5967cc1ed8b37cf8426de1149",
      ) as any;
      await handleHistoryElement(evm);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe("9484708-19-extrinsic");
      expect(history[0].address).toBe(
        "0x54D435009Ee265d5967cc1Ed8b37cf8426De1149",
      );
    },
  );

  it.each([false, true])(
    "protects reward addresses and accumulated primary keys (pool=%s)",
    async (pool) => {
      const accumulatedClass = pool ? AccumulatedPoolReward : AccumulatedReward;
      const accountClass = pool ? AccountPoolReward : AccountReward;
      const getAccumulated = jest
        .spyOn(accumulatedClass, "get")
        .mockResolvedValue(undefined);
      const saveAccumulated = jest
        .spyOn(accumulatedClass.prototype, "save")
        .mockResolvedValue();
      const saveReward = jest
        .spyOn(accountClass.prototype, "save")
        .mockResolvedValue();
      const handle = pool ? handlePoolReward : handleMythosRewarded;
      for (const address of [INVALID, VALID]) {
        const data = pool
          ? [mockAddress(address), mockNumber(42), mockNumber(10)]
          : [mockAddress(address), mockNumber(10)];
        const event = new SubstrateTestEventBuilder()
          .withBlock(undefined, 9484708)
          .withEvent(data, address === INVALID ? 0 : 1)
          .build();
        await handle(event as any);
      }
      expect(getAccumulated).toHaveBeenCalledTimes(1);
      expect(getAccumulated).toHaveBeenCalledWith(VALID);
      expect(saveAccumulated).toHaveBeenCalledTimes(1);
      expect(saveReward).toHaveBeenCalledTimes(1);
      expect(saveReward.mock.instances[0].address).toBe(VALID);
      expect(history.map((e) => e.address)).toEqual([VALID]);
    },
  );
});
