/**
 * Step: the GRID + SUB strip states the limit of the word "nearest".
 *
 * The strip has always said "nearest mapped", which was careful, and it
 * never said how much of the network is unmapped. 384 of 886 published
 * connection points carry no coordinates at all - not because they do not
 * exist but because nobody has mapped them, and the owner product publishes
 * them anyway rather than dropping them, which is the honest choice and the
 * reason the gap is knowable.
 *
 * A distance to the nearest mapped substation is therefore a distance to
 * the nearest substation SOMEONE HAS MAPPED. For most projects those are
 * the same thing. For some they are not, and nothing on the page told the
 * reader which case they were looking at.
 *
 * One string in one file. No payload, no render-time network call, and
 * every existing caveat kept verbatim - this only adds.
 */

const CARTRIDGE = 'mapped-is-not-nearest';

export default {
  id: 'mapped-is-not-nearest',
  cartridge: CARTRIDGE,
  atlasTarget: 'ported',

  scope: "the GRID + SUB strip states the limit of the word \"nearest\"",

  note: "NESO names 886 transmission substations at 132 kV and above; the Atlas locates 502 of them and the owner product publishes the other 384 without coordinates rather than dropping them, saying so in its own join block. So the nearest MAPPED substation may not be the nearest substation, and a reader comparing two projects on that number is comparing coverage as much as geography. Counts read from derived/connection-points.v3.json.",

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
