import {SubstrateEvent} from "@subql/types";
import {eventId} from "./common";
import { EraValidatorInfo } from "../types/models/EraValidatorInfo";
import { IndividualExposure } from "../types";
import {SpStakingPagedExposureMetadata, SpStakingExposurePage} from "@polkadot/types/lookup";
import {Option} from "@polkadot/types-codec";
import {INumber} from "@polkadot/types-codec/types/interfaces";

export async function handleStakersElected(event: SubstrateEvent): Promise<void> {
    await handleNewEra(event)
}

export async function handleNewEra(event: SubstrateEvent): Promise<void> {
    const currentEra = (await api.query.staking.currentEra()).unwrap().toNumber()

    if (api.query.staking.erasStakersOverview) {
        await processEraStakersPaged(event, currentEra);
    } else {
        await processEraStakersClipped(event, currentEra);
    }
}

async function processEraStakersClipped(event: SubstrateEvent, currentEra: number): Promise<void> {
    const exposures = await api.query.staking.erasStakersClipped.entries(currentEra);

    const eraValidatorInfos = exposures.map(([key, exposure]) => {
        const [, validatorId] = key.args

        let validatorIdString = validatorId.toString()
        const eraValidatorInfo = new EraValidatorInfo(
            eventId(event)+validatorIdString,
            validatorIdString,
            currentEra,
            exposure.total.toBigInt(),
            exposure.own.toBigInt(),
            exposure.others.map(other => {
                return {
                    who: other.who.toString(),
                    value: other.value.toString()
                } as IndividualExposure
            })
        )
        return eraValidatorInfo.save()
    })

    await Promise.allSettled(eraValidatorInfos)
}

async function processEraStakersPaged(event: SubstrateEvent, currentEra: number): Promise<void> {
    const overview = await api.query.staking.erasStakersOverview.entries(currentEra)
    const pages = await api.query.staking.erasStakersPaged.entries(currentEra)

    const othersCounted = pages.reduce((accumulator, [key, exp]) => {
        const exposure = (exp as unknown as Option<SpStakingExposurePage>).unwrap()
        const [, validatorId, pageId] = key.args
        const pageNumber = (pageId as INumber).toNumber()
        const validatorIdString = validatorId.toString()
    
        const others = exposure.others.map(({who, value}) => {
            return {
                who: who.toString(),
                value: value.toString()
            } as IndividualExposure
        });

        (accumulator[validatorIdString] = accumulator[validatorIdString] || {})[pageNumber] = others;
        return accumulator;
    }, {})

    const eraValidatorInfos = overview.map(([key, exp]) => {
        const exposure = (exp as unknown as Option<SpStakingPagedExposureMetadata>).unwrap()
        const [, validatorId] = key.args
        let validatorIdString = validatorId.toString()
    
        let others = []
        for (let i = 0; i < exposure.pageCount.toNumber(); ++i) {
            others.push(...othersCounted[validatorIdString][i])
        };

        const eraValidatorInfo = new EraValidatorInfo(
            eventId(event)+validatorIdString,
            validatorIdString,
            currentEra,
            exposure.total.toBigInt(),
            exposure.own.toBigInt(),
            others
        )
        return eraValidatorInfo.save()
    })

    await Promise.allSettled(eraValidatorInfos)
}
