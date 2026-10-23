#!/usr/bin/env bash
# MPLADS sources: which pages and APIs are public.
set -u
mkdir -p raw4
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36'
get() { code=$(curl -sSL -m 60 -A "$UA" -o "raw4/$1" -w '%{http_code}' "$2" 2>>raw4/_errors.txt); echo "$code $(stat -c %s raw4/$1 2>/dev/null) $1 $2" >> raw4/_index.txt; }
: > raw4/_index.txt
get mospi_home.html https://mplads.mospi.gov.in/
get mplads_gov_home.html https://www.mplads.gov.in/
get mplads_gov_home2.html https://mplads.gov.in/
get esakshi.html https://mplads.mospi.gov.in/eSAKSHI/
get mospi_main.html https://www.mospi.gov.in/
for js in $(grep -oE 'src="[^"]+\.js"' raw4/mospi_home.html | sed 's/src="//;s/"//' | head -6); do
  case $js in http*) u=$js;; /*) u=https://mplads.mospi.gov.in$js;; *) u=https://mplads.mospi.gov.in/$js;; esac
  get "mospi_js_$(basename "$js")" "$u"
done
grep -ohE 'href="[^"]+"' raw4/*.html | sort -u | head -200 > raw4/_links.txt
