"""Сборка сайта на стороне GitHub: template.html + data.json -> dist/index.html."""
import json, pathlib
r = pathlib.Path(__file__).parent
d = json.loads((r/'data.json').read_text(encoding='utf-8'))
out = r/'dist'; out.mkdir(exist_ok=True)
(out/'index.html').write_text((r/'template.html').read_text(encoding='utf-8').replace('__DATA__', json.dumps(d, ensure_ascii=False)), encoding='utf-8')
print('points', len(d))
