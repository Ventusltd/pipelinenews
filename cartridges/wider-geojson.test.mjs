import test from 'node:test';import assert from 'node:assert/strict';import {widerGeoJSON} from './wider-geojson.mjs';
test('grouped export preserves distinct statuses and observations without duplicating site capacity',()=>{
 const row={n:'Site',c:.3,ll:[-2,53],repd_records:[{ref:'1',status:'operational'},{ref:'2',status:'awaiting construction'}]};
 const data=widerGeoJSON([row],(ref,label)=>ref==='1'&&label==='GRID'?0:undefined);
 assert.equal(data.features.length,1);assert.equal(data.features[0].properties.capacity_mw,.3);assert.deepEqual(data.features[0].properties.statuses,['operational','awaiting construction']);
 assert.deepEqual(data.features[0].properties.observations,[{repd_ref:'1',grid_km:0,sub_km:null},{repd_ref:'2',grid_km:null,sub_km:null}]);assert.equal(data.features[0].id,undefined);
});
test('identity-less or unlocated sites remain explicit and no fake point or reference is fabricated',()=>{
 const feature=widerGeoJSON([{n:'Unknown',ll:[null,null]}],()=>NaN).features[0];assert.equal(feature.geometry,null);assert.deepEqual(feature.properties.repd_refs,[]);assert.deepEqual(feature.properties.observations,[]);
});
