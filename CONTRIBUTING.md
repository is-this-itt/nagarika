# Contributing

Thanks for helping. Nagarika is useful only if its data is right, so the rules below
are mostly about data.

## Data rules

1. **Link every record to its official source.** If the source link is not permanent
   (session-bound pages), put the steps to find it in `source_note`.
2. **Never fill a field by guessing.** Leave it empty; the site shows
   "not published". Derived values (such as an estimated finish date) must say how
   they were derived (`deadline_basis`).
3. **Do not publish personal contact details.** Contractor and officer phone numbers
   are dropped.
4. **Be polite to government servers.** Keep request rates low, cache what you have
   already fetched, and identify the project in the User-Agent.

## Ways to help

- **Report a data error:** open an issue with the work's link.
- **Add a pilot city** (ward-level pages):
  1. Find a ward boundary file (OpenCity, Datameet, the city's own GIS portal).
  2. Add it to `SOURCES` and a normaliser in `collector/boundaries.py`; add the city
     to `CITIES` in `collector/places.py`.
  3. Teach `WardMatcher.match` how that city writes ward references
     ("Ward No. 12", "K/E ward", ward names).
  4. Map the city's organisation name to the city slug in its source adapter
     (for GePNIC, the `PORTALS` entry).
- **Add a state portal:** if it runs NIC GePNIC (URL ends in `/nicgep/app`), add one
  line to `PORTALS` in `collector/sources/gepnic.py`. Otherwise write a new adapter.
- **Write a new adapter:** add `collector/sources/<name>.py` with a
  `run(works, state, matchers, report, budget_s)` function that calls
  `common.upsert(works, record)` for each road-related work (use
  `common.is_road_work`). Register it in `collector/collect.py` and document it in
  `docs/sources.md`.

## Development

```sh
pip install -r requirements.txt
python collector/collect.py bbmp
python collector/build.py && python -m http.server -d _site 8000
```

Keep pull requests small, and describe how you checked the data.

## Licences

By contributing you agree that code is released under the MIT licence and data under
the ODbL 1.0.
