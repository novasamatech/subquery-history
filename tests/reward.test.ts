import { AccumulatedPoolReward, AccountPoolReward } from '../src/types';
import { 
	handlePoolBondedSlash,
	handlePoolUnbondingSlash, 
} from "../src/mappings/PoolRewards"
import { getPoolMembers } from "../src/mappings/Cache"
import { SubstrateTestEventBuilder, mockOption, mockNumber, mockAddress } from "./utils/mockFunctions"
import { RewardType } from "../src/types";

const mockBondedPools = {
	42: mockOption({
		commission: {
			current: null,
			max: null,
			changeRate: null,
			throttleFrom: null,
		},
		memberCounter: 3,
		points: mockNumber(1000),
		roles: {
			depositor: mockAddress("13wcqPQM6W5C3BdZDegusda4akT8XL7RfjcXP6RHuo85ANNS"),
			root: mockAddress("13wcqPQM6W5C3BdZDegusda4akT8XL7RfjcXP6RHuo85ANNS"),
			nominator: mockAddress("13wcqPQM6W5C3BdZDegusda4akT8XL7RfjcXP6RHuo85ANNS"),
			bouncer: mockAddress("13wcqPQM6W5C3BdZDegusda4akT8XL7RfjcXP6RHuo85ANNS"),
		},
		state: "Open"
	})
}

const mockSubPoolsStorage = {
	42: mockOption({
		noEra: {
			points: mockNumber(1000),
			balance: mockNumber(1000)
		  },
		  withEra: {
			4904: {
			  points: mockNumber(2000),
			  balance: mockNumber(2000)
			},
			5426: {
				points: mockNumber(0),
				balance: mockNumber(0)
			}
		  }
	})
}

const mockPoolMembers = [
	[
	  [
		mockAddress("12JFwUszJsgVUr5YW3QcheYmDZHNYHiPELbuJx3rm6guhrse")
	  ],
	  mockOption({
			isSome: true,
			poolId: mockNumber(16),
			points: mockNumber(100),
			lastRecordedRewardCounter: undefined,
			unbondingEras: {}
		})
	],
	[
	  [
		mockAddress("16XzkhKCZqFA4yYd2nfrNk8GZBhq8xkdAQZe3T8tUWxanWWj")
	  ],
	  mockOption({
		isSome: true,
		poolId: mockNumber(42),
		points: mockNumber(100),
		lastRecordedRewardCounter: undefined,
		unbondingEras: {
			4904: mockNumber(10)
		}
	  })
	],
	[
	  [
		mockAddress("128uKFo94ewG8BrRXyqVQFDj8753XNfgsDUp9DSGdh8erKwS")
	  ],
	  mockOption({
		isSome: true,
		poolId: mockNumber(42),
		points: mockNumber(50),
		lastRecordedRewardCounter: undefined,
		unbondingEras: {
			5426: mockNumber(5)
		}
	  })
	],
	[
	  [
		mockAddress("13au37C1nZtMjvv2uPHRvamYdgAVxffTWJoCZXo2sw1NeysP")
	  ],
	  mockOption({
		isSome: true,
		poolId: mockNumber(42),
		points: mockNumber(25),
		lastRecordedRewardCounter: undefined,
		unbondingEras: {
			1: mockNumber(1234)
		}
	  })
	]
]

// Mock the API object using Jest
let mockAPI = {
	queryMulti: jest.fn((data) => {return data}),
	query: {
		staking: {
			payee: {
				isStaked: true,
			}
		},
		nominationPools: {
			bondedPools: async function(poolId) {
				return mockBondedPools[poolId]
			},
			poolMembers: {
				entries: async function() {
					return mockPoolMembers
				}
			},
			subPoolsStorage: async function(era) {
				return mockSubPoolsStorage[era]
			}
		}
	},
};

describe('handlePoolSlash', () => {
	let bondedSlashEvent
	let unbondingSlashEvent
	let poolId
	let slashAmount

	let answers

	let accumulatedPoolRewardResults: AccumulatedPoolReward[] = []
	let acountPoolRewardResults: AccountPoolReward[] = []

	beforeAll(() => {
		(global as any).api = mockAPI;
		poolId = mockNumber(42)
		slashAmount = mockNumber(10000)

		jest.spyOn(AccumulatedPoolReward, "get").mockResolvedValue(undefined)
		jest.spyOn(AccumulatedPoolReward.prototype, "save").mockImplementation(function (this: AccumulatedPoolReward) {
			accumulatedPoolRewardResults.push(this)
			return Promise.resolve()
		})
		jest.spyOn(AccountPoolReward.prototype, "save").mockImplementation(function (this: AccountPoolReward) {
			acountPoolRewardResults.push(this)
			return Promise.resolve()
		})
	});

	afterEach(() => {
		expect(acountPoolRewardResults.length).toBe(answers.length)
		acountPoolRewardResults.forEach((element, index) => {
			expect(element.address).toBe(answers[index][0])
			expect(element.amount).toBe(answers[index][1])
			expect(element.type).toBe(RewardType.slash)
			expect(element.poolId).toBe(poolId.toNumber())
		});
	})

	beforeEach(() => {
		acountPoolRewardResults = []
	})

	it('Bonded slash', async () => {
		answers = [
			["16XzkhKCZqFA4yYd2nfrNk8GZBhq8xkdAQZe3T8tUWxanWWj", BigInt(1000)],
			["128uKFo94ewG8BrRXyqVQFDj8753XNfgsDUp9DSGdh8erKwS", BigInt(500)],
			["13au37C1nZtMjvv2uPHRvamYdgAVxffTWJoCZXo2sw1NeysP", BigInt(250)],
		]

		bondedSlashEvent = new SubstrateTestEventBuilder().buildEventForBondedPoolSlash(poolId, slashAmount)
		await handlePoolBondedSlash(bondedSlashEvent,);
	});

	it('Caching for members working', async () => {
		answers = []
		jest.spyOn(mockAPI.query.nominationPools.poolMembers, "entries")

		const result_1 = await getPoolMembers(0) 
		const result_2 = await getPoolMembers(0)

		expect(mockAPI.query.nominationPools.poolMembers.entries).toBeCalledTimes(1)
		expect(result_1).toBe(result_2)
	});
});
