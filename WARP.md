# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Quick commands

- Run (PowerShell):

```powershell
python compression_backbone.py "<input_dir>" --out-dir "<output_dir>" --ext .tif .tiff .png .jpg .json .txt --max-files 50
```

- Run (Bash):

```bash
python3 compression_backbone.py "<input_dir>" --out-dir "<output_dir>" --ext .tif .tiff .png .jpg .json .txt --max-files 50
```

- Optional dependencies:
  - zstd support (Python): `pip install zstandard`
  - 7-Zip CLI: install 7‑Zip and ensure `7z`/`7z.exe` is on PATH

- Lint/tests/build:
  - No test suite, linter config, or build system is defined in this repo. The project is a single runnable Python script.

## Architecture overview

- Entry point: `compression_backbone.py`
  - CLI args: `input_dir` (required), optional `--out-dir`, `--ext` (filter by extensions), `--max-files`.
  - Discovers files in `input_dir` (skips anything inside the computed `out_dir`).
  - Compression strategies implemented as functions:
    - `compress_zip`, `compress_gzip`, `compress_xz` (standard library)
    - `compress_zstd` (uses `zstandard` if installed)
    - `compress_7z` (invokes external `7z` if present)
  - For each source file and enabled algorithm:
    - Writes output into `<out_dir>/<algo>/` using a temp file then moves to final path to avoid partial artifacts.
    - Records compressed size and ratio vs original.
  - Outputs:
    - A tab-separated table per file with original size and per‑algorithm results (size and ratio).
    - Average compression ratios per algorithm across all successful samples.

- Script helper: `run_comp_backbone.sh`
  - Contains a Windows‑style invocation using `^` line continuations but has a `.sh` extension. If using PowerShell, run the single‑line command above or replace `^` with PowerShell line continuations.

## Notes & gotchas

- Paths: quote Windows paths containing spaces.
- Output layout: results are grouped by algorithm under `out_dir` (`zip/`, `gzip/`, `xz/`, `zstd/`, `7z/`).
- Availability:
  - `zstd` rows appear only if the `zstandard` module is installed.
  - `7z` rows appear only if a `7z` executable is found on PATH.
- Performance: `xz` and high‑level `zstd` can be CPU‑intensive on large datasets.

## Repository docs

- `README.md` currently describes a NodeJS application, which does not match the present Python tool. Treat it as out of date for setup/run instructions.
