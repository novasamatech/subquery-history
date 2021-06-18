import {SubstrateEvent} from "@subql/types";
import {eventId} from "./common";
import {EraStakersInfo, EraValidatorInfo, IndividualExposure, ValidatorExposure} from "../types";

export async function handleNewSession(event: SubstrateEvent): Promise<void> {
    const eraStakersInfo = new EraStakersInfo(eventId(event))
    let validatorIds = await api.query.session.validators()

    let eraOption = await api.query.staking.activeEra()
    let eraIndex = eraOption.unwrap().index

    let erasStakers = await Promise.all(validatorIds.map(validatorId => api.query.staking.erasStakers(eraIndex, validatorId)))

    let validatorInfo = validatorIds.map(function (validatorId, index) {
        let exposure = erasStakers[index]
        return <EraValidatorInfo> {
            accountId: validatorId.toString(),
            exposure: {
                total: exposure.total.toString(),
                own: exposure.own.toString(),
                others: exposure.others.map(other => {
                    return <IndividualExposure> {
                        who: other.who.toString(),
                        value: other.value.toString()
                    }
                })
            }
        }
    })
    eraStakersInfo.era = eraIndex.toString()
    eraStakersInfo.validators = validatorInfo
    await eraStakersInfo.save()
}