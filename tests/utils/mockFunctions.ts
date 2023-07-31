import { AnyTuple } from '@polkadot/types-codec/types';
import { IEvent } from '@polkadot/types/types';
import { EventRecord } from '@polkadot/types/interfaces';
import { SubstrateBlock, SubstrateEvent, SubstrateExtrinsic } from "@subql/types";

export class SubstrateTestEventBuilder<T extends AnyTuple = AnyTuple> {
    private _event: Partial<SubstrateEvent> = {};

    withExtrinsic(extrinsic: SubstrateExtrinsic): SubstrateTestEventBuilder<T> {
        this._event.extrinsic = extrinsic;
        return this;
    }

    withBlock(timestamp: Date = new Date(), blockNumber: number = 1): SubstrateTestEventBuilder<T> {
        this._event.block = {
            timestamp: timestamp,
            block: {
                header: {
                    number: mockNumber(blockNumber)
                }
            }
        } as SubstrateBlock
        return this;
    }

    withEvent(eventData): SubstrateTestEventBuilder<T> {
        this._event.event = {data: eventData, method: 'method', section: 'section'} as unknown as IEvent<AnyTuple, unknown>
        this._event.block.events = []
        const event = {event: {data: eventData, method: 'method', section: 'section'}} as EventRecord
        this._event.block.events.push(event)
        return this
    }

    build(): SubstrateEvent<T> {
        return this._event as SubstrateEvent<T>;
    }

    buildEventForRewards(rewardAccountId, amount): SubstrateEvent<T> {
        return this.withBlock().withEvent([rewardAccountId, amount]).build()
    }

    buildEventForPoolReward(rewardAccountId, poolId, amount): SubstrateEvent<T> {
        return this.withBlock().withEvent([rewardAccountId, poolId, amount]).build()
    }


    buildEventForBondedPoolSlash(poolId, amount): SubstrateEvent<T> {
        return this.withBlock().withEvent([poolId, amount]).build()
    }

    buildEventForUnbondingPoolSlash(era, poolId, amount): SubstrateEvent<T> {
        return this.withBlock().withEvent([era, poolId, amount]).build()
    }
}

class MockOption{
    private __data : unknown;
    public isSome = true;

    constructor(data : unknown) {
        this.__data = data
    }

    unwrap() {
        return this.__data
    }
}

export function mockOption(data : unknown): unknown {
    return new MockOption(data)
}

export function mockAddress(toStringValue: string): unknown {
    return {
        toString: jest.fn().mockReturnValue(toStringValue),
        toRawType: jest.fn().mockReturnValue('AccountId')
    }
}

export function mockNumber(number: number): unknown {
    return {
        toString: jest.fn().mockReturnValue(number.toString()),
        toNumber: jest.fn().mockReturnValue(number),
        toBigInt: jest.fn().mockReturnValue(BigInt(number))
    }
}