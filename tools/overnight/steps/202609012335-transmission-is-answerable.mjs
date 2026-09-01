/**
 * Step: the GRID strip stops ending on what cannot be answered.
 *
 * The strip has ended, correctly, on a refusal - "not a cable route, and
 * not headroom - fault level and thermal headroom need DNO network data
 * such as source impedance and a connection study". Every word of that is
 * still true and none of it is removed.
 *
 * But it was the LAST thing the reader was told, and on 1 September 2026 it
 * stopped being the whole story. The Atlas now reads NESO's published
 * transmission network and answers, for the site a project declares: the
 * circuits and transformers that land there per voltage; their ratings in
 * every season the operator publishes, never summed; how many published
 * circuits away a neighbour is; and where the project's own output would
 * flow on a declared DC model. So the strip gains one clause naming what
 * MAP now opens, and keeps every caveat it had.
 *
 * This is the first Pipeline News release of the night shift, and the
 * first to be cut by a runner rather than by hand.
 */

const CARTRIDGE = 'transmission-is-answerable';

export default {
  id: 'transmission-is-answerable',
  cartridge: CARTRIDGE,
  atlasTarget: 'ported',

  scope: 'the GRID + SUB strip names what the published transmission network can now answer',

  note: 'Every refusal is kept verbatim - distance is not a route, a rating is not headroom, and the DC model is not a loading because what is already flowing is published nowhere. What is added is only what is answerable from a published source: NESO ETYS 2025 Appendix B, via Ventusltd/data-grid-gb.',

  brings: [
    `tools/intelligence/cartridges/${CARTRIDGE}/make_cartridge.py`,
    `tools/intelligence/cartridges/${CARTRIDGE}/cartridge.json`,
  ],

  /* The cartridge is regenerated against the ACTUAL parent this run picked,
     not the one it was written against. If the anchor has moved because a
     release landed in between, make_cartridge.py fails here with the
     anchor's name attached - before the builder is asked to apply it. */
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
