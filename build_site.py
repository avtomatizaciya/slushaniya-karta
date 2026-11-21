"""Сборка сайта на стороне GitHub: template.html + data.json -> dist/index.html."""
import json, pathlib
r = pathlib.Path(__file__).parent
d = json.loads((r/'data.json').read_text(encoding='utf-8'))
import shutil
out = r/'dist'; out.mkdir(exist_ok=True); shutil.copy(r/'genplan.webp', out/'genplan.webp'); shutil.copy(r/'og.jpg', out/'og.jpg'); shutil.copytree(r/'avatars', out/'avatars', dirs_exist_ok=True)
(out/'index.html').write_text((r/'template.html').read_text(encoding='utf-8').replace('__HERITAGE_SCRIPT__', (r/'heritage.js').read_text(encoding='utf-8').replace('__HERITAGE__', (r/'heritage.json').read_text(encoding='utf-8'))).replace('__DATA__', json.dumps(d, ensure_ascii=False)).replace('__LEGEND__', (r/'genplan_legend.json').read_text(encoding='utf-8')).replace('__GRID__', (r/'genplan_grid.json').read_text(encoding='utf-8')).replace('__DIST__', (r/'districts.json').read_text(encoding='utf-8')).replace('__EXTRA__', (r/'extra.json').read_text(encoding='utf-8')), encoding='utf-8')
print('points', len(d))
