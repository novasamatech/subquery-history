import {SubstrateEvent} from "@subql/types";
import {eventId} from "./common";
import {EraStakersInfo, ValidatorExposure} from "../types";

export async function handleNewSession(event: SubstrateEvent): Promise<void> {
    const eraStakersInfo = new EraStakersInfo(eventId(event))
    let validators = await api.query.session.validators()

    let eraOption = await api.query.staking.activeEra()
    let eraIndex = eraOption.unwrap().index

    let erasStakers = await Promise.all(validators.map(id => api.query.staking.erasStakers(eraIndex, id)))

    // erasStakers.forEach(exposure => {
    //     let a = erasStakers.map(a => { own: a.own.toString, total: a.total.toString })
    //     eraStakersInfo.exposure = a
    // })
    eraStakersInfo.era = eraIndex.toString()
    eraStakersInfo.validators = []
    await eraStakersInfo.save()
}