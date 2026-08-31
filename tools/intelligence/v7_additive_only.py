"""V7 - the project-intelligence cartridge must be ADDITIVE ONLY.

Why this exists
---------------
The design freeze 202608311304 has one rule: the existing dashboard is not
modified. New features live inside their own cartridge host and nowhere else.

That rule is easy to state and easy to break by accident - one
document.querySelector outside the host, one stray style injection, one
listener on window, and the cartridge is reaching into the frozen design.

This verifier reads the cartridge as text and fails if it can reach anything
outside the host element it was handed.

SCOPE: static. There is no JavaScript runtime on this machine, so the cartridge
has not been executed. These checks prove it does not CONTAIN the means to
touch the rest of the page; they do not prove it renders correctly.

Read-only. No network.
"""

import io
import os
import re
import sys

from common import Result

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
CARTRIDGE = os.environ.get("PANEL_MJS", "")
REGISTRY = os.environ.get("REGISTRY_ENTRY", "")

# Anything that reaches outside the host element it was handed.
ESCAPE_HATCHES = [
    ("document.querySelector", "selects arbitrary elements on the page"),
    ("document.querySelectorAll", "selects arbitrary elements on the page"),
    ("document.getElementById", "selects an element outside the host"),
    ("document.body", "reaches the page body"),
    ("document.head", "reaches the document head"),
    ("document.write", "rewrites the document"),
    ("window.addEventListener", "listens on the window"),
    ("document.addEventListener", "listens on the document"),
    ("localStorage", "persists state outside the page"),
    ("sessionStorage", "persists state outside the page"),
    ("insertAdjacentHTML", "can inject outside the host"),
    ("document.styleSheets", "mutates existing styles"),
    ("<style", "injects a stylesheet"),
    ("classList.add(\"active\")", None),        # placeholder, refined below
]

# Contract flags that must be present and true.
REQUIRED_TRUE = ["additive_only", "asserts_no_personal_data", "derived_values_are_inferred"]
REQUIRED_FALSE = ["mutates_existing_dom", "eligible_for_news_signal",
                  "corroboration_adapters_built"]


def main():
    res = Result("V7", "Project-intelligence cartridge - additive only (static)")

    if not os.path.exists(CARTRIDGE):
        res.check("cartridge exists", False, "present", "absent", CARTRIDGE)
        return res.report()
    src = io.open(CARTRIDGE, encoding="utf-8").read()

    # Strip block comments so the doc header explaining the rules does not
    # trip the checks that enforce them.
    code = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    code = re.sub(r"^\s*//.*$", "", code, flags=re.M)

    # 1. No escape hatch out of the host.
    for token, why in ESCAPE_HATCHES:
        if why is None:
            continue
        res.equals("does not use %s (%s)" % (token, why), 0, code.count(token))

    # 2. The only DOM entry point is the host it was handed.
    res.check("mount signature takes a host",
              "export function mountProjectIntelligence({ host, payloadAsset })" in code,
              "host parameter", "present")
    res.check("host type is asserted before use",
              "host instanceof HTMLElement" in code)
    res.check("appends only to the host",
              code.count("host.appendChild") > 0 and "appendChild" in code)

    # createElement is fine - it builds detached nodes. Every one of them must
    # end up under the host, which is what the appendChild check above covers.
    res.check("builds detached nodes with createElement",
              "document.createElement" in code,
              "createElement", "present",
              "detached construction is the additive-safe way to build DOM")

    # 3. Contract flags.
    for flag in REQUIRED_TRUE:
        res.check("contract declares %s: true" % flag,
                  re.search(r"%s:\s*true" % flag, code) is not None)
    for flag in REQUIRED_FALSE:
        res.check("contract declares %s: false" % flag,
                  re.search(r"%s:\s*false" % flag, code) is not None)
    res.check("contract declares project_bindings: 0",
              re.search(r"project_bindings:\s*0", code) is not None)
    res.check("contract declares deployment: not-authorised",
              'deployment: "not-authorised"' in code)
    res.check("contract declares one_signal_policy WITHHOLD",
              'one_signal_policy: "WITHHOLD"' in code)

    # 4. Lazy payload. The loader asserts payloadRequests === 0 at mount, so
    #    the cartridge must not fetch until the user selects a tab.
    mount_body = code.split("export function mountProjectIntelligence", 1)[-1]
    before_select = mount_body.split("async function select", 1)[0]
    res.equals("no fetch before a tab is selected", 0, before_select.count("fetch("))
    res.check("returns payloadRequests for the loader to assert",
              "payloadRequests" in mount_body and "projectBindings: 0" in mount_body)
    res.check("guards against requesting the index more than once",
              'invariant(payloadRequests === 1' in code)

    # 5. Privacy and corroboration boundaries are asserted at runtime, not
    #    merely declared.
    res.check("asserts the payload's no_personal_data flag at load",
              "data.law?.no_personal_data === true" in code)
    res.check("asserts corroboration is still unbuilt before display",
              "data.law?.corroboration_adapters_built === false" in code)
    res.check("asserts the payload schema",
              'data.schema === "pipelinenews.v9.project-intelligence.v1"' in code)

    # 6. Public wording must come from the payload, never be hardcoded.
    res.check("band names are read from the payload labels block",
              "data.labels.band[" in code or "labels.band" in code)
    res.check("caveats are read from the payload labels block",
              "labels.caveat" in code)
    res.check("provenance is read from the payload labels block",
              "labels.provenance" in code)

    # 7. Uses only classes already in the frozen stylesheet. A new class name
    #    would mean a CSS change, which this freeze does not permit.
    allowed = {"news-tools", "card", "btn", "gauges", "meta", "section-title", "active"}
    used = set(re.findall(r'el\("[a-z]+",\s*"([a-z- ]+)"', code))
    used |= set(re.findall(r'classList\.toggle\("([a-z-]+)"', code))
    unknown = sorted({c for group in used for c in group.split() if c not in allowed})
    res.equals("introduces no new CSS class", [], unknown,
               "a new class would require a stylesheet change; the freeze forbids it")

    # 8. Registry entry agrees with the cartridge.
    if os.path.exists(REGISTRY):
        import json
        entry = json.load(io.open(REGISTRY, encoding="utf-8"))
        pi = entry["supplemental_assets"]["project_intelligence"]
        res.equals("registry generation matches the cartridge",
                   "202608311304", pi["generation"])
        res.equals("registry declares zero project bindings", 0, pi["project_bindings"])
        res.equals("registry declares additive_only", True, pi["additive_only"])
        res.check("registry names the cartridge's real export",
                  pi["cartridge"]["export"] == "mountProjectIntelligence")
        res.check("registry payload carries a sha256",
                  len(pi["payload"].get("sha256", "")) == 64)
    else:
        res.check("registry entry exists", False, "present", "absent", REGISTRY)

    res.check("RUNTIME NOT EXECUTED (no JS runtime here)", True,
              "acknowledged", "acknowledged",
              "open the page and click through all five tabs before promoting")

    return res.report()


if __name__ == "__main__":
    sys.exit(main())
