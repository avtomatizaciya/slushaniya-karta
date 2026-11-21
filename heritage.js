// Публичный список ОКН и адресная связь с темой обсуждения.
const heritage = __HERITAGE__;
const normalizeHeritage = value => value.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
const streetTypes = {
 улица:['улица','улицы','улице','улицей','улицу','ул'], переулок:['переулок','переулка','переулке','переулком','пер'],
 проспект:['проспект','проспекта','проспекте','проспектом','просп','пр'], площадь:['площадь','площади','площадью','пл'],
 набережная:['набережная','набережной','набережную','наб'], проезд:['проезд','проезда','проезде','проездом','пр-д'],
 бульвар:['бульвар','бульвара','бульваре','бул'], шоссе:['шоссе'], парк:['парк','парка','парке']
};
function streetPatterns(street) {
 const [kind,...words] = street.split(' ');
 const forms = [words.join(' '), words.map(w=>w.replace(/ая$/,'ой').replace(/ский$/,'ского')).join(' '),
                words.map(w=>w.replace(/ая$/,'ую')).join(' ')];
 const result = [];
 for (const t of streetTypes[kind]) for (const name of new Set(forms)) result.push(t+' '+name, name+' '+t);
 return result;
}
const heritageStreets = new Map();
for (const row of heritage.records) for (const street of row.streets) {
 if (!heritageStreets.has(street)) heritageStreets.set(street,streetPatterns(street));
}
const heritageCases = new Map();
for (const hearing of D) {
 if (hearing.citywide) continue;
 const subject = ' '+normalizeHeritage([hearing.title,hearing.addr].filter(Boolean).join(' | '))
   .replace(/(ул|пер|просп|пр|пл|наб|бул)\./g,'$1 ').replace(/[,.();:|«»]/g,' | ').replace(/[^а-я0-9|-]+/g,' ')+' ';
 const matched = new Set();
 for (const [street, names] of heritageStreets) if (names.some(name=>subject.includes(' '+name+' '))) matched.add(street);
 if (matched.size) heritageCases.set(hearing.id, heritage.records.filter(row=>row.streets.some(street=>matched.has(street))));
}
function heritageRow(row) {
 const source = heritage.sources[row.source];
 return `<li><strong>${esc(row.name)}</strong><br>${esc(row.address)}<br><small>${esc(row.status)}</small>
 <details><summary>Основание и источник</summary>${row.ensemble?esc(row.ensemble)+'<br>':''}${esc(row.act)}
 <br><a href="${esc(source.url)}" target="_blank" rel="noopener">Областной перечень (XLSX)</a></details></li>`;
}
function heritageBlock(id) {
 const rows = heritageCases.get(id);
 if (!rows) return '';
 const remaining = rows.slice(6);
 const more = remaining.length ? `<details><summary>Ещё записей: ${remaining.length}</summary><ul class="heritage-list">${remaining.map(heritageRow).join('')}</ul></details>` : '';
 return `<details class="heritage-block"><summary>Объекты культурного наследия на упомянутых улицах (${rows.length})</summary>
 <p>Эти улицы названы в материалах обсуждения и в адресах из областного перечня. Попадает ли участок в охранную зону, нужно проверять по её утверждённым границам.</p>
 <ul class="heritage-list">${rows.slice(0,6).map(heritageRow).join('')}</ul>${more}</details>`;
}
const heritageLayer = L.layerGroup();
m.createPane('heritagePoints').style.zIndex=430;
const heritageGroups = new Map();
for (const row of heritage.records) if (row.point) {
 const key = row.point.join(',');
 if (!heritageGroups.has(key)) heritageGroups.set(key,[]);
 heritageGroups.get(key).push(row);
}
function toggleHeritage() {
 $('heritageLegend').hidden=!$('heritageLayer').checked;
 if (!$('heritageLayer').checked) {m.removeLayer(heritageLayer);return}
 if (!heritageLayer.getLayers().length) for (const rows of heritageGroups.values()) {
  L.circleMarker(rows[0].point,{pane:'heritagePoints',radius:6,color:'#fff',weight:2,fillColor:'#006c59',fillOpacity:1})
   .bindPopup(()=>`<strong>Наследие · точка по адресу здания</strong><ul class="heritage-list">${rows.map(heritageRow).join('')}</ul>`,
              {maxHeight:250,maxWidth:300}).addTo(heritageLayer);
 }
 heritageLayer.addTo(m);
}
$('heritageLayer').onchange=()=>{
 toggleHeritage();
 if ($('heritageLayer').checked && innerWidth<=940) setPanel('pm');
};
const heritageSearch = heritage.records.map(r=>normalizeHeritage([r.name,r.address,r.ensemble||'',r.status].join(' ')));
let heritageLimit=25;
function showHeritageResults() {
 const words=normalizeHeritage($('heritageSearch').value).split(' ').filter(Boolean);
 const rows=heritage.records.filter((row,i)=>words.every(w=>heritageSearch[i].includes(w)));
 $('heritageCount').textContent='Найдено записей: '+rows.length+' из '+heritage.records.length;
 $('heritageResults').innerHTML=rows.slice(0,heritageLimit).map(heritageRow).join('');
 $('heritageMore').hidden=rows.length<=heritageLimit;
}
$('heritageSearch').oninput=()=>{heritageLimit=25;showHeritageResults()};
$('heritageMore').onclick=()=>{heritageLimit+=25;showHeritageResults()};
$('heritageOpen').onclick=()=>{
 $('filterDialog').close();showHeritageResults();$('heritageDialog').showModal();
};
$('heritageClose').onclick=()=>$('heritageDialog').close();
$('heritageDialog').addEventListener('close',()=>$('ft').focus());
$('heritageChecked').textContent=heritage.checked;
$('heritageReviews').innerHTML=heritage.reviews.map(r=>
 `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a><br>Срок обсуждения по объявлению: ${esc(r.start)} – ${esc(r.end)}</li>`).join('');

