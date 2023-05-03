import { AccountReward, AccumulatedReward, HistoryElement, RewardType, StakeChange } from '../src/types';
import { handleReward } from "../src/mappings/Rewards"
import { SubstrateTestEventBuilder, mockNumber, mockAddress } from "./utils/mockFunctions"


// Mock the API object using Jest
let mockAPI = {
	queryMulti: jest.fn((data) => {return data}),
	query: {
		staking: {
			payee: {
				isStaked: true,
			}
		}
	},
};

describe('handleReward', () => {
	let rewardEvent
	let accountId
	let rewardAmount

	beforeAll(() => {
		(global as any).api = mockAPI;
		accountId = mockAddress("JHXFqYWQFFr5RkHVzviRiKhY7tutyGcYQb6kUyoScSir862")
		rewardAmount = mockNumber(1000)
		
		rewardEvent = new SubstrateTestEventBuilder().buildEventForRewards(accountId, rewardAmount)
	});

	it('Positive reward processed properly', async () => {
		jest.spyOn(AccountReward.prototype, "save").mockResolvedValue(undefined)
		jest.spyOn(HistoryElement, "get").mockResolvedValue({} as HistoryElement)
		jest.spyOn(AccumulatedReward, "get").mockResolvedValue(undefined)
		jest.spyOn(AccumulatedReward.prototype, "save").mockImplementation(function (this: AccumulatedReward) {
			console.log(this)
			return Promise.resolve()
		})
		jest.spyOn(AccountReward.prototype, "save").mockImplementation(function (this: AccountReward) {
			expect(this.amount).toBe(AccountReward.getByAddress(accountId.toString()))
			return Promise.resolve()
		})

		await handleReward(rewardEvent);
	});
});
