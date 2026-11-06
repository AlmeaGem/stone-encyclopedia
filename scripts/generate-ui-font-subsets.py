"""Regenerate the common glyph subsets from the locked Fontsource packages.

Requires the Python packages fonttools and brotli. The original full Fontsource
CSS remains in use as a fallback for all characters outside the manifest.
"""
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

manifest = Path('scripts/ui-font-characters.txt').read_text(encoding='utf-8')
characters = {ord(character) for character in manifest.rstrip('\n')}
fonts = [
    ('noto-serif-jp', 'Noto Serif JP', 400),
    ('noto-serif-jp', 'Noto Serif JP', 500),
    ('noto-serif-jp', 'Noto Serif JP', 600),
    ('shippori-mincho', 'Shippori Mincho', 400),
    ('shippori-mincho', 'Shippori Mincho', 500),
]
output_dir = Path('src/assets/ui-fonts')
output_dir.mkdir(parents=True, exist_ok=True)
css = ['/* Common CJK glyphs from the existing Fontsource fonts; other glyphs use the original subsets. */']

for family, name, weight in fonts:
    source = Path(f'node_modules/@fontsource/{family}/files/{family}-japanese-{weight}-normal.woff2')
    font = TTFont(source, recalcTimestamp=False)
    actual = sorted(characters & set(font.getBestCmap()))
    options = Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=actual)
    subsetter.subset(font)
    font.flavor = 'woff2'
    filename = f'{family}-common-{weight}.woff2'
    font.save(output_dir / filename)
    ranges = ','.join(f'U+{codepoint:X}' for codepoint in actual)
    css.append(
        f"@font-face {{\n  font-family: '{name}';\n  font-style: normal;\n"
        f"  font-weight: {weight};\n  font-display: swap;\n"
        f"  src: url('./ui-fonts/{filename}') format('woff2');\n"
        f"  unicode-range: {ranges};\n}}"
    )
    print(filename, len(actual), (output_dir / filename).stat().st_size)

Path('src/assets/ui-fonts.css').write_text('\n\n'.join(css) + '\n', encoding='utf-8')
