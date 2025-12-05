#!/usr/bin/env python3
# -*- coding: utf-8 -*-
r"""
Built by "Richard F Avery aka AIZEN" and "Steven M. Jeppson" with help from "Echo" @ ChatGPT, for NighthawkFS @ https://www.nighthawkfs.com/ ©NIGHTHAWK FLIGHT SYSTEMS, INC. 2025
"""

import argparse
import gzip
import lzma
import os
import shutil
import subprocess
import sys
import tempfile
import textwrap
import zipfile
from pathlib import Path

try:
    import zstandard as zstd  # type: ignore
    HAS_ZSTD = True
except ImportError:
    HAS_ZSTD = False

from shutil import which

def human_size(num: int) -> str:
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if num < 1024:
            return f"{num:.1f}{unit}"
        num /= 1024
    return f"{num:.1f}PB"

def compress_zip(src: Path, dst: Path) -> None:
    with zipfile.ZipFile(dst, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.write(src, arcname=src.name)

def compress_gzip(src: Path, dst: Path) -> None:
    with open(src, "rb") as fin, gzip.open(dst, "wb", compresslevel=9) as fout:
        shutil.copyfileobj(fin, fout)

def compress_xz(src: Path, dst: Path) -> None:
    # PRESET_EXTREME = stronger compression, slower
    with open(src, "rb") as fin, lzma.open(dst, "wb", preset=9 | lzma.PRESET_EXTREME) as fout:
        shutil.copyfileobj(fin, fout)

def compress_zstd(src: Path, dst: Path, level: int = 19) -> None:
    if not HAS_ZSTD:
        raise RuntimeError("zstandard module not available")
    cctx = zstd.ZstdCompressor(level=level)
    with open(src, "rb") as fin, open(dst, "wb") as fout:
        fout.write(cctx.compress(fin.read()))

def compress_7z(src: Path, dst: Path) -> None:
    sevenzip = which("7z") or which("7z.exe")
    if not sevenzip:
        raise RuntimeError("7z executable not found in PATH")

    # 7z a -t7z -mx=9 archive.7z file
    cmd = [sevenzip, "a", "-t7z", "-mx=9", str(dst), str(src)]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if result.returncode != 0:
        raise RuntimeError(f"7z failed: {result.stderr.decode(errors='ignore')}")

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Compare compression formats (zip/gzip/xz/zstd/7z) on a set of files.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent(
            """\
            Example:
              python compression_backbone.py C:\\Users\\ravery\\Desktop\\test_files \\
                  --out-dir C:\\Users\\ravery\\Desktop\\compression_results \\
                  --ext .tif .tiff .png .jpg .json .txt
            """
        ),
    )
    parser.add_argument("input_dir", type=str, help="Directory containing files to test.")
    parser.add_argument(
        "--out-dir",
        type=str,
        default=None,
        help="Output directory for compressed files (default: <input_dir>/_compression_test)",
    )
    parser.add_argument(
        "--ext",
        nargs="*",
        default=None,
        help="Optional list of extensions to include (e.g. --ext .tif .tiff .json). If omitted, all files are used.",
    )
    parser.add_argument(
        "--max-files",
        type=int,
        default=0,
        help="Limit number of files to test (0 = no limit).",
    )

    args = parser.parse_args()

    input_dir = Path(args.input_dir).resolve()
    if not input_dir.is_dir():
        print(f"ERROR: {input_dir} is not a directory.", file=sys.stderr)
        sys.exit(1)

    out_dir = Path(args.out_dir) if args.out_dir else input_dir / "_compression_test"
    out_dir.mkdir(parents=True, exist_ok=True)

    allowed_ext = None
    if args.ext:
        allowed_ext = set(ext.lower() for ext in args.ext)

    # Collect files
    files = []
    for root, _, filenames in os.walk(input_dir):
        for name in filenames:
            src = Path(root) / name
            if allowed_ext is not None:
                if src.suffix.lower() not in allowed_ext:
                    continue
            # Skip files we will create in out_dir
            if out_dir in src.parents:
                continue
            files.append(src)

    if args.max_files > 0:
        files = files[: args.max_files]

    if not files:
        print("No files to test.")
        return

    algos = {
        "zip": compress_zip,
        "gzip": compress_gzip,
        "xz": compress_xz,
    }

    if HAS_ZSTD:
        algos["zstd"] = compress_zstd

    sevenzip = which("7z") or which("7z.exe")
    if sevenzip:
        algos["7z"] = compress_7z

    print("=== Compression Backbone ===")
    print(f"Input dir : {input_dir}")
    print(f"Output dir: {out_dir}")
    print(f"Files     : {len(files)}")
    print(f"Algos     : {', '.join(algos.keys())}")
    print()

    rows = []
    algo_stats = {name: [] for name in algos.keys()}

    for src in files:
        orig_size = src.stat().st_size
        if orig_size == 0:
            continue

        result_row = {"file": str(src.relative_to(input_dir)), "orig": orig_size}
        for algo_name, func in algos.items():
            # Put each algo's output in its own folder for cleanliness
            algo_dir = out_dir / algo_name
            algo_dir.mkdir(parents=True, exist_ok=True)

            # Use a temp name first to avoid partial files skewing results
            final_path = algo_dir / (src.name + f".{algo_name}")
            with tempfile.TemporaryDirectory() as tmpdir:
                tmp_path = Path(tmpdir) / (src.name + f".{algo_name}")
                try:
                    if algo_name == "zstd":
                        func(src, tmp_path)  # level is baked into function
                    else:
                        func(src, tmp_path)
                    shutil.move(tmp_path, final_path)
                    comp_size = final_path.stat().st_size
                    ratio = comp_size / orig_size
                    result_row[algo_name] = (comp_size, ratio)
                    algo_stats[algo_name].append(ratio)
                except Exception as e:
                    result_row[algo_name] = (None, None)
                    print(f"[WARN] {algo_name} failed on {src}: {e}", file=sys.stderr)

        rows.append(result_row)

    # Print table
    header_cols = ["File", "Orig"]
    for algo_name in algos.keys():
        header_cols.append(f"{algo_name} size")
        header_cols.append(f"{algo_name} ratio")

    print("\t".join(header_cols))

    for row in rows:
        cols = [row["file"], human_size(row["orig"])]
        for algo_name in algos.keys():
            comp = row.get(algo_name)
            if comp and comp[0] is not None:
                cols.append(human_size(comp[0]))
                cols.append(f"{comp[1]*100:.1f}%")
            else:
                cols.append("FAIL")
                cols.append("N/A")
        print("\t".join(cols))

    print("\n=== Average Compression Ratios (lower is better) ===")
    for algo_name, ratios in algo_stats.items():
        if not ratios:
            print(f"{algo_name}: no successful samples")
        else:
            avg = sum(ratios) / len(ratios)
            print(f"{algo_name}: {avg*100:.1f}% of original size")


if __name__ == "__main__":
    main()
