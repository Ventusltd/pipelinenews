import test from 'node:test';import assert from 'node:assert/strict';import {sortWiderRows} from './wider-order.mjs';
test('shortest listed distance uses all grouped identities and keeps unavailable rows last',()=>{
 const rows=[{n:'Missing',ref:'9'},{n:'Grouped',repd_records:[{ref:'1'},{ref:'2'}]},{n:'Single',ref:'3'}],before=JSON.stringify(rows);
 const grid={'1':5,'2':0,'3':2};assert.deepEqual(sortWiderRows(rows,'grid_asc',(ref,label)=>{assert.equal(label,'GRID');return grid[ref];}).map(row=>row.n),['Grouped','Single','Missing']);
 assert.equal(JSON.stringify(rows),before);
});
test('capacity, name, ties and missing values are deterministic and neutral',()=>{
 const rows=[{n:'Beta',ref:'2',c:3},{n:'Alpha',ref:'1',c:3},{n:'Missing',ref:'3',c:NaN}];
 assert.deepEqual(sortWiderRows(rows,'capacity_desc').map(row=>row.n),['Alpha','Beta','Missing']);
 assert.deepEqual(sortWiderRows(rows,'sub_asc',()=>undefined).map(row=>row.n),['Alpha','Beta','Missing']);assert.throws(()=>sortWiderRows(rows,'strong'));
});
