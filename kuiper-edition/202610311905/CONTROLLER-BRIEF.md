# Controller brief (C1..C5), Kuiper edition 202610311905

You are a controller (Claude Fable 5.1) in the swarm described in BRIEF.md (read it first). You own four
worker files under workers/. Your job is verification first, synthesis second. Clones are read only.

## 1. Verify every key
Write a small script (python3 -I or bash) in /tmp that parses every `KEY:` line of your four worker files
(`<repo>@<sha> <path>:<line>[-<line>]`; some history workers also write `HEAD-KEY:`), and for each:
- confirms the sha is reachable in the clone (`git -C /home/user/estate/<repo> cat-file -e <sha>^{commit}`;
  pipelinenews is at /home/user/pipelinenews);
- extracts the file at that commit (`git -C <clone> show <sha>:<path>`) and checks that the first
  non-blank line of the worker's QUOTE block appears within the cited line range; if it appears within
  ±3 lines instead, mark SHIFTED and record the actual line; otherwise UNVERIFIED.
Report `keys verified N of M` per worker and overall. Spot-check at least three numeric claims per worker
by re-running the cited command. Never "as expected".

## 2. Write chapters/C<N>-<slug>.md
1,500 to 3,000 words, plain prose, for an engineer who did not watch the swarm. Sections:
- What this part of the estate is (two paragraphs).
- The best lines, ranked, each with its KEY, a short verbatim quote (≤6 lines) and why it matters.
- The patterns these lines share (names, keyed examples).
- History (keyed by SHA): cadence, storms, turning points, rollbacks.
- Gridatlas and datacentre relevance.
- Defects and drift found by the workers: each one marked CONFIRMED (you re-ran it), PLAUSIBLE
  (consistent with the file but not re-run) or UNVERIFIED. These are candidates for the owner, not claims.
- What the new Kuiper edition should carry from this chapter (which lines go on the belt).
- One next command.

## 3. Write chapters/C<N>-register.tsv
Tab separated, header exactly:
worker	finding	repo	commit	path	line_start	line_end	title	pattern	verified	quote
One row per keyed finding you reviewed (not per KEY line: one row per finding, using its primary key).
`verified` is CONFIRMED, SHIFTED or UNVERIFIED. `quote` is the first quoted line, ≤160 characters, tabs
and newlines removed. `title` ≤80 characters. Only CONFIRMED and SHIFTED rows will be placed on the belt.

## 4. Write chapters/C<N>-nl006.md
The public message for neural-link issue NL-006, in PROTOCOL.md envelope form, header line
`[KUIPER-C<N> → ALL] [NL-006] [<UTC time>]`, TYPE: FINDING, at most 350 words: keys verified N of M, the
five best lines (repo path:line, one clause each), the defects as candidates with their status, and one
ACTION REQUESTED. Public facts only; no local paths, no private repository names, no personal data.
The harness posts it; do not post to GitHub yourself.

## 5. Reply
Reply to the harness with a 10-line summary: keys verified N of M per worker, the three strongest lines,
the defects you CONFIRMED, and the three file paths you wrote.
