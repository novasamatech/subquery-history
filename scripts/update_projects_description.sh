#!/bin/bash
# Require bash v4+
#
# You should download cli file for your operation sistem and put it in root directory.
# https://github.com/fewensa/subquery-cli/releases/

SCRIPT_PATH=$(dirname "$0")
MAIN_DIRECTORY=${SCRIPT_PATH%/*}

SUBQUERY_TOKEN="${SUBQUERY_TOKEN}"
ORGANISATION="nova-wallet"


BASE_DESCRIPTION="This project are indexing the blockchain and provides an API to retrieve information about the operations. It is used by the Nova Wallet project to fetching transaction history. </br>
It can also be used for your own purposes too! </br>
</br>
⚠️  Make sure that you add filters and sorting rules to your queries  ⚠️
</br>
</br>
🗒  That project provide access to information about all transfers and extrinsics. To receive that information you can use: </br>
query {historyElements{nodes{transfer extrinsic}}}
</br>"

ORML_DESCRIPTION="</br>
⚙️ This network also uses orml pallet for transfer assets and we proced it too! You can get the information about the orml assets transfer by using query like that:
</br>
query {historyElements{nodes{assetTransfer}}}
</br>"

ASSETS_DESCRIPTION="</br>
⚙️ This network also uses Assets pallet for transfer assets and we proced it too! You can get the information about the Assets transfer by using query like that:
</br>
query {historyElements{nodes{assetTransfer}}}
</br>"

STAKING_DESCRIPTION="</br>
🪙 In that network has staking events on which you can get. For getting history of rewards you can use this one:
</br>
query {historyElements{nodes{reward}}}
</br>
</br>
🥞 Also we are collecting information about accumulated staking which include rewards and slashes, you can request it by using:
</br>
query {accumulatedRewards{nodes{id amount}}}
</br>"

STAKING_ANALITIC="</br>
🧾 As it is collected for rewards it also collected for user stake and you can get it by using this one:</br>
query {accumulatedStakes{nodes{id amount}}}
</br> </br>

👨‍🔧 For getting an information about validators you can request it by:
</br>
query {eraValidatorInfos{nodes{address era total own others}}}
</br> </br>

📈 History about your stake changes is available by request:
</br>
query {stakeChanges{nodes{blockNumber extrinsicHash address amount accumulatedAmount type}}}
</br>"

ORML_PROJECTS=('karura acala bifrost interlay kintsugi')
ASSETS_PROJECTS=('statemine parallel parallel-heiko westmint moonbeam moonriver astar shiden')
HAS_STAKING=('polkadot kusama westend moonbeam moonriver')
HAS_STAKING_ANALYTIC=('polkadot kusama westend')

folders=($(ls ${MAIN_DIRECTORY}/networks))

for item in ${folders[*]}; do
  DESCRIPTION=${BASE_DESCRIPTION}

  if [[ " ${ORML_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION+=${ORML_DESCRIPTION}
  fi

  if [[ " ${ASSETS_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION+=${ASSETS_DESCRIPTION}
  fi

  if [[ " ${HAS_STAKING[*]} " =~ " ${item} " ]]; then
    DESCRIPTION+=${STAKING_DESCRIPTION}
  fi

  if [[ " ${HAS_STAKING_ANALYTIC[*]} " =~ " ${item} " ]]; then
    DESCRIPTION+=${STAKING_ANALITIC}
  fi

  $MAIN_DIRECTORY/subquery --token ${SUBQUERY_TOKEN} project update --org ${ORGANISATION} --key $item --description "${DESCRIPTION}" --subtitle "Nova Wallet SubQuery project for ${item^} network"

done

echo "Done !"
