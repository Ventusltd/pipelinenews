import test from 'node:test';import assert from 'node:assert/strict';import {matchesGeometry} from './geometry-filter.mjs';
test('usable coordinates include true zeroes while missing, invalid and out-of-range points stay reviewable',()=>{
 const point={geometry_status:'valid',longitude:0,latitude:0};assert.equal(matchesGeometry(point,'located'),true);
 for(const change of [{geometry_status:'invalid'},{longitude:null},{latitude:NaN},{longitude:181},{latitude:91}])assert.equal(matchesGeometry({...point,...change},'missing'),true);
 assert.equal(matchesGeometry({},'all'),true);assert.throws(()=>matchesGeometry(point,'guess'));
});
