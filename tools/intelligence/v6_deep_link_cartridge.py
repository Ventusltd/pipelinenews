"""V6 - static checks on the atlas deep-link cartridge.

SCOPE, STATED HONESTLY
----------------------
There is no JavaScript runtime on this machine, so the cartridge's own
selfTest() has NOT been executed. This verifier reads the module as text and
checks the properties that can be established without running it.

That is genuinely weaker. It proves the broken shapes are gone and the
contract is coherent; it does NOT prove the emitted URL is correct at runtime.

    BEFORE PROMOTING, RUN:  node -e "import('./202608311304-atlas-pointer-deep-link.mjs')
                                     .then(m => console.log(m.selfTest()))"

and require ok === true. V6 is a gate, not a substitute for that.

Read-only. No network.
"""

import io
import os
import re
import sys

from common import Result

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
CARTRIDGE = os.environ.get("CARTRIDGE_MJS", "")

# The seven parameters the known-good legacy link carries.
REQUIRED_PARAMS = ["repd_ref", "project", "technology", "capacity_mw",
                   "latitude", "longitude", "zoom"]

# The exact shape that 404s. It must not appear anywhere in the successor.
BROKEN_PATH = "/gridatlas/202608300453-atlas-v9/"
BROKEN_TEMPLATE = "/gridatlas/${GRIDATLAS_RECEIVER.release_id}/"


def main():
    res = Result("V6", "Atlas deep-link cartridge - static checks (runtime test NOT run)")

    if not os.path.exists(CARTRIDGE):
        res.check("cartridge exists", False, "present", "absent", CARTRIDGE)
        return res.report()
    src = io.open(CARTRIDGE, encoding="utf-8").read()

    # 1. The broken path must be gone from the emitted contract. It may still
    #    appear inside the header comment that explains the fix, so the check
    #    is scoped to the code below the comment block.
    code = src.split("*/", 1)[-1]
    res.equals("broken 404 path absent from cartridge code", 0, code.count(BROKEN_PATH),
               "the pinned release path that 404s")
    res.equals("broken hardcoded pathname template absent", 0, src.count(BROKEN_TEMPLATE),
               "the predecessor's invariant asserted the broken shape and pinned it in place")

    # 2. The invariant must validate against the receiver's own declared
    #    pathname rather than a hardcoded template.
    res.check("route invariant compares against RECEIVER.pathname",
              "receiverUrl.pathname === RECEIVER.pathname" in src,
              "RECEIVER.pathname", "found" if "RECEIVER.pathname" in src else "missing")

    # 3. Every declared target must be internally consistent: the pathname it
    #    declares must actually be the pathname of the base_url it declares.
    #    Scoped to the ATLAS_TARGETS block only - scanning the whole file also
    #    matches the unrelated `eligibility: Object.freeze({...})` literal.
    m_block = re.search(r'const ATLAS_TARGETS = Object\.freeze\(\{(.*?)\n\}\);', src, re.S)
    res.check("ATLAS_TARGETS block is present", bool(m_block))
    targets = re.findall(r'(\w+):\s*Object\.freeze\(\{(.*?)\n  \}\)',
                         m_block.group(1) if m_block else "", re.S)
    res.check("at least two receiver targets are declared",
              len(targets) >= 2, ">= 2", len(targets))
    for name, body in targets:
        m_base = re.search(r'base_url:\s*\n?\s*"([^"]+)"', body)
        m_path = re.search(r'pathname:\s*"([^"]+)"', body)
        if not (m_base and m_path):
            res.check("[%s] declares base_url and pathname" % name, False,
                      "both", "missing one")
            continue
        base, path = m_base.group(1), m_path.group(1)
        # Derive the path from the URL without a URL parser: everything from
        # the third slash onward.
        derived = "/" + base.split("://", 1)[1].split("/", 1)[1]
        res.equals("[%s] declared pathname matches its base_url" % name, derived, path)
        res.check("[%s] base_url is HTTPS" % name, base.startswith("https://"),
                  "https://", base[:8])
        res.check("[%s] base_url ends in a slash" % name, base.endswith("/"),
                  "trailing slash", base[-1])

    # 4. ACTIVE_TARGET must name a target that actually exists.
    m_active = re.search(r'const ACTIVE_TARGET = "(\w+)"', src)
    res.check("ACTIVE_TARGET is declared", bool(m_active), "declared",
              m_active.group(1) if m_active else "absent")
    if m_active:
        names = [t[0] for t in targets]
        res.check("ACTIVE_TARGET names a declared receiver",
                  m_active.group(1) in names, names, m_active.group(1))

    # 5. The payload. This is the regression that started all of it.
    m_order = re.search(r'QUERY_PARAMETER_ORDER = Object\.freeze\(\[(.*?)\]\)', src, re.S)
    res.check("QUERY_PARAMETER_ORDER is declared", bool(m_order))
    if m_order:
        declared = re.findall(r'"(\w+)"', m_order.group(1))
        res.equals("all seven payload parameters are declared",
                   REQUIRED_PARAMS, declared,
                   "matches the known-good legacy link")
    for param in REQUIRED_PARAMS:
        res.check("searchParams sets '%s'" % param,
                  ('searchParams.set("%s"' % param) in src,
                  "set", "found" if ('searchParams.set("%s"' % param) in src else "MISSING")

    # 6. The eligibility gate must survive. It is what guarantees that
    #    latitude and longitude exist whenever a link is emitted at all.
    res.check("eligibility gate still requires geometry_status valid",
              'field: "geometry_status"' in src and 'equals: "valid"' in src)
    res.check("identity is still numeric-only",
              '/^\\d+$/u.test(repdRef)' in src, "numeric guard", "present"
              if '/^\\d+$/u.test(repdRef)' in src else "MISSING")
    res.check("EXACT_PROJECT_REPD_REF match semantics unchanged",
              'inbound_match_semantics: "EXACT_PROJECT_REPD_REF"' in src)

    # 7. Coordinates must be emitted as a pair, never half.
    res.check("latitude and longitude are gated on both being present",
              "latitude !== null && longitude !== null" in src,
              "paired guard", "present" if "latitude !== null && longitude !== null" in src
              else "MISSING")

    # 8. The cartridge must not be promotable by accident.
    res.check("cartridge declares deployment: not-authorised",
              'deployment: "not-authorised"' in src)

    # 9. A runtime self-test must at least EXIST, so the stronger gate is
    #    available to whoever has a JS runtime.
    res.check("runtime selfTest() is exported for the promotion gate",
              "export function selfTest()" in src)

    res.check("RUNTIME SELF-TEST HAS NOT BEEN EXECUTED (no JS runtime here)",
              True, "acknowledged", "acknowledged",
              "run node before promoting; V6 alone is not sufficient")

    return res.report()


if __name__ == "__main__":
    sys.exit(main())
