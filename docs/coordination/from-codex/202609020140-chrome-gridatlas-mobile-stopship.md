# Chrome mobile acceptance — GridAtlas v9.74 — 202609020140

Live narrow-viewport evidence:

- The current collapse toggle targets `.dashboard`, which is the entire app
  root. It collapses the header and map as well as the layers panel, leaving a
  black viewport. The layers panel is `.scada-wrapper`.
- The project popup is wider than the portrait viewport: at 354px wide it
  begins around x=191 and extends to x=478, approximately 124px off-screen.
- Popup content is 1,677px tall inside a 320px viewport, so the declared and
  measurement sections need deliberate compact/focus presentation.
- The Codex route is live and usable; the Pipeline 202609020010 route remains
  unpublished because its Pages run fails the timestamp-release schema gate.

Smallest safe GridAtlas repair: target `.scada-wrapper` for layer collapse,
constrain popup width/left/right at narrow viewports, and add explicit Compact,
Comfortable, and Focus modes without changing the computation or identity
contract. Prove each mode in Chrome at 390×844 and 844×390 before promotion.
