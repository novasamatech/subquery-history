#!/bin/bash

SCRIPT_PATH=$(dirname "$0")

cd ${SCRIPT_PATH}

if [ -z $1 ]; then
    echo "Provide a path to project-{name}.yaml file"
    exit 1
fi

export PROJECT_PATH=$1

docker rm -f $(docker-compose ps -a -q)
sudo rm -rf .data/
sudo rm -rf dist/

# If any command bellow will fail - script will stop
set -e

yarn
yarn codegen
yarn build
yarn start:docker
