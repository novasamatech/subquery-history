#!/bin/bash
# Require bash v4+
#
# You should download cli file for your operation sistem and put it in root directory.
# https://github.com/fewensa/subquery-cli/releases/

SCRIPT_PATH=$(dirname "$0")
MAIN_DIRECTORY=${SCRIPT_PATH%/*}

SUBQUERY_TOKEN="${SUBQUERY_TOKEN}"
ORGANISATION="stepanLav"


BASE_DESCRIPTION="Nova SubQuery project is indexing the blockchain and provides a convenient API for fetching operation history & analytics data. It is used by the Nova Wallet (novawallet.io)</br>
Feel free to use this API for your app! 💖</br>
</br>
<mark>Make sure that you add filters and sorting rules to your queries!</mark></br>
</br>
Following API & datasource is supported:
</br>
📚 Transfers and extrinsics (transactions). Both or either can be fetched, for example: </br>
<code>query {historyElements{nodes{transfer extrinsic}}}</code>
</br>"

MULTIASSET_DESCRIPTION="</br>
✨ Transfer history for additional assets in the network (based on \"assets\"/\"ORML\" Substrate pallet):
</br>
<code>query {historyElements{nodes{assetTransfer}}}</code>
</br>"

STAKING_DESCRIPTION="</br>
🥞 Staking rewards history:
</br>
<code>query {historyElements{nodes{reward}}}</code>
</br>
</br>
🎁 Total staking rewards for the desired acocunt:
</br>
<code>query {accumulatedRewards{nodes{id amount}}}</code>
</br>"

STAKING_ANALITIC="</br>
📊 Current stake — returns bonded amount:</br>
<code>query {accumulatedStakes{nodes{id amount}}}</code>
</br> </br>

👨‍🔧 Validators statistics:
</br>
<code>query {eraValidatorInfos{nodes{address era total own others}}}</code>
</br> </br>

📈 Stake change history:
</br>
<code>query {stakeChanges{nodes{blockNumber extrinsicHash address amount accumulatedAmount type}}}</code>
</br>"

# MULTIASSET_PROJECTS=('statemine parallel parallel-heiko westmint moonbeam moonriver astar shiden karura acala bifrost interlay kintsugi')
# HAS_STAKING=('polkadot kusama westend moonbeam moonriver')
# HAS_STAKING_ANALYTIC=('polkadot kusama westend')

MULTIASSET_PROJECTS=('test')
HAS_STAKING=('test-project fearless-test')
HAS_STAKING_ANALYTIC=('test-project')

# folders=($(ls ${MAIN_DIRECTORY}/networks))
folders=('test test-project fearless-test')

for item in ${folders[*]}; do
  DESCRIPTION=${BASE_DESCRIPTION}

  if [[ " ${MULTIASSET_PROJECTS[*]} " =~ " ${item} " ]]; then
    DESCRIPTION+=${MULTIASSET_DESCRIPTION}
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
