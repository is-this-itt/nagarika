#!/usr/bin/env bash
# Fetches sample pages from candidate sources so their formats can be studied.
# Output goes to raw/; nothing here is used by the site.
set -u
mkdir -p raw
UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36'
get() { # name url [extra curl args]
  local name=$1 url=$2; shift 2
  code=$(curl -sSL -m 60 -A "$UA" -o "raw/$name" -w '%{http_code}' "$@" "$url" 2>>raw/_errors.txt)
  echo "$code $(stat -c %s "raw/$name" 2>/dev/null || echo 0) $name $url" >> raw/_index.txt
}
: > raw/_index.txt

# Karnataka KPPP: SPA shell, then its JS bundles, then a few tender records.
get kppp_index.html https://kppp.karnataka.gov.in/
for js in $(grep -oE 'src="[^"]+\.js"' raw/kppp_index.html | sed 's/src="//;s/"//' | head -8); do
  case $js in http*) u=$js;; /*) u=https://kppp.karnataka.gov.in$js;; *) u=https://kppp.karnataka.gov.in/$js;; esac
  get "kppp_js_$(basename "$js")" "$u"
done
H=(-H 'Referer: https://kppp.karnataka.gov.in/' -H 'Post: CONTRACTOR-EPROC-CONTRACTOR')
for id in 100000 200000 250000 300000 350000 400000; do
  get "kppp_works_$id.json" "https://kppp.karnataka.gov.in/supplier-registration-service/v1/api/portal-service/$id/works-tender-full-view" "${H[@]}"
done

# GePNIC portals (central + states): home, latest tenders, by organisation, results.
for p in eprocure.gov.in/eprocure tntenders.gov.in/nicgep mahatenders.gov.in/nicgep govtprocurement.delhi.gov.in/nicgep; do
  n=$(echo "$p" | cut -d. -f1)
  get "gep_${n}_home.html" "https://$p/app"
  get "gep_${n}_byorg.html" "https://$p/app?page=FrontEndTendersByOrganisation&service=page"
  get "gep_${n}_latest.html" "https://$p/app?page=FrontEndLatestActiveTenders&service=page"
  get "gep_${n}_results.html" "https://$p/app?page=ResultOfTenders&service=page"
done
get cppp_latest.html "https://eprocure.gov.in/cppp/latestactivetendersnew/cpppdata"
get cppp_aoc.html "https://eprocure.gov.in/cppp/resultoftendersnew/cpppdata"

# OpenCity (CKAN): datasets for works and ward maps.
O=https://data.opencity.in/api/3/action
get oc_workorders_2025.json "$O/package_show?id=bbmp-work-orders-and-payments-2025-26"
get oc_gba_wards.json "$O/package_show?id=gba-wards-delimitation-2025"
for q in ward+boundaries ward+map wards work+orders road+works tenders; do
  get "oc_search_${q//+/_}.json" "$O/package_search?q=$q&rows=100"
done

# Datameet municipal ward maps (file listing).
get datameet_tree.json "https://api.github.com/repos/datameet/Municipal_Spatial_Data/git/trees/master?recursive=1"

# LGD
get lgd_home.html https://lgdirectory.gov.in/
