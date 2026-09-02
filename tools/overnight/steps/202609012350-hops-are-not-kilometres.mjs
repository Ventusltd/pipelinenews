/**
 * Step: the connections panel says a kilometre is not a connection, and points at the measurement that is.
 *
 * The panel measures straight-line kilometres and says so. What it could
 * not say, until 1 September 2026, was that there is another measurement -
 * because there was not one. The Atlas now traverses the published
 * node/branch model and counts circuits, and the two answers are different
 * questions rather than better and worse versions of one.
 *
 * The figures in the note are read from the product, not chosen for effect:
 * the longest published circuit runs 223.195 km of route between its two
 * ends, so "far apart" and "not connected" are plainly independent.
 *
 * One string in one file. No payload, no render-time network call, and
 * every existing caveat kept verbatim - this only adds.
 */

const CARTRIDGE = 'hops-are-not-kilometres';

export default {
  id: 'hops-are-not-kilometres',
  cartridge: CARTRIDGE,
  atlasTarget: 'ported',

  scope: "the connections panel says a kilometre is not a connection, and points at the measurement that is",

  note: "Two sites a few kilometres apart can share no published circuit, and the two ends of ONE published circuit can be over 200 km of route apart - the longest, PEMB41-WALH41, is 223.195 km, and 17 of 1,392 circuits exceed 100 km. Lengths read from circuits[].ohl_km + cable_km. The panel still reports straight-line kilometres, which is what it measures; MAP now reports the count of published circuits, which is what decides whether two sites are connected at all.",

  brings: [
    `tools/intelligence/cartridges/${CARTRIDGE}/make_cartridge.py`,
    `tools/intelligence/cartridges/${CARTRIDGE}/cartridge.json`,
  ],

  /* Regenerated against the parent this run actually picked. If a release
     landed in between and moved the anchor, make_cartridge.py fails here
     with the anchor's own name attached, before the builder is asked to
     apply something that no longer matches. */
  async prepare({ parent, run, python }) {
    const r = run(python, [
      `tools/intelligence/cartridges/${CARTRIDGE}/make_cartridge.py`,
      '--parent', parent,
    ], { allowFail: true });
    if (r.status !== 0) {
      throw new Error(`the cartridge could not be generated against ${parent}: ${r.out.slice(-600)}`);
    }
  },
};
