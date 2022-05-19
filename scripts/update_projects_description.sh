#!/bin/bash
# Require bash v4+
#
# You should download cli file for your operation sistem and put it in root directory.
# https://github.com/fewensa/subquery-cli/releases/

SCRIPT_PATH=$(dirname "$0")
MAIN_DIRECTORY=${SCRIPT_PATH%/*}

SUBQUERY_TOKEN="${SUBQUERY_TOKEN}"
ORGANISATION="nova-wallet"

REGULAR_DESCRIPTION="Thats project provide an API for featching information from blockchain. It's using for the Nova Wallet project for showing transaction history </br>
- Provide operation history, including Transfers and Extrinsics"

BASE_DESCRIPTION="Thats project provide an API for featching information from blockchain. It's using for the Nova Wallet project for showing transaction history </br>
Focuses on the following use cases: </br>
- Provide complete operation history, including Transfers, Rewards/slashes, Other extrinsics </br>
- Provide data for staking analytics"

DESCRIPTION_WITH_ORML="Thats project provide an API for featching information from blockchain. It's using for the Nova Wallet project for showing transaction history </br>
Focuses on the following use cases: </br>
- Provide complete operation history, including Transfers, Other extrinsics </br>
- Provide information about transfers with custom assets in network </br>"

DESCRIPTION_WITH_ETH="Thats project provide an API for featching information from blockchain. It's using for the Nova Wallet project for showing transaction history </br>
Focuses on the following use cases: </br>
- Provide complete operation history, including Transfers, Other extrinsics </br>
- Provide information about ETH operation which store like usual extrinsic for account."

DESCRIPTION_WITH_ASSETS="Thats project provide an API for featching information from blockchain. It's using for the Nova Wallet project for showing transaction history </br>
Focuses on the following use cases: </br>
- Provide complete operation history, including Transfers, Other extrinsics </br>
- Provide information about transfers with custom assets in network </br>"

ORML_PROJECTS=('karura acala bifrost interlay kintsugi')
BASE_PROJECTS=('polkadot kusama westend')
ETH_PROJECTS=('moonbeam moonriver astar shiden')
ASSETS_PROJECTS=('statemine parallel parallel-heiko westmint')

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
    DESCRIPTION=${DESCRIPTION_WITH_ASSETS}
  fi

  echo ${item^}' - is '${DESCRIPTION^^}' project'
  # $MAIN_DIRECTORY/subquery --token ${SUBQUERY_TOKEN} project update --org ${ORGANISATION} --key "nova-wallet-"$item --description "${DESCRIPTION}" --subtitle "Nova Wallet SubQuery project for ${item^} network"

done

echo "Done !"
