#!/bin/bash

MAIN_DIRECTORY='.'
arrVar=()

for item in "$MAIN_DIRECTORY"/*.yaml
do
    # Skip base project.yaml which are using for initialization
    if [[ "$entry" == "./project.yaml" ]]; then
        continue
    fi

    arrIN=(${item//\// })
    arrVar+=${arrIN[1]}' '

done

echo $arrVar