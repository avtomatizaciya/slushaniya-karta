// Публичный список ОКН и сопоставление адресных точек с контурами проектов.
const heritage = __HERITAGE__;
const normalizeHeritage = value => value.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
function insideRing([x,y], ring) {
 let inside = false;
 for (let i = 1; i < ring.length; i++) {
  const [x0,y0] = ring[i-1], [x1,y1] = ring[i];
  if ((y0 > y) !== (y1 > y) && x < x0 + (x1-x0)*(y-y0)/(y1-y0)) inside = !inside;
 }
 return inside;
}
const heritagePoints = heritage.records.filter(row => row.point);
const heritageCases = new Map();
for (const hearing of D) {
 const geometry = hearing.boundary?.geometry;
 if (hearing.citywide || hearing.approx || !geometry) continue;
 const polygons = geometry.type === 'Polygon' ? [geometry.coordinates]
   : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
 if (!polygons.length) continue;
 const matched = heritagePoints.filter(({point:[lat,lon]}) => {
  const point = [lon,lat];
  return polygons.some(([outer,...holes]) => insideRing(point,outer) && !holes.some(hole => insideRing(point,hole)));
 });
 if (matched.length) heritageCases.set(hearing.id,matched);
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
 return `<details class="heritage-block"><summary>Адресные точки ОКН в контуре (${rows.length})</summary>
 <p>Адресные точки этих объектов попадают в показанный контур. Охранные зоны сверяются отдельно по утверждённым границам.</p>
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

const unesco = X.unesco;
const unescoGroup = L.featureGroup();
m.createPane('unescoZones').style.zIndex=390;
for (const [key, color] of [['buffer','#b65b17'],['core','#783fac']]) {
 L.geoJSON(unesco.zones[key].geometry,{pane:'unescoZones',interactive:false,
  style:{color,fillColor:color,weight:2,fillOpacity:0.16,dashArray:key==='buffer'?'6 4':null}
 }).addTo(unescoGroup);
}
$('unescoSource').href=unesco.geoportal;
function bindPolygonLayer(toggle, legend, group) {
 $(toggle).onchange=()=>{
  const visible=$(toggle).checked;
  $(legend).hidden=!visible;
  if (!visible) {m.removeLayer(group);return}
  if (innerWidth<=940) setPanel('pm');
  m.invalidateSize({pan:false});
  group.addTo(m);
  const bounds=group.getBounds();
  if (m.getZoom()<13 || !m.getBounds().intersects(bounds)) {
   touched=true;
   m.fitBounds(bounds.pad(.12),{maxZoom:14,animate:false});
  }
 };
}
bindPolygonLayer('unescoLayer','unescoLegend',unescoGroup);
function unescoBlock(id) {
 const match=unesco.matches[id];
 if (!match) return '';
 const status={inside:'целиком',partial:'частично',edge:'у границы, нужно уточнить по документам'};
 const lines=Object.entries(match).map(([key,value])=>`<p><strong>${esc(unesco.zones[key].name)}</strong> · ${status[value]}</p>`).join('');
 return `<section class="box unesco-card"><h3>Границы ЮНЕСКО</h3>${lines}<p class="lbl2">Сопоставление по контурам дел и областного геопортала.</p>
 <p><a href="${esc(unesco.geoportal)}" target="_blank" rel="noopener">Слои геопортала</a> ·
 <a href="${esc(unesco.unesco)}" target="_blank" rel="noopener">Карта ЮНЕСКО</a></p></section>`;
}

const protection = X.protection;
const protectionColors={oz:'#9e2257',zrz:'#257270',zopl:'#667932'};
m.createPane('protectionZones').style.zIndex=400;
const protectionGroup=L.geoJSON(protection.features,{pane:'protectionZones',interactive:false,style:feature=>{
 const color=protectionColors[feature.properties.family];
 return {color,fillColor:color,weight:1.5,fillOpacity:.14};
}});
$('protectionSource').href=protection.document;
$('protectionCoverage').textContent=protection.coverage;
bindPolygonLayer('protectionLayer','protectionLegend',protectionGroup);
function protectionBlock(id) {
 const match=protection.matches[id];
 if (!match) return '';
 const relation={inside:'целиком',partial:'частично',edge:'у границы, нужно уточнить',
  edge_inside:'почти целиком, границу нужно уточнить'};
 const lines=match.map(({code,status,page})=>`<li><a href="${esc(protection.document)}#page=${page}" target="_blank" rel="noopener">${esc(code)}</a> · ${relation[status]}</li>`).join('');
 return `<section class="box protection-card"><h3>Зоны охраны памятников</h3><ul class="lbl2l">${lines}</ul>
 <p class="lbl2">Сопоставление с контуром слушания по постановлению № 640-п.</p></section>`;
}

const oopt = X.oopt;
const ooptByNumber = new Map(oopt.features.features.map(zone=>[zone.id,zone.properties]));
m.createPane('ooptZones').style.zIndex=385;
const ooptGroup=L.geoJSON(oopt.features,{pane:'ooptZones',style:feature=>{
 const buffer=feature.properties.scope==='buffer', color=buffer?'#467987':'#42713f';
 return {color,fillColor:color,weight:2,fillOpacity:buffer?.12:.22,dashArray:buffer?'5 5':null};
},onEachFeature:(feature,layer)=>{
 const p=feature.properties;
 layer.bindPopup(`<strong>${esc(p.name)}</strong><p>${esc(p.category)} · ${esc(p.number)}</p>
 ${p.cityPart?'<p>Показана часть территории в границах Ярославля.</p>':''}
 <a href="${esc(p.source)}" target="_blank" rel="noopener">Контур в ГИСОГД</a> ·
 <a href="${esc(oopt.document)}" target="_blank" rel="noopener">Перечень ООПТ города</a>`);
}});
$('ooptSource').href=oopt.document;
bindPolygonLayer('ooptLayer','ooptLegend',ooptGroup);
function ooptBlock(id){
 const match=oopt.matches[id];
 if(!match)return '';
 const relation={inside:'целиком',partial:'частично',edge:'у границы, требуется уточнение'};
 const lines=match.map(({number,status})=>{
  const p=ooptByNumber.get(number);
  return `<li><a href="${esc(p.source)}" target="_blank" rel="noopener">${esc(p.name)}</a> · ${relation[status]}</li>`;
 }).join('');
 return `<section class="box oopt-card"><h3>Природные территории (ООПТ)</h3><ul class="lbl2l">${lines}</ul>
 <p class="lbl2">Сопоставление по контурам ГИСОГД. <a href="${esc(oopt.document)}" target="_blank" rel="noopener">Перечень ООПТ города</a></p></section>`;
}

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

