#!/bin/bash
for d in */ ; do
    echo "Building $d"
    (cd "$d" ; yarn run build)
done
