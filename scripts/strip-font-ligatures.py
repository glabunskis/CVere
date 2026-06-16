"""Strip ligature substitutions from the Latin Modern Roman OTFs.

@react-pdf/renderer (textkit) calls fontkit's `font.layout()` with no GSUB
feature list, so the font's default ligatures (fi, ff, fl, ffi, ...) are always
applied. With these CFF/OTF faces that produces dropped or wrongly mapped glyphs
in the rendered PDF (and breaks copy/paste + search). The renderer exposes no
way to disable features at runtime, so we remove the ligature lookups from the
font files themselves while keeping every glyph and outline intact.

Run: `npm run fonts:strip-ligatures` (or `py scripts/strip-font-ligatures.py`).
Outputs `<name>-nolig.otf` next to each source face.
"""

from __future__ import annotations

from pathlib import Path

from fontTools import subset

FONT_DIR = (
    Path(__file__).resolve().parent.parent
    / "src"
    / "entities"
    / "cv"
    / "pdf"
    / "fonts"
    / "lm_roman"
)

# The four faces registered in src/entities/cv/pdf/theme.ts.
SOURCE_FACES = [
    "lmroman10-regular.otf",
    "lmroman10-italic.otf",
    "lmroman10-bold.otf",
    "lmroman10-bolditalic.otf",
]

# Standard/discretionary/contextual/historical ligature features to drop.
# `rlig` (required ligatures) is intentionally kept — it's reserved for scripts
# that need it for correct rendering; Latin Modern's Latin text does not use it.
DROP_FEATURES = "liga,dlig,clig,hlig"


def strip_ligatures(src: Path, dst: Path) -> None:
    # Use the subset CLI argv parser. `--layout-features-=...` removes the
    # ligature features from fonttools' default keep-set (we deliberately do NOT
    # pass `--layout-features=*`, because that special token wins over `-=` and
    # would keep every feature). `--glyphs=*` / `--unicodes=*` retain the full
    # glyph set and character map so only the ligature lookups are pruned.
    subset.main(
        [
            str(src),
            f"--output-file={dst}",
            "--glyphs=*",
            "--unicodes=*",
            f"--layout-features-={DROP_FEATURES}",
            "--glyph-names",
            "--notdef-outline",
            "--no-recalc-timestamp",
        ]
    )


def main() -> None:
    for name in SOURCE_FACES:
        src = FONT_DIR / name
        if not src.exists():
            raise SystemExit(f"missing source font: {src}")
        dst = FONT_DIR / f"{src.stem}-nolig.otf"
        strip_ligatures(src, dst)
        print(f"wrote {dst.name}")


if __name__ == "__main__":
    main()
