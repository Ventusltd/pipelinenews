"""V8 - the surface never characterises anyone's project or company.

THE RULE
--------
We do not say a project is bankrupt, distressed, failing, stalled or dead.
If a register says it, the register says it and we attribute it. We never say
it in our own voice, and no tile we render may assert it.

The reason is commercial and jurisdictional, not squeamish: this platform is
read by the people whose projects it describes, across several jurisdictions.
A characterisation we author is our claim, and we own the consequences of it.
A register status we quote is the register's claim, correctly attributed.

WHAT THIS CHECKS
----------------
Language WE author on a shipped surface:
  - the labels block of a payload (all public wording lives there)
  - copy hardcoded in a cartridge
  - the section text in index.html

It deliberately does NOT flag raw register values in data rows. Companies
House may publish "liquidation" as a filing type and DESNZ may publish a
status; quoting those with attribution is the correct behaviour, and banning
the words outright would stop us reporting the register at all.

Run against a built release:
    python v8_neutral_surface.py <path-to-release>
    python v8_neutral_surface.py            (checks every pipelinenews release)

Read-only. No network.
"""

import io
import json
import os
import re
import sys

from common import Result

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
RELEASES = os.path.join(REPO, "releases")

# Characterisations of a project's or company's condition. If one of these is
# in copy we author, it is us making the claim.
BANNED = [
    "distressed", "bankrupt", "bankruptcy", "insolvent", "insolvency",
    "failing", "failed project", "collapsed", "troubled",
    "in trouble", "at risk", "zombie", "dead", "doomed", "abandoned",
    "stalled", "stalling", "struck off", "wound up", "winding up",
    "going under", "defaulted", "delinquent", "distress",
    "mothballed", "written off", "write-off", "non-viable", "unviable",
    "uncreditworthy", "financially weak", "cash-strapped",
]

# Words that are legitimate when clearly attributed to a named register, and
# a claim when they are not. Presence requires an attribution marker nearby.
ATTRIBUTABLE = ["liquidation", "administration", "receivership", "refused",
                "withdrawn", "expired", "revoked"]
ATTRIBUTION_MARKERS = ["register", "desnz", "companies house", "gazette",
                       "published", "records", "as published", "planning"]

# Advice or instruction to act. We surface evidence; we do not tell anyone to
# stop selling to a named counterparty.
DIRECTIVES = ["stop selling", "do not engage", "avoid this", "blacklist",
              "walk away", "drop this", "write them off"]


CSS_NOISE = re.compile(
    r"[a-z-]+\s*:\s*[^;\"]+;|style\s*=|border-collapse|white-space|text-align|"
    r"font-[a-z]+|margin|padding|overflow|display\s*:|width\s*:|color\s*:")


def scan(label, text, res, allow_attributable=True):
    # CSS declarations are not prose. Remove them before looking for claims.
    low = CSS_NOISE.sub(" ", text.lower())
    for term in BANNED:
        if re.search(r"\b%s\b" % re.escape(term), low):
            snippet = low[max(0, low.index(term) - 60): low.index(term) + 60]
            res.check("%s: does not characterise with '%s'" % (label, term),
                      False, "absent", "PRESENT", "…%s…" % snippet.strip())
    for term in DIRECTIVES:
        if term in low:
            res.check("%s: gives no directive '%s'" % (label, term),
                      False, "absent", "PRESENT")
    if allow_attributable:
        for term in ATTRIBUTABLE:
            for m in re.finditer(r"\b%s\b" % re.escape(term), low):
                window = low[max(0, m.start() - 140): m.end() + 140]
                if not any(a in window for a in ATTRIBUTION_MARKERS):
                    res.check("%s: '%s' is attributed to a register" % (label, term),
                              False, "attributed", "UNATTRIBUTED",
                              "…%s…" % window.strip()[:150])


def check_release(path, res):
    name = os.path.basename(path)

    # 1. payload labels — every public string lives here
    data_dir = os.path.join(path, "data")
    if os.path.isdir(data_dir):
        for fn in sorted(os.listdir(data_dir)):
            if not fn.endswith(".json"):
                continue
            try:
                doc = json.loads(io.open(os.path.join(data_dir, fn), encoding="utf-8").read())
            except ValueError:
                continue
            labels = doc.get("labels")
            if labels:
                scan("%s/%s labels" % (name, fn), json.dumps(labels), res)

    # 2. copy hardcoded in cartridges
    assets = os.path.join(path, "assets")
    if os.path.isdir(assets):
        for fn in sorted(os.listdir(assets)):
            if not fn.endswith(".mjs"):
                continue
            src = io.open(os.path.join(assets, fn), encoding="utf-8").read()
            strings = re.findall(r'"([^"\\\n]{12,})"', src)
            strings += re.findall(r"`([^`]{12,})`", src)
            scan("%s/%s copy" % (name, fn), " ".join(strings), res)

    # 3. the section text we author in index.html
    idx = os.path.join(path, "index.html")
    if os.path.exists(idx):
        html = io.open(idx, encoding="utf-8").read()
        visible = re.sub(r"<script.*?</script>", " ", html, flags=re.S)
        visible = re.sub(r"<style.*?</style>", " ", visible, flags=re.S)
        visible = re.sub(r"<[^>]+>", " ", visible)
        # Only OUR sections are our voice. The frozen parent UI is not this
        # release's claim to answer for, and flagging it every build would
        # train everyone to ignore V8.
        ours = re.findall(r"PROJECT INTELLIGENCE.{0,1400}", visible, re.S)
        scan("%s/index.html (our section)" % name, " ".join(ours), res)


def main():
    res = Result("V8", "Neutral surface - we never characterise, the register speaks")

    targets = sys.argv[1:] or [os.path.join(RELEASES, d) for d in sorted(os.listdir(RELEASES))
                               if os.path.isdir(os.path.join(RELEASES, d))
                               and os.path.exists(os.path.join(RELEASES, d, "index.html"))]
    if not targets:
        res.check("at least one release to check", False, ">=1", 0)
        return res.report()

    for t in targets:
        check_release(t, res)

    # If nothing fired, say so positively rather than reporting an empty pass.
    if not res.checks:
        res.check("no characterisation in any shipped surface (%d releases)" % len(targets),
                  True, "clean", "clean",
                  "checked payload labels, cartridge copy and index.html body text")
    return res.report()


if __name__ == "__main__":
    sys.exit(main())
