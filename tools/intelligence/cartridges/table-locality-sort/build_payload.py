"""Build the locality payload: town, postcode and planning authority per REPD ref.

WHERE EACH FIELD COMES FROM, AND WHY
------------------------------------
POSTCODE is an official REPD column ("Post Code"). It is copied, never derived.
Roughly a third of the register has none -- offshore wind has no postcode, and
that is a correct blank, not a gap to fill.

TOWN is not a REPD column. There is no town in the source. It is resolved from
the postcode through the ONS Postcode Directory (api.postcodes.io, the same
geocoder gridatlas already uses), preferring:

    bua     ONS Built-Up Area -- the named settlement. This is the town.
    parish  civil parish -- the right answer for a rural site with no BUA.
    ward    electoral ward -- Scotland has neither BUAs nor civil parishes in
            ONSPD, so the ward is the most local official name available there.

and falling back, only when there is no postcode at all, to the last segment of
the REPD Address that is neither a postcode nor the project's own county. That
fallback is marked `derived` in the payload so the UI can say so. A town this
app cannot source is null. It is never guessed.

The lookup runs HERE, at build time, and is baked into the payload. The table
makes no network call.

    python build_payload.py               # writes data/{GEN}-locality.json
    python build_payload.py --limit 200   # sample run
"""

import argparse
import csv
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
# cartridges/<name>/ -> cartridges -> intelligence -> tools -> pipelinenews
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
WORKSPACE = os.path.dirname(REPO)
REPD_CSV = os.path.join(WORKSPACE, "globalgrid2050", "repd.csv")
PROJECTS = os.path.join(
    REPO, "releases", "202608311610-pipelinenews",
    "data", "202608270055-8ab1807551bc-v8-fast-projects.json")
OUT = os.path.join(HERE, "data", "{GEN}-locality.json")

API = "https://api.postcodes.io/postcodes"
BATCH = 100

# A full UK postcode. REPD also carries bare outcodes ("TD14"), which the bulk
# endpoint cannot resolve -- those go to the outcode endpoint instead.
FULL_PC = re.compile(r"^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$", re.I)
OUTCODE = re.compile(r"^[A-Z]{1,2}\d[A-Z\d]?$", re.I)

# ONS writes the absence of a built-up area as a sentence, not as null.
NOT_A_PLACE = re.compile(r"non[- ]national park|^england\b|^wales\b|^scotland\b", re.I)


def norm_pc(raw):
    s = (raw or "").strip().upper()
    s = re.sub(r"\s+", " ", s)
    if not s:
        return ""
    body = s.replace(" ", "")
    if FULL_PC.match(body):
        return body[:-3] + " " + body[-3:]
    if OUTCODE.match(body):
        return body
    return ""


def post(url, payload):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8"))


def get(url):
    with urllib.request.urlopen(url, timeout=45) as r:
        return json.loads(r.read().decode("utf-8"))


def one_line(value):
    """Collapse a name onto one line.

    REPD address lines are free text and some of them carry an embedded CRLF:
    ref 3139 derives the town "North Lewis / Isle of Lewis" across a CRLF. A
    two-line town is not a town, it does not cluster with anything, and it
    renders as two lines inside one table cell.
    """
    if not value:
        return None
    return re.sub(r"\s+", " ", value).strip() or None


def town_from(node):
    """Pick the settlement name out of an ONSPD record."""
    for key in ("bua", "parish", "admin_ward"):
        v = (node or {}).get(key)
        # An outcode record answers with a LIST -- several parishes span one
        # outcode, and a list of parishes is not a town. Only a scalar counts.
        if isinstance(v, str) and v.strip() and not NOT_A_PLACE.search(v):
            return one_line(v), "ward" if key == "admin_ward" else key
    return None, None


# What a town name is NOT. REPD's Address is free text, and its last segment is
# frequently a whole site description rather than a place: "Lands east of
# Feystown Road Glenarm; extending between an area situated approximately 750m
# east of 54 Feystown Road ..." was being served as a TOWN, 237 characters
# wide, which is what forced the column open and left a gap on every other row.
#
# Scanning EARLIER segments instead was measured and is worse: it turns
# offshore sites into "Offshore" and "Greater Wash region", and it demotes
# Brettabister to Shetland. So the rule stays "last segment", and a last
# segment that does not look like a place name yields null.
NOT_A_TOWN = re.compile(
    r"""(
        \d                              # house number, road number, postcode fragment
      | \b(land|lands|site|sites|field|fields|farmland|adjacent|approximately
           |north|south|east|west|northeast|northwest|southeast|southwest
           |junction|extending|between|situated|proposed|windfarm
           |townlands?|nr|near|off|opposite|rear|former)\b
    )""",
    re.I | re.X)

TOWN_MAX = 32   # longest genuine value the rule keeps; the median town is 13


def looks_like_a_town(value):
    return bool(value) and len(value) <= TOWN_MAX and not NOT_A_TOWN.search(value)


def town_from_address(address, county):
    """Last address segment, but only if it reads as a place name.

    Measured over the 2,750 rows with no postcode to resolve: 1,587 yield a
    town-shaped value and 1,163 yield null. A null is the honest answer for a
    site whose address is a description -- offshore wind especially, where
    there is no town to name.
    """
    county = (county or "").strip().lower()
    parts = [p.strip() for p in (address or "").split(",") if p.strip()]
    for part in reversed(parts):
        if norm_pc(part):
            continue
        if part.lower() == county:
            continue
        if len(part) < 3 or part.isdigit():
            continue
        candidate = one_line(part)
        return candidate if looks_like_a_town(candidate) else None
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--gen", default="{GEN}")
    a = ap.parse_args()

    rows = list(csv.DictReader(io.open(REPD_CSV, encoding="cp1252", newline="")))
    by_ref = {r["Ref ID"].strip(): r for r in rows}
    print("REPD register: %d rows" % len(rows))

    doc = json.loads(io.open(PROJECTS, encoding="utf-8").read())
    fields = doc["fields"]
    i_ref = fields.index("repd_ref")
    i_county = fields.index("county")
    counties = doc["dictionaries"]["county"]

    wanted = []
    for row in doc["rows"]:
        ref = str(row[i_ref]).strip()
        rec = by_ref.get(ref)
        if not rec:
            continue
        ci = row[i_county]
        county = counties[ci] if isinstance(ci, int) and 0 <= ci < len(counties) else ""
        wanted.append((ref, rec, county))
    if a.limit:
        wanted = wanted[:a.limit]
    print("app projects joined to the register: %d of %d"
          % (len(wanted), len(doc["rows"])))

    # ---- resolve every distinct postcode once ----------------------------
    full, outs = set(), set()
    for _ref, rec, _c in wanted:
        pc = norm_pc(rec.get("Post Code"))
        if not pc:
            continue
        (outs if OUTCODE.match(pc) else full).add(pc)
    print("distinct postcodes: %d full, %d outcode-only" % (len(full), len(outs)))

    resolved = {}
    full = sorted(full)
    for n in range(0, len(full), BATCH):
        chunk = full[n:n + BATCH]
        try:
            res = post(API, {"postcodes": chunk})
        except Exception as exc:                      # noqa: BLE001
            print("  batch %d failed (%s) -- those postcodes stay unresolved"
                  % (n // BATCH, exc))
            continue
        for item in res.get("result", []):
            if item.get("result"):
                resolved[item["query"].upper()] = item["result"]
        sys.stdout.write("\r  resolved %d/%d" % (len(resolved), len(full)))
        sys.stdout.flush()
        time.sleep(0.15)
    print("\r  resolved %d/%d full postcodes   " % (len(resolved), len(full)))

    # Outcodes are deliberately NOT looked up. An outcode spans many parishes
    # and built-up areas, so ONSPD answers with lists, and a list of parishes
    # is not a town. Those rows keep their outcode and take the address-derived
    # town instead, marked as derived.
    print("  %d outcode-only postcodes kept as-is; town falls back to address"
          % len(outs))

    # ---- assemble --------------------------------------------------------
    out = {}
    stats = {"postcode": 0, "bua": 0, "parish": 0, "ward": 0, "derived": 0,
             "none": 0, "authority": 0}
    for ref, rec, county in wanted:
        pc = norm_pc(rec.get("Post Code"))
        town = source = None
        if pc and pc in resolved:
            town, source = town_from(resolved[pc])
        if not town:
            town = town_from_address(rec.get("Address"), county)
            source = "derived" if town else None
        authority = (rec.get("Planning Authority") or "").strip() or None

        if pc:
            stats["postcode"] += 1
        if authority:
            stats["authority"] += 1
        stats[source or "none"] = stats.get(source or "none", 0) + 1

        out[ref] = {
            "town": town,
            "town_source": source,
            "postcode": pc or None,
            "authority": authority,
        }

    payload = {
        "schema": "pipelinenews.locality.v1",
        "generation": a.gen,
        "usage_context": "NON_COMMERCIAL_OPEN_SOURCE",
        "sources": {
            "postcode": "DESNZ Renewable Energy Planning Database, column "
                        "'Post Code', Open Government Licence v3.0. Copied, "
                        "not derived.",
            "authority": "DESNZ REPD, column 'Planning Authority', OGL v3.0.",
            "town": "Resolved at build time from the postcode via the ONS "
                    "Postcode Directory (api.postcodes.io): ONS Built-Up Area "
                    "where one exists, otherwise civil parish. Where the "
                    "register carries no postcode, the last segment of the "
                    "REPD Address is used, but only when it reads as a place "
                    "name rather than a site description -- marked "
                    "town_source='derived'. Never guessed; null where "
                    "unsourceable, which includes most offshore wind.",
        },
        "town_source_values": ["bua", "parish", "ward", "derived", None],
        "counts": stats,
        "projects": len(out),
        "network_at_runtime": False,
        "locality": out,
    }
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"
    path = OUT.replace("{GEN}", a.gen) if a.gen != "{GEN}" else OUT
    io.open(path, "w", encoding="utf-8", newline="").write(body)
    digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
    io.open(path + ".sha256", "w", encoding="utf-8", newline="").write(
        digest + "  " + os.path.basename(path) + "\n")

    print("\nwrote %s  (%d bytes)" % (os.path.basename(path), len(body.encode("utf-8"))))
    for k in ("postcode", "authority", "bua", "parish", "ward", "derived", "none"):
        print("  %-10s %6d" % (k, stats.get(k, 0)))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
