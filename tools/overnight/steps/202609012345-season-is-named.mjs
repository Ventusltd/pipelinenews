/**
 * Step: the strip says a rating without its season is ambiguous, and that the Atlas never sums them.
 *
 * A rating quoted without its season is ambiguous, and the ambiguity is
 * not symmetric: winter is the more generous number on 1,273 of the 1,276
 * circuits that publish both. A reader who sees one figure and assumes it
 * holds all year is assuming the most favourable case.
 *
 * Pipeline News quotes no MVA rating itself - that was checked before this
 * was written, across every html, mjs and css file in the parent release -
 * so there is nothing here to correct. What there is, is a reader who
 * clicks through to ratings that ARE quoted, and who should arrive knowing
 * that each one names its season and that they are never added together.
 *
 * One string in one file. No payload, no render-time network call, and
 * every existing caveat kept verbatim - this only adds.
 */

const CARTRIDGE = 'season-is-named';

export default {
  id: 'season-is-named',
  cartridge: CARTRIDGE,
  atlasTarget: 'ported',

  scope: "the strip says a rating without its season is ambiguous, and that the Atlas never sums them",

  note: "Pipeline News quotes no MVA rating at all - verified by searching every html, mjs and css in the parent release. What it can do is tell the reader what the ratings in the Atlas mean: NESO publishes a winter rating for all 1,392 circuits and a summer rating for 1,276, and summer differs from winter on 1,081 of those. Winter is the more generous figure on 1,273 of them, which is why a rating quoted without its season flatters the network.",

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
