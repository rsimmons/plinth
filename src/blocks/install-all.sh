#!/bin/bash
set -e

MYDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo $MYDIR

for d in $MYDIR/*/ ; do
    echo "Installing in $d"
    (cd "$d" ; npm install)
done
