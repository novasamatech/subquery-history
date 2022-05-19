#!/bin/bash
# Require bash v4+
#
# You should download cli file for your operation sistem and put it in root directory.
# https://github.com/fewensa/subquery-cli/releases/

SCRIPT_PATH=$(dirname "$0")
MAIN_DIRECTORY=${SCRIPT_PATH%/*}

SUBQUERY_TOKEN="NDA1NjA2NjA=HxySJFmehS6YBqn1onmQ"
ORGANISATION="nova-wallet"

REGULAR_DESCRIPTION="Thats project provide an API for featching information from blockchain. It's using for the Nova Wallet project for showing transaction history </br>
- Provide operation history, including Transfers and Extrinsics
"

BASE_DESCRIPTION="Thats project provide an API for featching information from blockchain. It's using for the Nova Wallet project for showing transaction history </br>
Focuses on the following use cases: </br>
1) Provide complete operation history, including Transfers, Rewards/slashes, Other extrinsics </br>
2) Provide data for staking analytics"

DESCRIPTION_WITH_ORML="Thats project provide an API for featching information from blockchain. It's using for the Nova Wallet project for showing transaction history </br>
Focuses on the following use cases: </br>
1) Provide complete operation history, including Transfers, Other extrinsics </br>
2) Provide information about transfers with custom assets in network </br>
for example to fetch custom assets history you can use that query: </br>
query {
    historyElements(first:5, filter:{assetTransfer:{notEqualTo:"null"}}){
    nodes{
      assetTransfer
    }
  }
}
"

DESCRIPTION_WITH_ETH="Thats project provide an API for featching information from blockchain. It's using for the Nova Wallet project for showing transaction history </br>
Focuses on the following use cases: </br>
1) Provide complete operation history, including Transfers, Other extrinsics </br>
2) Provide information about ETH operation which store like usual extrinsic for account.
"

ORML_PROJECTS=('karura')
BASE_PROJECTS=('polkadot kusama westend')
ETH_PROJECTS=('moonbeam moonriver astar shiden')
ASSETS_PROJECTS=('statemine')

folders=($(ls ${MAIN_DIRECTORY}/networks))

for item in ${folders[*]}; do
  DESCRIPTION=${REGULAR_DESCRIPTION} #Set regular description for most of projects

  if [[ " ${ORML_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION=${DESCRIPTION_WITH_ORML}
  fi

  if [[ " ${BASE_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION=${BASE_DESCRIPTION}
  fi

  if [[ " ${ETH_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION=${DESCRIPTION_WITH_ETH}
  fi

  if [[ " ${ASSETS_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION=${DESCRIPTION_WITH_ETH}
  fi

  printf ${item^}
  echo ${DESCRIPTION}
  # $MAIN_DIRECTORY/subquery --token ${SUBQUERY_TOKEN} project update --org ${ORGANISATION} --key "nova-wallet-"$item --description "${DESCRIPTION}" --subtitle "Nova Wallet SubQuery project for ${item^} network"

done

printf "Done !"
