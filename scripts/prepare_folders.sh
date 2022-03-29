#!/bin/bash
SCRIPT_PATH=$(dirname "$0")
MAIN_DIRECTORY=${SCRIPT_PATH%/*}

folders=($(ls ${MAIN_DIRECTORY}/networks))

for item in ${folders[*]}
do
  printf "   %s\n" $item
  scp -r ${MAIN_DIRECTORY}/src ${MAIN_DIRECTORY}/networks/$item
  scp ${MAIN_DIRECTORY}/tsconfig.json ${MAIN_DIRECTORY}/networks/$item
  scp ${MAIN_DIRECTORY}/schema.graphql ${MAIN_DIRECTORY}/networks/$item
  scp ${MAIN_DIRECTORY}/local-runner.sh ${MAIN_DIRECTORY}/networks/$item
  scp ${MAIN_DIRECTORY}/docker-compose.yml ${MAIN_DIRECTORY}/networks/$item
done

printf "Done !"