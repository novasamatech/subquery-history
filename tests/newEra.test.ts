import { EraValidatorInfo } from "../src/types";
import { handlePagedElectionProceeded } from "../src/mappings/NewEra";
import {
  SubstrateTestEventBuilder,
  mockOption,
  mockNumber,
  mockAddress,
} from "./utils/mockFunctions";

const CURRENT_ERA = 2228;

const VALIDATOR_A = "14LzEeAqYAgVvbxqzdVQGL8zPQFe1o5zGRSbCZDwtCd2AZgA";
const VALIDATOR_B = "15wD8upZxRZijKkF7JZDdaaFXuRZJhFyYpFQC5j6FaZL5PzA";
const NOMINATOR_1 = "136fZX6JHbywxoMXZiTY23eGGGkb3HrW7UHWZvZ5JGLzSGNF";
const NOMINATOR_2 = "14UpRGUeAfsSZHFN63t4ojJrLNupPApUiLgovXtm7ZiAHUDA";
const NOMINATOR_3 = "13FNi4e4EJRpweeTZiUBA4BvjeMKZBxf67h5cyzxxRvHcBMk";

function mockOverviewEntry(validator: string, pageCount: number) {
  return [
    { args: [mockNumber(CURRENT_ERA), mockAddress(validator)] },
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
      args: [mockNumber(CURRENT_ERA), mockAddress(validator), mockNumber(page)],
    },
    mockOption({
      others: others.map((who) => {
        return { who: mockAddress(who), value: mockNumber(1000) };
      }),
    }),
  ];
}

const mockAPI = {
  query: {
    staking: {
      currentEra: async () => mockOption(mockNumber(CURRENT_ERA)),
      erasStakersOverview: {
        entries: async (_era: number) => [
          mockOverviewEntry(VALIDATOR_A, 2),
          mockOverviewEntry(VALIDATOR_B, 1),
        ],
      },
      erasStakersPaged: {
        entries: async (_era: number) => [
          mockPageEntry(VALIDATOR_A, 0, [NOMINATOR_1]),
          mockPageEntry(VALIDATOR_A, 1, [NOMINATOR_2]),
          mockPageEntry(VALIDATOR_B, 0, [NOMINATOR_3]),
        ],
      },
    },
  },
};

function pagedElectionEvent(pageIndex: number) {
  return new SubstrateTestEventBuilder()
    .withBlock(new Date(), 18040436)
    .withEvent([mockNumber(pageIndex), mockOption({})], 7)
    .build();
}

describe("handlePagedElectionProceeded", () => {
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

  it("skips pages other than the last one (page index != 0)", async () => {
    await handlePagedElectionProceeded(pagedElectionEvent(3));

    expect(savedInfos).toHaveLength(0);
  });

  it("saves era validator infos with merged pages on page index 0", async () => {
    await handlePagedElectionProceeded(pagedElectionEvent(0));

    expect(savedInfos).toHaveLength(2);

    const infoA = savedInfos.find((info) => info.address === VALIDATOR_A);
    expect(infoA).toBeDefined();
    expect(infoA.id).toBe(`18040436-7${VALIDATOR_A}`);
    expect(infoA.era).toBe(CURRENT_ERA);
    expect(infoA.total).toBe(BigInt(3000));
    expect(infoA.own).toBe(BigInt(1000));
    expect(infoA.others.map((other) => other.who)).toEqual([
      NOMINATOR_1,
      NOMINATOR_2,
    ]);

    const infoB = savedInfos.find((info) => info.address === VALIDATOR_B);
    expect(infoB).toBeDefined();
    expect(infoB.era).toBe(CURRENT_ERA);
    expect(infoB.others.map((other) => other.who)).toEqual([NOMINATOR_3]);
  });
});
