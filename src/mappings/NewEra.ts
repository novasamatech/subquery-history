import {SubstrateEvent} from "@subql/types";
import {eventId} from "./common";
import { EraValidatorInfo } from "../types/models/EraValidatorInfo";

export async function handleNewEra(event: SubstrateEvent): Promise<void> {
    let eraOption = await api.query.staking.currentEra()
    let eraIndex = eraOption.unwrap()

    const exposures = await api.query.staking.erasStakers.entries(eraIndex);

    let eraValidatorInfos = exposures.map(([key, exposure], index) => {
        const [, validatorId] = key.args

        let validatorIdString = validatorId.toString()
        const eraValidatorInfo = new EraValidatorInfo(eventId(event)+validatorIdString)
        eraValidatorInfo.era = eraIndex.toString()
        eraValidatorInfo.address = validatorIdString
        eraValidatorInfo.total = exposure.total.toString()
        eraValidatorInfo.own = exposure.own.toString()
        eraValidatorInfo.others = exposure.others.map(other => {
            return {
                who: other.who.toString(),
                value: other.value.toString()
            }
        })
        return eraValidatorInfo.save()
    })

    await Promise.allSettled(eraValidatorInfos)
}