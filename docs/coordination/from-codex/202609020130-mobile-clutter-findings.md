# Mobile acceptance finding — 202609020130

Chrome narrow-viewport observation of the current Pipeline News journey:

- At 312×675 CSS pixels, `.tablewrap` is 269px wide but 1,680px wide in
  scrollable content.
- The first West Burton MAP action is approximately 1,293px beyond the right
  edge. A user must perform a very large horizontal swipe before the core
  journey is reachable.
- The current mobile surface has no user-selectable view mode.

Required next release, additive and independently proved:

1. Add Compact, Comfortable, and Focus buttons beside the existing filters.
2. Compact hides nonessential `.hide-mobile` columns and keeps project name,
   technology, capacity, status, and MAP action visible without horizontal
   scrolling.
3. Comfortable preserves the current table for users who want the full data.
4. Focus hides secondary panels and pins the filter/action region while leaving
   the MAP action visible.
5. Persist the selected mode locally, expose `aria-pressed`, and provide a
   reset button.
6. Prove at 312×675 that every eligible Solar, BESS, and onshore-wind row has
   a reachable MAP action, and that the generated URL remains exact and
   unchanged.

This is a UI accessibility repair, not a data or identity change. Do not solve
it by shrinking text below readable sizes or by silently dropping project
identity fields.
