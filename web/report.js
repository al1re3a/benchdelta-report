function searchRows(rows, query) {
  const term = query.toLocaleLowerCase();
  return rows.filter(row => Object.values(row).some(value => String(value ?? '').toLocaleLowerCase().includes(term)));
}
function sortRows(rows, key, descending = false) {
  return [...rows].sort((a,b) => {
    const x=a[key], y=b[key];
    const result=typeof x==='number' && typeof y==='number' ? x-y : String(x ?? '').localeCompare(String(y ?? ''));
    return descending ? -result : result;
  });
}
if (typeof module !== 'undefined') module.exports={searchRows,sortRows};
if (typeof document !== 'undefined') {
  const payload=JSON.parse(document.getElementById('payload').textContent);
  let sortKey=payload.columns[0], descending=false;
  const body=document.querySelector('tbody');
  function draw() {
    body.replaceChildren();
    const rows=sortRows(searchRows(payload.rows,document.querySelector('input').value),sortKey,descending);
    document.getElementById('count').textContent=`${rows.length} / ${payload.rows.length}`;
    for(const row of rows){const tr=document.createElement('tr');for(const key of payload.columns){const td=document.createElement('td');td.textContent=row[key] ?? '—';tr.append(td);}body.append(tr);}
  }
  document.querySelector('input').addEventListener('input',draw);
  document.querySelectorAll('th button').forEach(button=>button.addEventListener('click',()=>{descending=sortKey===button.dataset.key?!descending:false;sortKey=button.dataset.key;draw();}));
  draw();
}
