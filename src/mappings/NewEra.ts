import {SubstrateEvent} from "@subql/types";
import {eventId} from "./common";
import {EraStakersInfo} from "../types";

export async function handleNewEra(event: SubstrateEvent): Promise<void> {
    const eraStakersInfo = new EraStakersInfo(eventId(event))

    let eraOption = await api.query.staking.currentEra()
    let eraIndex = eraOption.unwrap()

    eraStakersInfo.era = eraIndex.toString()

    const exposures = await api.query.staking.erasStakers.entries(eraIndex);

    eraStakersInfo.validators = exposures.map(([key, exposure]) => {
        const [, validatorId] = key.args

        return {
            address: validatorId.toString(),
            exposure: {
                total: exposure.total.toString(),
                own: exposure.own.toString(),
                others: exposure.others.map(other => {
                    return {
                        who: other.who.toString(),
                        value: other.value.toString()
                    }
                })
            }
        }
    })

    await eraStakersInfo.save()
}