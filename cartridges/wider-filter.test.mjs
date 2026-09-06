import test from 'node:test';import assert from 'node:assert/strict';import {filterWiderRows} from './wider-filter.mjs';
test('filter matches grouped references and accent-insensitive multi-field terms without changing rows',()=>{
 const rows=[{n:'Café Green',o:'Operator A',repd_records:[{ref:'10'},{ref:'11'}]},{n:'Green',o:'Operator B',ref:'12'}],before=JSON.stringify(rows);
 assert.equal(filterWiderRows(rows,'CAFE 11')[0],rows[0]);assert.equal(filterWiderRows(rows,'green operator b')[0],rows[1]);assert.equal(filterWiderRows(rows,'   '),rows);assert.equal(JSON.stringify(rows),before);
 assert.deepEqual(filterWiderRows(rows,'[.*]'),[]);
});
