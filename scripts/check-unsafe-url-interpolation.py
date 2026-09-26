#!/usr/bin/env python3
"""Fail if HTML src/href interpolations skip okbmSafeImageUrl / okbmSafeExternalUrl."""
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SCAN_GLOBS = ("*.js", "*.html")
SKIP_PARTS = {".git", "node_modules", "supabase/functions", "scripts"}

SRC_RE = re.compile(r"""src\s*=\s*(?:"\s*\+|'\s*\+|["']\$\{)""", re.IGNORECASE)
HREF_RE = re.compile(r"""href\s*=\s*(?:"\s*\+|'\s*\+|["']\$\{)""", re.IGNORECASE)
# 검토를 마친 래퍼만 허용한다. 새 래퍼를 추가할 때는 내부에서 okbmSafeImageUrl을
# 반드시 거치는지 확인하고 이유를 적을 것.
#   tripCreatePhotoSrc (index.html): 로컬 미리보기 blob: 외에는 okbmSafeImageUrl 결과만 반환
SAFE_IMAGE_WRAPPERS = ("okbmSafeImageUrl", "tripCreatePhotoSrc")
SRC_OK_RE = re.compile(
    r"""src\s*=\s*(?:"\s*\+|'\s*\+|["']\$\{)\s*escapeHtml\s*\(\s*(?:"""
    + "|".join(SAFE_IMAGE_WRAPPERS)
    + r""")\s*\(""",
    re.IGNORECASE,
)
HREF_OK_RE = re.compile(
    r"""href\s*=\s*(?:"\s*\+|'\s*\+|["']\$\{)\s*escapeHtml\s*\(\s*okbmSafeExternalUrl\s*\(""",
    re.IGNORECASE,
)


def iter_files():
    for glob in SCAN_GLOBS:
        for path in ROOT.rglob(glob):
            parts = set(path.relative_to(ROOT).parts)
            if parts & SKIP_PARTS:
                continue
            yield path


def check_file(path: pathlib.Path):
    text = path.read_text(encoding="utf-8")
    rel = path.relative_to(ROOT).as_posix()
    hits = []
    for match in SRC_RE.finditer(text):
        snippet = text[match.start(): match.start() + 120]
        if not SRC_OK_RE.match(snippet):
            line = text.count("\n", 0, match.start()) + 1
            hits.append((rel, line, "src", snippet.splitlines()[0].strip()))
    for match in HREF_RE.finditer(text):
        snippet = text[match.start(): match.start() + 140]
        if not HREF_OK_RE.match(snippet):
            line = text.count("\n", 0, match.start()) + 1
            hits.append((rel, line, "href", snippet.splitlines()[0].strip()))
    return hits


def main():
    hits = []
    for path in sorted(iter_files()):
        hits.extend(check_file(path))
    if hits:
        print("Unsafe src/href interpolation (must use escapeHtml(okbmSafeImageUrl|okbmSafeExternalUrl(...))):")
        for rel, line, kind, snippet in hits:
            print(f"  {rel}:{line}: [{kind}] {snippet}")
        return 1
    print("ok: src/href interpolations use okbmSafeImageUrl / okbmSafeExternalUrl")
    return 0


if __name__ == "__main__":
    sys.exit(main())
