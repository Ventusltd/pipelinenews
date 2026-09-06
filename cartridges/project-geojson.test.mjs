import test from 'node:test';import assert from 'node:assert/strict';
import {projectGeoJSON} from './project-geojson.mjs';
const item=(ref,changes={})=>({repd_ref:ref,gg_project_id:'GG-'+ref,name:'Project',geometry_status:'valid',longitude:-1.2,latitude:51.5,capacity_mw:2,capacity_unit:'MWp',...changes});
test('identity and lon/lat ordering survive while missing geometry remains an explicit record',()=>{
 const input=[item('1'),item('2',{geometry_status:'missing',longitude:null,latitude:null})],original=JSON.stringify(input),data=projectGeoJSON(input,{release:'test'});
 assert.deepEqual(data.features[0].geometry.coordinates,[-1.2,51.5]);assert.equal(data.features[0].id,'GG-1');assert.equal(data.features[0].properties.capacity_unit,'MWp');
 assert.equal(data.features[1].geometry,null);assert.equal(data.metadata.null_geometry,1);assert.equal(data.metadata.records,2);assert.equal(JSON.stringify(input),original);
});
test('invalid coordinates never become zero points, duplicate identities fail the whole export',()=>{
 for(const longitude of [null,'-1.2',NaN,Infinity,181])assert.equal(projectGeoJSON([item('1',{longitude})]).features[0].geometry,null);
 assert.throws(()=>projectGeoJSON([item('1'),item('1')]));assert.throws(()=>projectGeoJSON([item('')]));assert.throws(()=>projectGeoJSON([item('1',{gg_project_id:null})]));
 assert.deepEqual(projectGeoJSON([]).features,[]);assert.equal(projectGeoJSON([]).bbox,undefined);
});
