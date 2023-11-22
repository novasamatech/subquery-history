import {SubstrateEvent} from "@subql/types";
import {eventId} from "./common";
import { EraValidatorInfo } from "../types/models/EraValidatorInfo";
import { IndividualExposure } from "../types";

export async function handleStakersElected(event: SubstrateEvent): Promise<void> {
    await handleNewEra(event)
}

export async function handleNewEra(event: SubstrateEvent): Promise<void> {
    const currentEra = (await api.query.staking.currentEra()).unwrap()

    const exposures = await api.query.staking.erasStakersClipped.entries(currentEra.toNumber());

    const eraValidatorInfos = exposures.map(([key, exposure]) => {
        const [, validatorId] = key.args

        let validatorIdString = validatorId.toString()
        const eraValidatorInfo = new EraValidatorInfo(
            eventId(event)+validatorIdString,
            validatorIdString,
            currentEra.toNumber(),
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
