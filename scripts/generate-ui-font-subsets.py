# Regenerate with fonttools and brotli installed; inputs are the locked Fontsource fonts.
from pathlib import Path
from collections import Counter
from fontTools.ttLib import TTFont
from fontTools.subset import Options, Subsetter
from itertools import chain
from collections import Counter
# The manifest is fixed so regeneration does not depend on filesystem order.
chars=[ord(ch) for ch in Path('scripts/ui-font-characters.txt').read_text(encoding='utf-8').strip()]
fonts=[('noto-serif-jp','Noto Serif JP',400),('noto-serif-jp','Noto Serif JP',500),('noto-serif-jp','Noto Serif JP',600),('shippori-mincho','Shippori Mincho',400),('shippori-mincho','Shippori Mincho',500)]
css=['/* Common CJK glyphs from the existing Fontsource fonts; other glyphs use the original subsets. */']
for fam, name, weight in fonts:
 inp=Path(f'node_modules/@fontsource/{fam}/files/{fam}-japanese-{weight}-normal.woff2')
 font=TTFont(inp, recalcTimestamp=False); actual=sorted(set(chars)&set(font.getBestCmap()))
 opts=Options();opts.flavor='woff2'; opts.layout_features=['*']; subset=Subsetter(options=opts);subset.populate(unicodes=actual);subset.subset(font);font.flavor='woff2';out=f'{fam}-common-{weight}.woff2';font.save(Path('src/assets/ui-fonts')/out)
 ranges=','.join(f'U+{cp:X}' for cp in actual)
 css.append(f"@font-face {{\n  font-family: '{name}';\n  font-style: normal;\n  font-weight: {weight};\n  font-display: swap;\n  src: url('./ui-fonts/{out}') format('woff2');\n  unicode-range: {ranges};\n}}")
 print(out,len(actual),(Path('src/assets/ui-fonts')/out).stat().st_size)
Path('src/assets/ui-fonts.css').write_text('\n\n'.join(css)+'\n')
