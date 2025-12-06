#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
Built by "Richard F Avery aka AIZEN" and "Steven M. Jeppson" with help from "Echo" @ ChatGPT, for NighthawkFS @ https://www.nighthawkfs.com/ ©NIGHTHAWK FLIGHT SYSTEMS, INC. 2025
Optimized by Warp: streaming compression, concurrency, reporting, and CLI tunables.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import lzma
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
import zipfile
from concurrent.futures import ProcessPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from shutil import which
from typing import Dict, Iterable, List, Optional, Tuple

try:
    import zstandard as zstd  # type: ignore
    HAS_ZSTD = True
except Exception:  # pragma: no cover
    HAS_ZSTD = False

CHUNK_SIZE = 1024 * 1024  # 1 MiB


def human_size(num: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if num < 1024:
            return f"{num:.1f}{unit}"
        num /= 1024
    return f"{num:.1f}PB"


@dataclass
class AlgoConfig:
    gzip_level: int = 9
    xz_preset: int = 9
    xz_extreme: bool = True
    zstd_level: int = 19
    sevenzip_level: int = 9


def compress_zip(src: Path, dst: Path, *, level: int = 9) -> None:
    with zipfile.ZipFile(dst, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=level) as zf:
        zf.write(src, arcname=src.name)


def compress_gzip(src: Path, dst: Path, *, level: int = 9) -> None:
    with open(src, "rb") as fin, gzip.open(dst, "wb", compresslevel=level) as fout:
        shutil.copyfileobj(fin, fout, length=CHUNK_SIZE)


def compress_xz(src: Path, dst: Path, *, preset: int = 9, extreme: bool = True) -> None:
    xz_level = preset | (lzma.PRESET_EXTREME if extreme else 0)
    with open(src, "rb") as fin, lzma.open(dst, "wb", preset=xz_level) as fout:
        shutil.copyfileobj(fin, fout, length=CHUNK_SIZE)


def compress_zstd(src: Path, dst: Path, *, level: int = 19) -> None:
    if not HAS_ZSTD:
        raise RuntimeError("zstandard module not available")
    cctx = zstd.ZstdCompressor(level=level)
    with open(src, "rb") as fin, open(dst, "wb") as fout:
        cctx.copy_stream(fin, fout, read_size=CHUNK_SIZE, write_size=CHUNK_SIZE)


def find_7z() -> Optional[str]:
    candidates = [which("7z"), which("7z.exe")]
    # Common Windows install path
    candidates.append(str(Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "7-Zip" / "7z.exe"))
    for c in candidates:
        if c and Path(c).exists():
            return c
    return None


def compress_7z(src: Path, dst: Path, *, level: int = 9) -> None:
    sevenzip = find_7z()
    if not sevenzip:
        raise RuntimeError("7z executable not found. Install 7‑Zip and ensure 7z.exe is on PATH.")
    cmd = [sevenzip, "a", "-t7z", f"-mx={level}", str(dst), str(src)]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(f"7z failed: {result.stderr.decode(errors='ignore')}")


def discover_files(input_dir: Path, out_dir: Path, allowed_ext: Optional[Iterable[str]]) -> List[Path]:
    files: List[Path] = []
    ext_set = set(e.lower() for e in allowed_ext) if allowed_ext else None
    for root, _, filenames in os.walk(input_dir):
        for name in filenames:
            src = Path(root) / name
            if out_dir in src.parents:
                continue
            if ext_set is not None and src.suffix.lower() not in ext_set:
                continue
            if src.stat().st_size > 0:
                files.append(src)
    return files


def ensure_algo_map(config: AlgoConfig, enable: Iterable[str]) -> Dict[str, callable]:
    algos: Dict[str, callable] = {}
    for key in enable:
        if key == "zip":
            algos[key] = lambda s, d: compress_zip(s, d, level=9)
        elif key == "gzip":
            algos[key] = lambda s, d: compress_gzip(s, d, level=config.gzip_level)
        elif key == "xz":
            algos[key] = lambda s, d: compress_xz(s, d, preset=config.xz_preset, extreme=config.xz_extreme)
        elif key == "zstd" and HAS_ZSTD:
            algos[key] = lambda s, d: compress_zstd(s, d, level=config.zstd_level)
        elif key == "7z" and find_7z():
            algos[key] = lambda s, d: compress_7z(s, d, level=config.sevenzip_level)
    return algos


def compress_one(src: Path, input_dir: Path, out_dir: Path, algo_names: List[str], config: AlgoConfig, force: bool = False) -> Dict:
    orig_size = src.stat().st_size
    result_row: Dict[str, object] = {"file": str(src.relative_to(input_dir)), "orig": orig_size}

    algos = ensure_algo_map(config, algo_names)
    for algo_name, func in algos.items():
        algo_dir = out_dir / algo_name
        algo_dir.mkdir(parents=True, exist_ok=True)
        final_path = algo_dir / (src.name + f".{algo_name}")
        try:
            if final_path.exists() and not force:
                comp_size = final_path.stat().st_size
            else:
                with tempfile.TemporaryDirectory() as tmpdir:
                    tmp_path = Path(tmpdir) / (src.name + f".{algo_name}")
                    func(src, tmp_path)
                    shutil.move(tmp_path, final_path)
                comp_size = final_path.stat().st_size
            ratio = comp_size / orig_size
            result_row[algo_name] = {"size": comp_size, "ratio": ratio}
        except Exception as e:
            result_row[algo_name] = {"error": str(e)}
    return result_row


def write_reports(rows: List[Dict], out_dir: Path) -> Dict[str, float]:
    # Compute averages
    sums: Dict[str, List[float]] = {}
    for row in rows:
        for k, v in row.items():
            if k in ("file", "orig"):
                continue
            if isinstance(v, dict) and "ratio" in v:
                sums.setdefault(k, []).append(float(v["ratio"]))
    averages = {k: (sum(v) / len(v) if v else float("nan")) for k, v in sums.items()}

    # JSON
    report_json = {"files": rows, "averages": averages}
    (out_dir / "report.json").write_text(json.dumps(report_json, indent=2))

    # CSV
    fieldnames = ["file", "orig"] + sorted(sums.keys())
    with open(out_dir / "report.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        header = ["file", "orig_bytes"]
        for algo in sorted(sums.keys()):
            header += [f"{algo}_size", f"{algo}_ratio"]
        w.writerow(header)
        for row in rows:
            line: List[object] = [row.get("file"), row.get("orig")]
            for algo in sorted(sums.keys()):
                cell = row.get(algo) or {}
                line += [cell.get("size"), cell.get("ratio")]
            w.writerow(line)
    return averages


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare compression formats (zip/gzip/xz/zstd/7z) on a set of files.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """\
            Example:
              python compression_backbone.py C:\\data\\input \\
                  --out-dir C:\\data\\out \\
                  --ext .tif .tiff .png .jpg .json .txt \\
                  --algos zip gzip xz zstd 7z --workers 4 --zstd-level 19
            """
        ),
    )
    parser.add_argument("input_dir", type=str, help="Directory containing files to test.")
    parser.add_argument("--out-dir", type=str, default=None, help="Output directory (default: <input_dir>/_compression_test)")
    parser.add_argument("--ext", nargs="*", default=None, help="List of extensions to include (e.g. --ext .tif .json)")
    parser.add_argument("--max-files", type=int, default=0, help="Limit number of files to test (0 = no limit)")
    parser.add_argument("--algos", nargs="*", default=["zip", "gzip", "xz", "zstd", "7z"], help="Algorithms to run")
    parser.add_argument("--workers", type=int, default=1, help="Parallel workers (processes)")
    parser.add_argument("--force", action="store_true", help="Overwrite existing outputs")
    parser.add_argument("--strict", action="store_true", help="Exit non‑zero if any file fails")
    parser.add_argument("--zstd-level", type=int, default=19, help="zstd level (1–22)")
    parser.add_argument("--xz-preset", type=int, default=9, help="xz preset (0–9)")
    parser.add_argument("--xz-no-extreme", action="store_true", help="disable xz extreme mode")
    parser.add_argument("--gzip-level", type=int, default=9, help="gzip level (1–9)")

    args = parser.parse_args()

    input_dir = Path(args.input_dir).resolve()
    if not input_dir.is_dir():
        print(f"ERROR: {input_dir} is not a directory.", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out_dir) if args.out_dir else input_dir / "_compression_test"
    out_dir.mkdir(parents=True, exist_ok=True)

    files = discover_files(input_dir, out_dir, args.ext)
    if args.max_files > 0:
        files = files[: args.max_files]
    if not files:
        print("No files to test.")
        return

    config = AlgoConfig(
        gzip_level=max(1, min(9, args.gzip_level)),
        xz_preset=max(0, min(9, args.xz_preset)),
        xz_extreme=not args.xz_no_extreme,
        zstd_level=max(1, min(22, args.zstd_level)),
        sevenzip_level=9,
    )

    # Filter algos by availability
    enabled = []
    for a in args.algos:
        if a == "zstd" and not HAS_ZSTD:
            continue
        if a == "7z" and not find_7z():
            continue
        enabled.append(a)
    if not enabled:
        print("No available algorithms selected.")
        return

    print("=== Compression Backbone ===")
    print(f"Input dir : {input_dir}")
    print(f"Output dir: {out_dir}")
    print(f"Files     : {len(files)}")
    print(f"Algos     : {', '.join(enabled)}")
    print()

    rows: List[Dict] = []
    failures = 0

    if args.workers and args.workers > 1:
        with ProcessPoolExecutor(max_workers=args.workers) as ex:
            futures = [
                ex.submit(
                    compress_one,
                    f,
                    input_dir,
                    out_dir,
                    enabled,
                    config,
                    args.force,
                )
                for f in files
            ]
            for fut in as_completed(futures):
                row = fut.result()
                rows.append(row)
    else:
        for f in files:
            rows.append(compress_one(f, input_dir, out_dir, enabled, config, args.force))

    # Summarize, print table, and write reports
    algo_order = [a for a in enabled if a in rows[0].keys()]
    header = ["File", "Orig"] + [f"{a} size\t{a} ratio" for a in algo_order]
    print("\t".join(header))
    for row in rows:
        cols: List[str] = [row["file"], human_size(int(row["orig"]))]
        for a in algo_order:
            cell = row.get(a) or {}
            if "size" in cell and "ratio" in cell:
                cols.append(human_size(int(cell["size"])));
                cols.append(f"{float(cell['ratio'])*100:.1f}%")
            else:
                failures += 1
                cols += ["FAIL", "N/A"]
        print("\t".join(cols))

    averages = write_reports(rows, out_dir)
    print("\n=== Average Compression Ratios (lower is better) ===")
    for algo, avg in averages.items():
        if avg == avg:  # not NaN
            print(f"{algo}: {avg*100:.1f}% of original size")

    if args.strict and failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
