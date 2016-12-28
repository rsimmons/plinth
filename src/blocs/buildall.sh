#!/bin/bash
for d in */ ; do
    echo "Building $d"
    (cd "$d" ; npm run build)
done
