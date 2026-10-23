"""Shared record format, storage and helpers for every source adapter."""
import csv
import datetime as dt
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
WORKS_CSV = os.path.join(DATA, "works.csv")
STATE_JSON = os.path.join(DATA, "state.json")

# One row per work. Empty string means "not published by the source"; nothing is guessed.
FIELDS = [
    "id",               # stable id: <source>:<source's own id>
    "source",           # adapter name (kppp, gepnic-tn, bbmp-workorders, ...)
    "source_id",        # the id the source uses (tender id, work-order id)
    "source_url",       # link to the official record (or the closest stable page)
    "source_note",      # how to find the record if the link is not permanent
    "title",
    "agency",           # organisation that issued the work
    "office",           # sub-office / division, if given
    "contractor",       # awarded contractor, if published
    "state",            # state name
    "state_lgd",        # LGD state code
    "city",             # pilot-city slug (bengaluru, chennai, mumbai) or ""
    "place",            # free-text place (district / town / location field)
    "pincode",
    "ward_ids",         # ";"-separated ward keys in the city's current ward map
    "ward_match",       # how the ward was found: text | crosswalk | none
    "location_text",    # location words from the source, verbatim
    "sanctioned_cost",  # rupees: estimated / tender value / work-order amount
    "cost_basis",       # which figure sanctioned_cost is
    "amount_paid",      # rupees paid so far, if published
    "published_date",   # YYYY-MM-DD
    "start_date",       # YYYY-MM-DD (award / work order date) if published
    "period_days",      # period of work in days, if published
    "deadline",         # YYYY-MM-DD
    "deadline_basis",   # official | estimated (how it was computed) | ""
    "status",           # status text as the source gives it
    "first_seen",       # YYYY-MM-DD this project first saw the record
    "last_checked",     # YYYY-MM-DD this project last fetched the record
]

STATE_LGD = {  # LGD state codes (same as Census 2011 state codes)
    "Karnataka": "29", "Tamil Nadu": "33", "Maharashtra": "27", "Delhi": "07",
    "Kerala": "32", "West Bengal": "19", "Rajasthan": "08", "Uttar Pradesh": "09",
    "Punjab": "03", "Haryana": "06", "Himachal Pradesh": "02", "Gujarat": "24",
    "Madhya Pradesh": "23", "Odisha": "21", "Assam": "18", "Jharkhand": "20",
    "Bihar": "10", "Uttarakhand": "05", "Goa": "30", "Andhra Pradesh": "28",
    "Telangana": "36", "Chhattisgarh": "22", "Jammu and Kashmir": "01",
    "Tripura": "16", "Manipur": "14", "Meghalaya": "17", "Mizoram": "15",
    "Nagaland": "13", "Sikkim": "11", "Arunachal Pradesh": "12", "Puducherry": "34",
    "Chandigarh": "04", "Ladakh": "37", "Central": "",
}

# A work is kept only if it digs up or rebuilds a road or what runs under or along it.
# Words like "road" alone are not enough: most addresses contain them. They count only
# when a works verb comes shortly before them.
ROAD_STRONG = re.compile(
    r"\b(asphalt\w*|bitumin\w*|bitumen|tarring|black ?top\w*|white ?top\w*|resurfac\w*|"
    r"pot ?holes?|carriageway|footpaths?|foot path|pavements?|paver blocks?|kerbs?|"
    r"flyovers?|under ?pass|subway|skywalk|foot over bridge|culverts?|storm ?water drains?|swd|"
    r"road ?(works?|repairs?|widening|cutting|restoration|improvements?|construction|development)|"
    r"cc roads?|wbm|speed breakers?|road ?side drains?|trench\w*)\b", re.I)
ROAD_NOUN = re.compile(r"\b(roads?|rd|streets?|lanes?|cross|drains?|junctions?|bridges?|highways?|"
                       r"nh-?\d+|sh-?\d+|walkways?|medians?|pipe ?lines?|cables?)\b", re.I)
ROAD_ACTION = re.compile(r"\b(improv\w*|repair\w*|construct\w*|develop\w*|widen\w*|concret\w*|"
                         r"maint\w*|restor\w*|reinstat\w*|re-?lay\w*|lay\w*|strengthen\w*|upgrad\w*|"
                         r"patch\w*|surfac\w*|paving|rehabilit\w*|reconstruct\w*|desilt\w*|"
                         r"filling|providing|formation|four ?lan\w*|two ?lan\w*|shifting)\b", re.I)
# Other objects of the works verb: "repair of toilet near station road" is not road work.
NOT_ROAD = re.compile(r"\b(street ?lights?|lighting|toilets?|buildings?|schools?|hospitals?|anganwadi|"
                      r"parks?|playgrounds?|gym|halls?|offices?|furniture|computers?|vehicles?|lakes?|"
                      r"gardens?|crematorium|burial|markets?|library|stadium|deck|banners?|pandal|"
                      r"compound walls?|quarters|hostels?|temples?|statues?)\b", re.I)


def is_road_work(*texts):
    for t in texts:
        if not t:
            continue
        if ROAD_STRONG.search(t):
            return True
        for m in ROAD_NOUN.finditer(t):
            before = t[max(0, m.start() - 50):m.start()]
            if re.match(r"\s*light", t[m.end():], re.I):  # "street lighting"
                continue
            if ROAD_ACTION.search(before) and not NOT_ROAD.search(before):
                return True
    return False


def today():
    return dt.date.today().isoformat()


def parse_date(text, fmts=("%d-%m-%Y %H:%M:%S", "%d-%m-%Y", "%d-%b-%Y %I:%M %p",
                            "%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y")):
    text = str(text or "").strip()
    for f in fmts:
        try:
            return dt.datetime.strptime(text, f).date().isoformat()
        except ValueError:
            pass
    return ""


def money(text):
    """'8,36,150' / '1.0' / 'NA' -> '836150' / '1' / ''."""
    t = re.sub(r"[^\d.]", "", str(text or ""))
    if not t or t == ".":
        return ""
    v = float(t)
    return "" if v <= 1 else str(int(round(v)))  # 0 or 1 rupee are placeholders


def add_days(iso, days):
    if not iso or not str(days).strip().isdigit():
        return ""
    return (dt.date.fromisoformat(iso) + dt.timedelta(days=int(days))).isoformat()


def load_works():
    if not os.path.exists(WORKS_CSV):
        return {}
    with open(WORKS_CSV, newline="", encoding="utf-8") as f:
        return {r["id"]: {k: r.get(k, "") for k in FIELDS} for r in csv.DictReader(f)}


def save_works(works):
    os.makedirs(DATA, exist_ok=True)
    rows = sorted(works.values(), key=lambda r: (r["state"], r["city"], r["id"]))
    with open(WORKS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in FIELDS})


def upsert(works, rec):
    """Merge a freshly fetched record into the store, keeping first_seen."""
    rec = {k: str(rec.get(k, "") or "") for k in FIELDS}
    old = works.get(rec["id"])
    rec["first_seen"] = old["first_seen"] if old and old["first_seen"] else today()
    rec["last_checked"] = today()
    if old:  # never blank out a value the source published earlier
        for k in FIELDS:
            if not rec[k] and old.get(k):
                rec[k] = old[k]
    works[rec["id"]] = rec


def load_state():
    if os.path.exists(STATE_JSON):
        return json.load(open(STATE_JSON))
    return {}


def save_state(state):
    os.makedirs(DATA, exist_ok=True)
    json.dump(state, open(STATE_JSON, "w"), indent=1, sort_keys=True)


class Report:
    """Collects per-source counts and errors for the run summary."""

    def __init__(self):
        self.lines = []

    def add(self, source, msg):
        line = f"- **{source}**: {msg}"
        print(line, flush=True)
        self.lines.append(line)

    def write(self):
        path = os.environ.get("GITHUB_STEP_SUMMARY")
        if path:
            with open(path, "a") as f:
                f.write("## Collection run\n\n" + "\n".join(self.lines) + "\n")
