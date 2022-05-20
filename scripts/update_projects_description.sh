#!/bin/bash
# Require bash v4+
#
# You should download cli file for your operation sistem and put it in root directory.
# https://github.com/fewensa/subquery-cli/releases/

SCRIPT_PATH=$(dirname "$0")
MAIN_DIRECTORY=${SCRIPT_PATH%/*}

SUBQUERY_TOKEN="${SUBQUERY_TOKEN}"
ORGANISATION="nova-wallet"

REGULAR_DESCRIPTION="This project provides an API to retrieve information from the blockchain. It is used by the Nova Wallet project to fetching transaction history. </br>
It can also be used for your own purposes too! </br>
</br>
Use historyElements entity to getting this information: </br>
- Transfers that have been sent and received. Transfer parameter. </br>
- Other operation that were submitted in blockchain. Extrinsic parameter."

BASE_DESCRIPTION="This project provides an API to retrieve information from the blockchain. It is used by the Nova Wallet project to fetching transaction history. </br>
It can also be used for your own purposes too! </br>
</br>
Use historyElements entity to getting this information: </br>
- Transfers that have been sent and received. Transfer parameter. </br>
- Rewards and slashes for the staking activity. Reward parameter. </br>
- Other operation that were submitted in blockchain. Extrinsic parameter. </br>
</br>
Use accumulatedRewards and accumulatedStake to getting accumulated information about about your stake."

DESCRIPTION_WITH_CUSTOM_TOKENS="This project provides an API to retrieve information from the blockchain. It is used by the Nova Wallet project to fetching transaction history. </br>
It can also be used for your own purposes too! </br>
</br>
Use historyElements entity to getting this information: </br>
- Transfers for the main asset in the network that have been sent and received. Transfer parameter. </br>
- Transfers for additional assets which are also available in the network storing in another parameter - assetTransfer. </br>
- Other operation that were submitted in blockchain. Extrinsic parameter."

ORML_PROJECTS=('karura acala bifrost interlay kintsugi')
BASE_PROJECTS=('polkadot kusama westend')
ETH_PROJECTS=('moonbeam moonriver astar shiden')
ASSETS_PROJECTS=('statemine parallel parallel-heiko westmint')

folders=($(ls ${MAIN_DIRECTORY}/networks))

for item in ${folders[*]}; do
  DESCRIPTION=${REGULAR_DESCRIPTION} #Set regular description for most of projects

  if [[ " ${ORML_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION=${DESCRIPTION_WITH_CUSTOM_TOKENS} #ORML has no different with ASSETS pallet for subquery project
  fi

  if [[ " ${BASE_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION=${BASE_DESCRIPTION}
  fi

  if [[ " ${ETH_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION=${BASE_DESCRIPTION}  #Use base descripiton as it provide the same information, as Polkadot/Kusama project.
  fi

  if [[ " ${ASSETS_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION=${DESCRIPTION_WITH_CUSTOM_TOKENS} #ORML has no different with ASSETS pallet for subquery project
  fi

  echo ${item^}' - is '${DESCRIPTION^^}' project'
  # $MAIN_DIRECTORY/subquery --token ${SUBQUERY_TOKEN} project update --org ${ORGANISATION} --key "nova-wallet-"$item --description "${DESCRIPTION}" --subtitle "Nova Wallet SubQuery project for ${item^} network"

done

echo "Done !"
