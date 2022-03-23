#!/bin/bash
SCRIPT_PATH=$(dirname "$0")
MAIN_DIRECTORY=${SCRIPT_PATH%/*}

folders=($(ls ${MAIN_DIRECTORY}/networks))

for item in ${folders[*]}
do
  printf "   %s\n" $item
  if [ -d "${MAIN_DIRECTORY}/networks/$item/src" ]; then
  rm -r ${MAIN_DIRECTORY}/networks/$item/src
  rm ${MAIN_DIRECTORY}/networks/$item/tsconfig.json
  rm ${MAIN_DIRECTORY}/networks/$item/schema.graphql
  rm ${MAIN_DIRECTORY}/networks/$item/local-runner.sh
  rm ${MAIN_DIRECTORY}/networks/$item/docker-compose.yml
  fi

  if [ -d "${MAIN_DIRECTORY}/networks/$item/node_modules" ]; then
  rm -r ${MAIN_DIRECTORY}/networks/$item/node_modules
  fi

  if [ -d "${MAIN_DIRECTORY}/networks/$item/dist" ]; then
  rm -r ${MAIN_DIRECTORY}/networks/$item/dist
  fi

  if [ -d "${MAIN_DIRECTORY}/networks/$item/.data" ]; then
  rm -r ${MAIN_DIRECTORY}/networks/$item/.data
  fi

  if [ -f "${MAIN_DIRECTORY}/networks/$item/yarn.lock" ]; then
  rm ${MAIN_DIRECTORY}/networks/$item/yarn.lock
  fi
done

printf "Done !"