import {SubstrateEvent} from "@subql/types";
import {eventId} from "./common";
import {EraStakersInfo, EraValidatorInfo, IndividualExposure, ValidatorExposure} from "../types";

export async function handleNewSession(event: SubstrateEvent): Promise<void> {
    const eraStakersInfo = new EraStakersInfo(eventId(event))
    let validators = await api.query.session.validators()

    let eraOption = await api.query.staking.activeEra()
    let eraIndex = eraOption.unwrap().index

    let erasStakers = await Promise.all(validators.map(id => api.query.staking.erasStakers(eraIndex, id)))

    let validatorInfo = erasStakers.map(exp => {
        return <EraValidatorInfo>{
            accountId: "testId",
            exposure: {
                total: exp.total.toString(),
                own: exp.own.toString(),
                others: exp.others.map(other => {
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