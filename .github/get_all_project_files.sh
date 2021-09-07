#!/bin/bash

MAIN_DIRECTORY='.'

JSON="{\"include\":["

for item in "$MAIN_DIRECTORY"/*.yaml
do
    # Skip base project.yaml which are using for initialization
    if [[ "$item" == "./project.yaml" ]]; then
        continue
    fi

    arrIN=(${item//\// })

    JSONline="{\"project_file\": \"${arrIN[1]}\"},"

    if [[ "$JSON" != *"$JSONline"* ]]; then
        JSON="$JSON$JSONline"
    fi

done <<< "$DIFF"

# Remove last "," and add closing brackets
if [[ $JSON == *, ]]; then
    JSON="${JSON%?}"
fi
JSON="$JSON]}"

echo $JSON
