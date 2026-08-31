"""Generate cartridge.json: stop measuring a phone's screen with 100vh.

WHY THIS ONE FIRST
------------------
"the map feature from pipelinenews doesnt load on iphone", and then: build for
the phone first and let it scale up, because the link that reaches most readers
arrives in a WhatsApp message.

THE FAULT
---------
The desktop shell is a fixed-height flex app:

    body{display:flex;height:100vh;overflow:hidden}

and the mobile block turns it back into a document:

    @media(max-width:768px){ body{display:block;overflow:auto} }

It overrides display and overflow. It never overrides HEIGHT. So on a phone the
body is still exactly 100vh tall.

On iOS, 100vh is the viewport with the browser chrome HIDDEN -- Safari's own
definition, unchanged since it shipped. While the toolbar is showing, which is
most of the time and always when you first arrive from a link, 100vh is taller
than what you can see. A fixed-height scrolling body inside a shorter window is
the whole family of iOS complaints at once: the last rows sit under the
toolbar, the page scrolls in two places that disagree, and rubber-banding
fights the inner scroller.

.paper is the same mistake at 65vh, and .tablewrap at 65vh.

THE FIX
-------
On a phone the body should be a document, not a fixed-height application: let
it grow and let the browser scroll it. min-height:100svh keeps the full-screen
feel -- svh is the SMALL viewport, the one that is correct while the toolbar is
showing, so it never promises more room than exists.

For the panels that genuinely want a viewport fraction, dvh: the DYNAMIC
viewport, which tracks the toolbar as it hides and shows.

Both are already the house style: orientation.css uses dvh in seven places.
This brings the frozen shell into line with the repair that was made around it.

Every declaration is written twice, vh then the modern unit, so a browser that
does not know dvh keeps exactly today's behaviour.

    python make_cartridge.py --parent 202608312145-pipelinenews
"""

import argparse, io, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(HERE))))
RELEASES = os.path.join(REPO, "releases")
CSS = "assets/202608270055-v8-fast.css"


def read(p):
    return io.open(p, encoding="utf-8", newline="").read()


def anchor(text, needle, label):
    n = text.count(needle)
    if n != 1:
        raise SystemExit("anchor %r occurs %d times, expected 1:\n%s"
                         % (label, n, needle[:160]))
    return needle


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--parent", default="202608312145-pipelinenews")
    a = ap.parse_args()
    css = read(os.path.join(RELEASES, a.parent, CSS))

    edits = []

    # 1. The desktop shell keeps its fixed height; only the unit is modernised.
    edits.append({
        "label": "the desktop shell measures the viewport that is actually visible",
        "from": anchor(css, "body{display:flex;height:100vh;overflow:hidden;font-size:13px}",
                       "body"),
        "to": ("body{display:flex;height:100vh;height:100dvh;overflow:hidden;"
               "font-size:13px}")})

    # 2. On a phone, be a document. This is the fault.
    edits.append({
        "label": "on a phone the body grows instead of being pinned to 100vh",
        "from": anchor(css, "@media(max-width:768px){body{display:block;overflow:auto}",
                       "mobile body"),
        "to": ("@media(max-width:768px){body{display:block;overflow:auto;"
               "height:auto;min-height:100vh;min-height:100svh}")})

    # 3. The newspaper pane.
    edits.append({
        "label": "the newspaper pane tracks the toolbar instead of ignoring it",
        "from": anchor(css, ".paper{height:min(68vh,760px);min-height:520px;"
                            "overflow:auto;overscroll-behavior:contain}", "paper"),
        "to": (".paper{height:min(68vh,760px);height:min(68dvh,760px);"
               "min-height:520px;overflow:auto;overscroll-behavior:contain}")})

    edits.append({
        "label": "and on a phone too",
        "from": anchor(css, ".paper{height:65vh;min-height:480px}", "mobile paper"),
        "to": ".paper{height:65vh;height:65dvh;min-height:480px}"})

    # 4. The table pane.
    edits.append({
        "label": "the table pane likewise",
        "from": anchor(css, ".tablewrap{background:var(--panel);border:1px solid "
                            "var(--soft);overflow:auto;max-height:65vh}", "tablewrap"),
        "to": (".tablewrap{background:var(--panel);border:1px solid var(--soft);"
               "overflow:auto;max-height:65vh;max-height:65dvh}")})

    man = {
        "key": "phone_first_heights",
        "summary": ("The body is no longer pinned to 100vh on a phone, and the "
                    "panes that want a viewport fraction use dvh, which tracks "
                    "the browser toolbar."),
        "modifies_existing_dashboard": True,
        "modification_note": (
            "The mobile block overrode display and overflow but not height, so a "
            "phone kept a body exactly 100vh tall -- and on iOS 100vh is the "
            "viewport with the chrome hidden, which is taller than what you can "
            "see whenever the toolbar is showing. The body now grows, with "
            "min-height:100svh for the full-screen feel; .paper and .tablewrap "
            "use dvh. Every declaration is written vh-then-modern, so a browser "
            "without dvh keeps today's behaviour exactly."),
        "repairs": {"assets": [{"path": CSS, "edits": edits}]},
    }

    out = os.path.join(HERE, "cartridge.json")
    io.open(out, "w", encoding="utf-8", newline="").write(
        json.dumps(man, ensure_ascii=False, indent=2) + "\n")
    print("wrote cartridge.json")
    print("  css repairs  %d" % len(edits))
    return 0


if __name__ == "__main__":
    sys.exit(main())
