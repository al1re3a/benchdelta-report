const {test}=require('node:test');const assert=require('node:assert/strict');
const {searchRows,sortRows}=require('../web/report.js');
test('search is case insensitive and handles numbers',()=>assert.equal(searchRows([{name:'Build',n:42}],'build').length,1));
test('numeric sort is numeric and immutable',()=>{const rows=[{n:10},{n:2}];assert.deepEqual(sortRows(rows,'n'),[{n:2},{n:10}]);assert.equal(rows[0].n,10)});
test('descending and empty search',()=>{assert.equal(sortRows([{x:1},{x:2}],'x',true)[0].x,2);assert.deepEqual(searchRows([],'x'),[])});
