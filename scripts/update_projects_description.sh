#!/bin/bash
# Require bash v4+
#
# You should download cli file for your operation sistem and put it in root directory.
# https://github.com/fewensa/subquery-cli/releases/

SCRIPT_PATH=$(dirname "$0")
MAIN_DIRECTORY=${SCRIPT_PATH%/*}

SUBQUERY_TOKEN="${SUBQUERY_TOKEN}"
ORGANISATION="nova-wallet"


BASE_DESCRIPTION="Nova SubQuery project is indexing the blockchain and provides a convenient API for fetching operation history & analytics data. It is used by the <a href=\"https://novawallet.io\">Nova Wallet</a>
Feel free to use this API for your app! 💖</br>
<mark>Make sure that you add filters and sorting rules to your queries!</mark></br>
Following API & datasource is supported:
📚 Transfers and extrinsics (transactions). Both or either can be fetched, for example:
<code>query {historyElements{nodes{transfer extrinsic}}}</code>
</br>"

MULTIASSET_DESCRIPTION="✨ Transfer history for additional assets in the network (based on \"assets\"/\"ORML\" Substrate pallet):
<code>query {historyElements{nodes{assetTransfer}}}</code>
</br>"

STAKING_DESCRIPTION="🥞 Staking rewards history:
<code>query {historyElements{nodes{reward}}}</code>

🎁 Total staking rewards for the desired acocunt:
<code>query {accumulatedRewards{nodes{id amount}}}</code>
</br>"

STAKING_ANALITIC="📊 Current stake — returns bonded amount:
<code>query {accumulatedStakes{nodes{id amount}}}</code>

👨‍🔧 Validators statistics:
<code>query {eraValidatorInfos{nodes{address era total own others}}}</code>

📈 Stake change history:
<code>query {stakeChanges{nodes{blockNumber extrinsicHash address amount accumulatedAmount type}}}</code>
</br>"

MULTIASSET_PROJECTS=('statemine parallel parallel-heiko westmint moonbeam moonriver astar shiden karura acala bifrost interlay kintsugi')
HAS_STAKING=('polkadot kusama westend moonbeam moonriver')
HAS_STAKING_ANALYTIC=('polkadot kusama westend')


folders=($(ls ${MAIN_DIRECTORY}/networks))

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
