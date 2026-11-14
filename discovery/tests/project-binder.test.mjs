// Tests: register-driven project binder. Names and refs are real REPD Q3 2026 entries.
// run: node --test discovery/tests/project-binder.test.mjs
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildGazetteer, bindItem, nameForms, reportedMw} from '../project-binder.mjs';

const P = (repd_ref, name, technology, county, operator, capacity_mw, status = 'Awaiting Construction') => ({repd_ref, name, technology, county, operator, capacity_mw, status});
const projects = [
  P('1621', 'Solar Farm', 'solar', 'Dorset', 'Unknown', 5, 'Abandoned'),
  P('5482', 'York Solar Farm', 'solar', 'North Yorkshire', 'Hive Energy', 30),
  P('14550', 'Dean Moor Solar Farm & Battery Storage', 'solar', 'Cumbria', 'FVS Dean Moor Ltd', 150),
  P('13599', 'Beacon Fen Energy Park', 'solar', 'Lincolnshire', 'Low Carbon Limited', 400),
  P('13600', 'Beacon Fen Energy Park', 'bess', 'Lincolnshire', 'Low Carbon Limited', 600),
  P('5967', 'Kells Solar Farm', 'solar', 'Co. Derry / Londonderry', 'Elgin Energy EsCo', 25, 'Revised'),
  P('6012', 'Kells Solar Farm', 'solar', 'Co. Antrim', 'Elgin Energy EsCo', 50, 'Application Submitted'),
  P('11974', 'Hessay Solar Farm', 'solar', 'North Yorkshire', 'Recurrent Energy', 40),
  P('11034', 'Coalburn Energy - Battery Storage', 'bess', 'Strathclyde', 'Alcemi Storage Development Limited', 500, 'Operational'),
  P('12206', 'Coalburn II Energy Storage Facility - Battery Storage Facility', 'bess', 'Lanarkshire', 'Alcemi Storage Development Limited', 1000, 'Under Construction'),
  P('8100', 'Camblesforth Solar Farm', 'solar', 'North Yorkshire', 'Enray Power', 49.9),
  P('21493', 'Camblesforth Solar Farm', 'bess', 'North Yorkshire', 'Enray Power', 10),
  P('9050', 'Bypass Solar Farm', 'solar', 'Somerset', 'Somebody', 5),
  P('3000', 'Unknown Capacity Solar Park', 'solar', 'Kent', 'Somebody', null),
];
const g = buildGazetteer(projects);
const bind = (headline, extra = {}) => bindItem({headline, ...extra}, g);

test('a project literally named "Solar Farm" is never an identity', () => {
  assert.equal(bind('Solar farm plan rejected by council').outcome, 'NO_MATCH');
  assert.equal(nameForms('Solar Farm').length, 1);
});

test('place names are not projects: "near York village" stays unmatched, "bypass" too', () => {
  assert.notEqual(bind('Solar farm planned for site near York village').outcome, 'NAME_MATCH_REVIEW');
  assert.notEqual(bind('Plans revealed for major new solar farm near Burton Joyce bypass').outcome, 'NAME_MATCH_REVIEW');
});

test('a full or stripped register name in the headline is queued for review, not published', () => {
  const r = bind('Dean Moor Solar Farm development consent decision announced');
  assert.equal(r.outcome, 'NAME_MATCH_REVIEW');
  assert.equal(r.review_candidate.repd_ref, '14550');
  assert.equal(r.review_candidate.gg_project_id, 'GG2050-REPD-14550');
  // NL-019: a name match is a review item, never a published binding.
  assert.equal(r.publish, false);
  assert.equal(r.repd_ref, null);
  assert.equal(r.gg_project_id, null);
  assert.equal(bind('Triple Point acquires 49.2MW Hessay Solar project from Recurrent Energy').review_candidate.repd_ref, '11974');
});

test('the most specific name wins: "Coalburn II" is not "Coalburn"', () => {
  assert.equal(bind('Meadow Partners acquires ground lease for Coalburn II Battery Energy Storage System').review_candidate.repd_ref, '12206');
  assert.equal(bind('Zenobe closes financing for 200-MW Coalburn BESS project in Scotland').review_candidate.repd_ref, '11034');
});

test('co-located components: technology cue picks the component, otherwise generation is primary and storage related', () => {
  const plain = bind('Beacon Fen Energy Park development consent decision announced');
  assert.equal(plain.review_candidate.repd_ref, '13599');
  assert.match(plain.reason, /DEFAULT_GENERATING_COMPONENT/);
  assert.deepEqual(plain.related_components.map(c => c.repd_ref), ['13600']);
  assert.equal(bind('Beacon Fen Energy Park battery storage approved').review_candidate.repd_ref, '13600');
});

test('two developments with one name abstain unless county corroborates', () => {
  const r = bind('Kells solar farm plan setback after archaeological find');
  assert.equal(r.outcome, 'AMBIGUOUS');
  assert.deepEqual(r.candidates.map(c => c.repd_ref), ['5967', '6012']);
  assert.equal(bind('Kells solar farm plan setback', {snippet: 'The site in Co. Antrim ...'}).review_candidate.repd_ref, '6012');
});

test('a name only in the snippet is related context, never a primary binding', () => {
  const r = bind('Lincolnshire farmer says turning to solar is only way to survive', {snippet: 'The Beacon Fen Energy Park in nearby Heckington was the latest to be approved.'});
  assert.equal(r.outcome, 'CONTEXT_ONLY');
  assert.equal(r.repd_ref, null);
});

test('foreign conflict rejects unless the item also carries a UK signal', () => {
  assert.equal(bind('Hessay Solar project lessons for United States developers').outcome, 'REJECT');
  assert.equal(bind('UK Hessay Solar project lessons for United States developers').outcome, 'NAME_MATCH_REVIEW');
});

test('reported MW is checked against the register; blank register capacity is unknown, not zero', () => {
  assert.deepEqual(reportedMw('new 1,900MW scheme and 25 MWh battery, 1.2GW total'), [1900, 1200]);
  assert.equal(bind('Government approves new 1,900MW Camblesforth solar farm').capacity_check.status, 'CONFLICT');
  assert.equal(bind('Triple Point acquires 49.2MW Hessay Solar project').capacity_check.status, 'CONSISTENT_DC_AC_BAND');
  const unknown = bind('Unknown Capacity Solar Park reaches 20MW milestone');
  assert.equal(unknown.capacity_check.status, 'UNKNOWN');
  assert.equal(unknown.capacity_check.register_mw, null);
});

test('a previous site name kept as an alias after a register rename still binds', () => {
  const renamed = [P('12820', 'Camsiscan Farm, Craigie - Kilmarnock South Battery Energy Storage System', 'bess', 'Ayrshire', 'Noriker Power Limited / CIP', 49.9)];
  const before = buildGazetteer(renamed);
  const after = buildGazetteer(renamed, {extraAliases: new Map([['12820', ['Camsiscan Farm, Craigie - Battery Energy Storage System']]])});
  const item = {headline: 'Camsiscan Farm Craigie battery energy storage system approved'};
  assert.equal(bindItem(item, after).review_candidate.repd_ref, '12820');
  // The four Q2->Q3 2026 site renames all keep their leading site name, so the first
  // name segment ("Camsiscan Farm") binds even without the alias.
  assert.equal(bindItem(item, before).review_candidate.repd_ref, '12820');
  const exotic = buildGazetteer([P('1', 'Brand New Name Solar Farm', 'solar', 'Kent', 'X', 10)], {extraAliases: new Map([['1', ['Old Hilltop Solar Farm']]])});
  assert.equal(bindItem({headline: 'Old Hilltop Solar Farm approved'}, exotic).review_candidate.repd_ref, '1');
});

test('no outcome of the binder publishes a REPD ref (NL-019 review-queue rule)', () => {
  const headlines = ['Dean Moor Solar Farm development consent decision announced', 'Kells solar farm plan setback',
    'Beacon Fen Energy Park battery storage approved', 'Solar farm plan rejected by council', 'UK Hessay Solar project lessons for United States developers'];
  for (const headline of headlines) {
    const r = bind(headline, {snippet: 'The site in Co. Antrim, Cumbria, Lincolnshire ...'});
    assert.equal(r.publish, false);
    assert.equal(r.repd_ref, null);
    assert.equal(r.gg_project_id, null);
  }
});
