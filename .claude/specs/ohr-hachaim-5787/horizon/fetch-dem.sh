#!/usr/bin/env sh
# Downloads the eleven public SRTM 1-arc-second tiles (about 26 MB each) that cover the four printed cities and their eastern horizons.
set -e
cd "$(dirname "$0")" && mkdir -p dem
for t in N30E034 N30E035 N30E036 N31E034 N31E035 N31E036 N32E034 N32E035 N32E036 N33E035 N33E036; do
  [ -f "dem/$t.hgt" ] || curl -sSf "https://s3.amazonaws.com/elevation-tiles-prod/skadi/$(echo $t | cut -c1-3)/$t.hgt.gz" | gunzip > "dem/$t.hgt"
done
