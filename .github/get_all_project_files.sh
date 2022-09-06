#!/bin/bash

MAIN_DIRECTORY='.'

for item in "$MAIN_DIRECTORY"/*.yaml
do
    # Skip base project.yaml which are using for initialization
    if [[ "$entry" == "./project.yaml" ]]; then
        continue
    fi

    arrIN=(${item//\// })
    echo ${arrIN[1]}

done