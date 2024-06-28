#!/bin/sh

# This script iterates through all sub actions and run ncc command to compile and build javascript

for file in $(find . -type f -name "index.js" -maxdepth 2)
do
    cd $(echo $file | cut -d'/' -f 2)
    ncc build index.js --license licenses.txt
    cd ..
done

for file in $(find . -type f -name "ncc-build-all.sh" -maxdepth 2 -not -path "./ncc-build-all.sh")
do
    cd $(echo $file | cut -d'/' -f 2)
    ./ncc-build-all.sh
    cd ..
done


