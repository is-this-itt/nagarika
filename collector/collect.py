"""Run the source adapters and update data/works.csv.

    python collector/collect.py                 # all sources
    python collector/collect.py kppp gepnic     # only these
Time budget per source (seconds) comes from BUDGET_<SOURCE>, default below.
"""
import os
import sys
import traceback

from common import Report, load_state, load_works, save_state, save_works
from places import CITIES, WardMatcher
from sources import bbmp_workorders, gepnic, kppp

SOURCES = {  # name: (module, default time budget in seconds)
    "bbmp": (bbmp_workorders, 600),
    "kppp": (kppp, 2400),
    "gepnic": (gepnic, 2400),
}


def main(names):
    works, state = load_works(), load_state()
    matchers = {c: WardMatcher(c) for c in CITIES}
    report = Report()
    before = len(works)
    for name in names or SOURCES:
        mod, budget = SOURCES[name]
        budget = int(os.environ.get(f"BUDGET_{name.upper()}", budget))
        try:
            mod.run(works, state, matchers, report, budget)
        except Exception as e:  # one broken source must not stop the others
            traceback.print_exc()
            report.add(name, f"failed: {type(e).__name__}: {e}")
        save_works(works)  # save after each source so a timeout loses little
        save_state(state)
    report.add("total", f"{len(works)} works ({len(works) - before:+d} this run)")
    report.write()


if __name__ == "__main__":
    main(sys.argv[1:])
