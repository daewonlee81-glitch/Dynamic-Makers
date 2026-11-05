# Assembles one self-contained HTML file (engine + blocks + app + CSS + logo inline)
# usage: python3 scripts/make-single-file.py <vm.js> <app.js> <out.html> [ai.js]
import base64, sys, pathlib
vm_js, app_js, out = sys.argv[1:4]
ai_js = sys.argv[4] if len(sys.argv) > 4 else None
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'public/index.html').read_text(encoding='utf-8')
css = (root / 'public/dynamicmakers.css').read_text(encoding='utf-8')
logo = 'data:image/png;base64,' + base64.b64encode((root / 'public/logo.png').read_bytes()).decode()

def inline_js(path):
    code = pathlib.Path(path).read_text(encoding='utf-8')
    return code.replace('</script', '<\\/script')  # never end the tag early

html = html.replace('{{LOGO}}', logo)
html = html.replace('<link rel="stylesheet" href="dynamicmakers.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script src="{{VM_SRC}}"></script>', '<script>\n' + inline_js(vm_js) + '\n</script>')
ai_tag = ('<script>\n' + inline_js(ai_js) + '\n</script>\n') if ai_js else ''
html = html.replace('<script type="module" src="dynamicmakers.js"></script>', ai_tag + '<script>\n' + inline_js(app_js) + '\n</script>')
for marker in ('{{LOGO}}', '{{VM_SRC}}', 'src="dynamicmakers.js"', 'href="dynamicmakers.css"'):
    assert marker not in html, marker
pathlib.Path(out).write_text(html, encoding='utf-8')
print(f'{out}: {pathlib.Path(out).stat().st_size / 1e6:.1f} MB')
