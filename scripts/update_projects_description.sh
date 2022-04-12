#!/bin/bash
# Require bash v4+
#
# You should download cli file for your operation sistem and put it in root directory.
# https://github.com/fewensa/subquery-cli/releases/

SCRIPT_PATH=$(dirname "$0")
MAIN_DIRECTORY=${SCRIPT_PATH%/*}

SUBQUERY_TOKEN="NDA1NjA2NjA=j8zWM4C1BZS13G9mNmSI"
ORGANISATION="nova-wallet"
DESCRIPTION="API for saturating Nova Wallet with information. Focuses on the following use cases: 1) Provide complete operation history, including Transfers, Rewards/slashes, Other extrinsics 2) Provide data for staking analytics"

folders=($(ls ${MAIN_DIRECTORY}/networks))

for item in ${folders[*]}
do
    $MAIN_DIRECTORY/subquery --token ${SUBQUERY_TOKEN} project update --org ${ORGANISATION} --key "nova-wallet-"$item --description "${DESCRIPTION}" --subtitle "Nova Wallet SubQuery project for ${item^} network"
done

printf "Done !"