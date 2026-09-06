import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildRssView,refreshRss,articleIdentity,LIVE_RSS_URL} from './bbc-rss-pipeline-model.mjs';
const now=Date.parse('2026-09-06T03:00:00Z');
const payload=()=>({schema:'pipelinenews.bbc-rss.v1',status:'ok',checked_at:'2026-09-06T02:00:00Z',last_success_at:'2026-09-06T02:00:00Z',feeds:[{url:'https://feeds.bbci.co.uk/news/england/oxford/rss.xml',status:'ok'}],items:[{id:'bbc:c4gmkezn4nlo',url:'https://www.bbc.co.uk/news/articles/c4gmkezn4nlo',headline:'Solar proposal',repd_ref:'12345',eligible_for_project_signal:true}]});
const projects=JSON.parse(readFileSync(new URL('../data/provisional/project-register.json',import.meta.url))).projects;
const evidence=[JSON.parse(readFileSync(new URL('../discovery/inbox/202609060208-cearn-project-evidence.json',import.meta.url)))];

test('freshness uses last successful collection, not a recent failed attempt',()=>{
  const source=payload();assert.equal(buildRssView(source,{now}).freshness,'FRESH');
  source.checked_at='2026-09-06T03:00:00Z';source.last_success_at='2026-09-05T23:00:00Z';source.status='failed';source.feeds[0].status='failed';
  const failed=buildRssView(source,{now});assert.equal(failed.freshness,'STALE');assert.equal(failed.collection,'FAILED');assert.equal(failed.items.length,1);
  source.last_success_at='bad date';assert.equal(buildRssView(source,{now}).freshness,'UNKNOWN');
  source.last_success_at='2026-09-07T02:00:00Z';assert.equal(buildRssView(source,{now}).freshness,'UNKNOWN');
});
test('partial feed failure is explicit and does not erase useful headlines',()=>{
  const source=payload();source.feeds.push({url:'another feed',status:'failed'});source.status='partial';
  const view=buildRssView(source,{now});assert.equal(view.collection,'PARTIAL');assert.equal(view.feed_success,1);assert.equal(view.feed_total,2);assert.equal(view.items.length,1);
});
test('deduplicate BBC host and campaign aliases; reject spoofed identities and publisher URLs',()=>{
  const source=payload();source.items.push({...source.items[0],url:'https://www.bbc.com/news/articles/c4gmkezn4nlo?utm_source=feed'}, {...source.items[0],id:'bbc:other'}, {...source.items[0],url:'https://www.bbc.co.uk.evil.test/news/articles/c4gmkezn4nlo'});
  const view=buildRssView(source,{now});assert.equal(view.items.length,1);assert.equal(view.rejected,2);
  assert.equal(articleIdentity('javascript:alert(1)'),null);
  assert.equal(view.items[0].observation.repd_ref,null);assert.equal(view.items[0].observation.eligible_for_project_signal,false);
});
test('Cearn remains pending and Botley West facts cannot become Cearn capacity or cost',()=>{
  const original=JSON.stringify(projects);
  const item=buildRssView(payload(),{now,projects,evidence}).items[0];
  assert.equal(item.observation.name,'Cearn Solar Farm');assert.equal(item.observation.temporary_ref,'9999-REPD-TBC');assert.equal(item.observation.repd_ref,null);
  assert.equal(item.observation.claims.find(claim=>claim.metric==='solar_capacity').value,500);
  assert.equal(item.observation.claims.some(claim=>claim.metric==='project_cost'),false);
  assert.equal(item.observation.related_projects[0].claims.find(claim=>claim.metric==='solar_capacity').value,840);
  assert.equal(JSON.stringify(projects),original);
  const malformed=structuredClone(evidence);malformed[0].claims[0].subject='Botley West';
  assert.throws(()=>buildRssView(payload(),{now,projects,evidence:malformed}),/Cross-project/);
});
test('official identity requires reconciliation and active official source; reported numbers stay reported',()=>{
  const bound=structuredClone(projects);bound[0].identity_status='REPD_BOUND';bound[0].official_repd_ref='23456';bound[0].repd_ref='23456';
  assert.equal(buildRssView(payload(),{now,projects:bound,evidence}).items[0].observation.repd_ref,null);
  const item=buildRssView(payload(),{now,projects:bound,evidence,official:[{repd_ref:'23456'}]}).items[0];
  assert.equal(item.observation.repd_ref,'23456');assert.equal(item.observation.temporary_ref,null);assert.equal(item.observation.status,'OFFICIAL_IDENTITY_VERIFIED');
  assert.equal(item.observation.capacity_basis,'reported only; excluded from official REPD totals');assert.equal(item.observation.eligible_for_project_signal,false);
});
test('network and schema failures retain previous observations; only collected JSON is fetched',async()=>{
  const source=payload();let requested;
  const failed=await refreshRss(source,{now,fetcher:async(url)=>{requested=url;throw Error('offline');}});
  assert.equal(requested,LIVE_RSS_URL);assert.equal(failed.payload,source);assert.equal(failed.live,false);assert.match(failed.view.refresh_error,/offline/);assert.equal(failed.view.items.length,1);
  const invalid=await refreshRss(source,{now,fetcher:async()=>({ok:true,text:async()=>'{"schema":"wrong"}'})});
  assert.equal(invalid.payload,source);assert.match(invalid.view.refresh_error,/Unsupported/);
  const next=payload();next.checked_at='2026-09-06T02:55:00Z';
  const refreshed=await refreshRss(source,{now,fetcher:async()=>({ok:true,text:async()=>JSON.stringify(next)})});
  assert.equal(refreshed.live,true);assert.equal(refreshed.view.checked_at,next.checked_at);
});
