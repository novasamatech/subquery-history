import { EraValidatorInfo } from "../src/types";
import { handleAHEraPaid } from "../src/mappings/NewEra";
import {
  SubstrateTestEventBuilder,
  mockOption,
  mockNumber,
  mockAddress,
} from "./utils/mockFunctions";

const ACTIVE_ERA = 2227;
const PLANNED_ERA = 2228;

const VALIDATOR_A = "14LzEeAqYAgVvbxqzdVQGL8zPQFe1o5zGRSbCZDwtCd2AZgA";
const VALIDATOR_B = "15wD8upZxRZijKkF7JZDdaaFXuRZJhFyYpFQC5j6FaZL5PzA";
const NOMINATOR_1 = "136fZX6JHbywxoMXZiTY23eGGGkb3HrW7UHWZvZ5JGLzSGNF";
const NOMINATOR_2 = "14UpRGUeAfsSZHFN63t4ojJrLNupPApUiLgovXtm7ZiAHUDA";
const NOMINATOR_3 = "13FNi4e4EJRpweeTZiUBA4BvjeMKZBxf67h5cyzxxRvHcBMk";

function mockOverviewEntry(validator: string, pageCount: number) {
  return [
    { args: [mockNumber(ACTIVE_ERA), mockAddress(validator)] },
    mockOption({
      total: mockNumber(3000),
      own: mockNumber(1000),
      pageCount: mockNumber(pageCount),
    }),
  ];
}

function mockPageEntry(validator: string, page: number, others: string[]) {
  return [
    {
      args: [mockNumber(ACTIVE_ERA), mockAddress(validator), mockNumber(page)],
    },
    mockOption({
      others: others.map((who) => {
        return { who: mockAddress(who), value: mockNumber(1000) };
      }),
    }),
  ];
}

// At the EraPaid (rotation) block, exposures exist only for the era that just
// became active; the planned era (currentEra) is not elected yet.
const mockAPI = {
  query: {
    staking: {
      activeEra: async () =>
        mockOption({ index: mockNumber(ACTIVE_ERA), start: mockOption(0) }),
      currentEra: async () => mockOption(mockNumber(PLANNED_ERA)),
      erasStakersOverview: {
        entries: async (era: number) =>
          era === ACTIVE_ERA
            ? [
                mockOverviewEntry(VALIDATOR_A, 2),
                mockOverviewEntry(VALIDATOR_B, 1),
              ]
            : [],
      },
      erasStakersPaged: {
        entries: async (era: number) =>
          era === ACTIVE_ERA
            ? [
                mockPageEntry(VALIDATOR_A, 0, [NOMINATOR_1]),
                mockPageEntry(VALIDATOR_A, 1, [NOMINATOR_2]),
                mockPageEntry(VALIDATOR_B, 0, [NOMINATOR_3]),
              ]
            : [],
      },
    },
  },
};

function eraPaidEvent() {
  return new SubstrateTestEventBuilder()
    .withBlock(new Date(), 18040436)
    .withEvent([mockNumber(ACTIVE_ERA - 1), mockNumber(1), mockNumber(1)], 7)
    .build();
}

describe("handleAHEraPaid", () => {
  let savedInfos: EraValidatorInfo[] = [];

  beforeAll(() => {
    (global as any).api = mockAPI;
    (global as any).logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.spyOn(EraValidatorInfo.prototype, "save").mockImplementation(function (
      this: EraValidatorInfo,
    ) {
      savedInfos.push(this);
      return Promise.resolve();
    });
  });

  beforeEach(() => {
    savedInfos = [];
  });

  it("snapshots the active era with merged pages and deterministic ids", async () => {
    jest.spyOn(EraValidatorInfo, "getByFields").mockResolvedValue([]);

    await handleAHEraPaid(eraPaidEvent());

    expect(savedInfos).toHaveLength(2);

    const infoA = savedInfos.find((info) => info.address === VALIDATOR_A);
    expect(infoA).toBeDefined();
    expect(infoA.id).toBe(`${ACTIVE_ERA}-${VALIDATOR_A}`);
    expect(infoA.era).toBe(ACTIVE_ERA);
    expect(infoA.total).toBe(BigInt(3000));
    expect(infoA.own).toBe(BigInt(1000));
    expect(infoA.others.map((other) => other.who)).toEqual([
      NOMINATOR_1,
      NOMINATOR_2,
    ]);

    const infoB = savedInfos.find((info) => info.address === VALIDATOR_B);
    expect(infoB).toBeDefined();
    expect(infoB.id).toBe(`${ACTIVE_ERA}-${VALIDATOR_B}`);
    expect(infoB.others.map((other) => other.who)).toEqual([NOMINATOR_3]);
  });

  it("skips eras that are already indexed (backfill or earlier run)", async () => {
    jest
      .spyOn(EraValidatorInfo, "getByFields")
      .mockResolvedValue([
        { id: `${ACTIVE_ERA}-backfill-x` } as EraValidatorInfo,
      ]);

    await handleAHEraPaid(eraPaidEvent());

    expect(savedInfos).toHaveLength(0);
  });
});
