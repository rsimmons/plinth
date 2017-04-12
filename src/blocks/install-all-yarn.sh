#!/bin/bash
set -e

MYDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

for d in $MYDIR/*/ ; do
    echo "Installing (with yarn) in $d"
    (cd "$d" ; yarn)
done
