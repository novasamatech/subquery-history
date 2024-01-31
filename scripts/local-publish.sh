#!/bin/bash

# Get a list of YAML files in alphabetical order
yamlFiles=($(ls ../*.yaml | sort))

for file in "${yamlFiles[@]}"; do
    outputFileName=".$(basename "$file" .yaml)-cid"

    # Execute subql publish command
    subql codegen -f "$file" && subql publish -f "$file"

    # Move or create the output file in the ipfs-cids folder
    mv "../$outputFileName" "../ipfs-cids/$outputFileName"

    echo "Command executed for $file. Output file: $outputFileName"
done

echo "All project published successfully."
