import {SubstrateEvent} from "@subql/types";
import {blockNumber, eventId, timestamp} from "./common";
import {Balance, AccountId} from "@polkadot/types/interfaces";
import {RewardDestination} from "@polkadot/types/interfaces/staking";

// Due to memory consumption optimization `rewardDestinationByAddress` contains only one key
let rewardDestinationByAddress: {[blockId: string]: {[address: string]: RewardDestination}} = {}
let controllersByStash: {[blockId: string]: {[address: string]: string}} = {}

export async function cachedRewardDestination(accountAddress: string, event: SubstrateEvent): Promise<RewardDestination> {
    const blockId = blockNumber(event)
    let cachedBlock = rewardDestinationByAddress[blockId]
    
    if (cachedBlock !== undefined) {
        return cachedBlock[accountAddress]
    } else {
        rewardDestinationByAddress = {}
        
        let method = event.event.method
        let section = event.event.section

        const allAccountsInBlock = event.block.events
            .filter(blockEvent => { 
                return blockEvent.event.method == method && blockEvent.event.section == section
            })
            .map(event => { 
                let {event: {data: [accountId, ]}} = event
                return accountId
            });

        // looks like accountAddress not related to events so just try to query payee directly
        if (allAccountsInBlock.length === 0) {
            rewardDestinationByAddress[blockId] = {}
            return await api.query.staking.payee(accountAddress)
        }

        // TODO: Commented code doesn't work now, may be fixed later
        // const payees = await api.query.staking.payee.multi(allAccountsInBlock);
        const payees = await api.queryMulti(allAccountsInBlock.map(account => ([api.query.staking.payee, account])));

        const rewardDestinations = payees.map(payee => { return payee as RewardDestination });
        
        let destinationByAddress: {[address: string]: RewardDestination} = {}
        
        // something went wrong, so just query for single accountAddress
        if (rewardDestinations.length !== allAccountsInBlock.length) {
            const payee = await api.query.staking.payee(accountAddress)
            destinationByAddress[accountAddress] = payee
            rewardDestinationByAddress[blockId] = destinationByAddress
            return payee
        }
        allAccountsInBlock.forEach((account, index) => { 
            let accountAddress = account.toString()
            let rewardDestination = rewardDestinations[index]
            destinationByAddress[accountAddress] = rewardDestination
        })
        rewardDestinationByAddress[blockId] = destinationByAddress
        return destinationByAddress[accountAddress]
    }
}

export async function cachedController(accountAddress: string, event: SubstrateEvent): Promise<string> {
    const blockId = blockNumber(event)
    let cachedBlock = controllersByStash[blockId]
    
    if (cachedBlock !== undefined) {
        return cachedBlock[accountAddress]
    } else {
        controllersByStash = {}
        
        let method = event.event.method
        let section = event.event.section

        const allAccountsInBlock = event.block.events
            .filter(blockEvent => { 
                return blockEvent.event.method == method && blockEvent.event.section == section
            })
            .map(event => { 
                let {event: {data: [accountId, ]}} = event
                return accountId
            });

        var controllerNeedAccounts: AccountId[] = []

        for (let accountId of allAccountsInBlock) {
            const rewardDestination = await cachedRewardDestination(accountId.toString(), event)

            if (rewardDestination.isController) {
                controllerNeedAccounts.push(accountId as AccountId)
            }
        }

        // looks like accountAddress not related to events so just try to query controller directly
        if (controllerNeedAccounts.length === 0) {
            controllersByStash[blockId] = {}
            let accountId = await api.query.staking.bonded(accountAddress)
            return accountId.toString()
        }

        // TODO: Commented code doesn't work now, may be fixed later
        // const bonded = await api.query.staking.bonded.multi(controllerNeedAccounts);
        const bonded = await api.queryMulti(controllerNeedAccounts.map(account => ([api.query.staking.bonded, account])));
        const controllers = bonded.map(bonded => { return bonded.toString() });
        
        let bondedByAddress: {[address: string]: string} = {}
        
        // something went wrong, so just query for single accountAddress
        if (controllers.length !== controllerNeedAccounts.length) {
            const controller = await api.query.staking.bonded(accountAddress)
            let controllerAddress = controller.toString()
            bondedByAddress[accountAddress] = controllerAddress
            controllersByStash[blockId] = bondedByAddress
            return controllerAddress
        }
        controllerNeedAccounts.forEach((account, index) => { 
            let accountAddress = account.toString()
            bondedByAddress[accountAddress] = controllers[index]
        })
        controllersByStash[blockId] = bondedByAddress
        return bondedByAddress[accountAddress]
    }
}