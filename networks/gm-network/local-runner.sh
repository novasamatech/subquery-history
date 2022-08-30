SCRIPT_PATH=$(dirname "$0")

cd ${SCRIPT_PATH}

docker rm -f $(docker-compose ps -a -q)
sudo rm -rf .data/
sudo rm -rf dist/
yarn
yarn codegen
yarn build
yarn start:docker