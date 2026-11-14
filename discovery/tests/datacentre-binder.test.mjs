// Tests: DATA_CENTRES topic binds to released GridAtlas data-centre register site ids.
// run: node --test discovery/tests/datacentre-binder.test.mjs
// Optional: PN_DC_REGISTER=<path to gridatlas data/uk_datacentre_pipeline_202610312133.geojson>
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyRegisterBytes, buildSites, bindDataCentreItem, DC_REGISTER_PIN} from '../datacentre-binder.mjs';

// Features copied (fields trimmed) from the released register 202610312133.
const feature = (id, name, operator, status, precision, coordinates, notes = []) => ({type: 'Feature', id,
  geometry: coordinates ? {type: 'Point', coordinates} : null,
  properties: {id, name, operator, status, aliases: [], notes, location: {precision, local_authority: null},
    it_load_mw: {value: null}, grid_connection_mw: {value: null}, unclassified_mw: {value: null}, evidence_urls: []}});
const fixture = {type: 'FeatureCollection', features: [
  feature('dcuk-040ed031c3acf5bd', 'Cobalt Park Data Centres', 'Cobalt Park Data Centres; Nscale (GPU deployment); Stargate UK', 'announced', 'settlement', [-1.51, 55.02], ['place: Cobalt Park, Wallsend, North Tyneside']),
  feature('dcuk-c965f50f64d1cc7b', 'Wester Hermiston Data Centre Campus', null, 'announced', 'settlement', [-3.3, 55.92], ['place: Wester Hermiston, Edinburgh']),
  feature('dcuk-fbd3c5ebf03f1306', 'Virtus London8', 'Virtus', 'operational', 'exact_site', [-0.3, 51.5]),
  feature('dcuk-b3138b4825480353', 'Ark Data Centres', 'Ark Data Centres', 'operational', 'exact_site', [-0.8, 51.3]),
  feature('dcuk-0000000000000001', 'Ark Data Centres', 'Ark Data Centres', 'operational', 'exact_site', [-1.8, 51.5]),
  feature('dcuk-0000000000000000', 'Test Nowhere Data Centre', 'Example', 'in_planning', 'unknown', null),
]};
const bytes = Buffer.from(JSON.stringify(fixture));
const pin = {...DC_REGISTER_PIN, sha256: createHash('sha256').update(bytes).digest('hex'), sites: 6};
const register = buildSites(verifyRegisterBytes(bytes, pin));
const bind = (headline, extra = {}) => bindDataCentreItem({headline, ...extra}, register);

test('the register is refused unless its digest and site count match the pin', () => {
  assert.throws(() => verifyRegisterBytes(bytes), /does not match pin/);
  assert.throws(() => verifyRegisterBytes(bytes, {...pin, sites: 226}), /pin says 226/);
});

test('a named site in a data-centre headline is queued for review as its dc_site_id, never a REPD ref', () => {
  const r = bind('Plans for Wester Hermiston data centre campus go to councillors');
  assert.equal(r.outcome, 'SITE_NAME_MATCH_REVIEW');
  assert.equal(r.review_candidate.dc_site_id, 'dcuk-c965f50f64d1cc7b');
  assert.equal(r.category, 'DATA_CENTRE');
  assert.equal(r.publish, false, 'NL-019: a named site is queued for review, not published');
  assert.equal(r.dc_site_id, null);
  assert.equal(r.repd_ref, null);
  assert.equal(r.map_status, 'APPROXIMATE');
  assert.equal(bind('Virtus London8 data centre expansion approved').map_status, 'EXACT_SITE');
});

test('only the existing sector rule admits an item to the topic', () => {
  assert.equal(bind('Cobalt Park office block sold').outcome, 'NOT_DATA_CENTRE_TOPIC');
  assert.equal(bind('Cobalt Park data centres to host Stargate UK GPUs').review_candidate.dc_site_id, 'dcuk-040ed031c3acf5bd');
});

test('an operator alone (Ark runs 4 listed sites) or a place alone is not a site identity', () => {
  const op = bind('Ark Data Centres plans new data centre');
  assert.equal(op.outcome, 'OPERATOR_ONLY');
  assert.equal(op.dc_site_id, null);
  assert.equal(bind('More data centres approved for west London').outcome, 'TOPIC_ONLY');
});

test('missing geometry stays NO MAP with no coordinates invented', () => {
  const r = bind('Test Nowhere Data Centre approved');
  assert.equal(r.outcome, 'SITE_NAME_MATCH_REVIEW');
  assert.equal(r.map_status, 'NO_MAP');
  assert.equal(r.latitude, null);
  assert.equal(r.longitude, null);
});

test('the released register, when present, matches the pin (226 sites)', {skip: !existsSync(process.env.PN_DC_REGISTER ?? '/nonexistent')}, () => {
  const released = buildSites(verifyRegisterBytes(readFileSync(process.env.PN_DC_REGISTER)));
  assert.equal(released.sites.length, 226);
  assert.equal(released.sites.filter(site => site.map_status === 'NO_MAP').length, 1);
  assert.equal(bindDataCentreItem({headline: 'Wester Hermiston data centre campus plans lodged'}, released).review_candidate.dc_site_id, 'dcuk-c965f50f64d1cc7b');
});
