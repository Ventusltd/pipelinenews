import test from 'node:test';
import assert from 'node:assert/strict';
import {widerMetricActions} from './wider-grid-actions.mjs';
test('grouped identities retain separate distances and never borrow the first observation', () => {
  const html = widerMetricActions({repd_records:[{ref:'10'},{ref:'11'},{ref:'10'}]}, {'10':{k:0}});
  assert.equal((html.match(/data-repd-metric=/g)||[]).length,2);
  assert.match(html,/GRID 10 <b>0.00/); assert.match(html,/GRID 11 unavailable/);
});
test('missing identities and invalid distances remain explicit', () => {
  assert.match(widerMetricActions({ref:''},{'':{k:1}}),/No exact REPD identity/);
  for(const k of [-1,NaN,Infinity,'2',null]) assert.match(widerMetricActions({ref:1},{1:{k}}),/GRID unavailable/);
  assert.match(widerMetricActions({ref:1},null),/source unavailable/);
});
test('station labels escape source content and carry the engineering limit', () => {
  const html=widerMetricActions({ref:2},{2:{k:1.237,n:'<img onerror="bad">'}},'SUB');
  assert.match(html,/1.24/); assert.match(html,/&lt;img/); assert.doesNotMatch(html,/<img/);
  assert.match(html,/not a cable route, connection offer or headroom/);
});
