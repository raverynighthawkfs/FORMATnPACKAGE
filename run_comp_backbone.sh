#!/usr/bin/env bash
set -euo pipefail

python3 compression_backbone.py \
  "${1:-$HOME/test_files}" \
  --out-dir "${2:-$HOME/compression_results}" \
  --ext .tif .tiff .png .jpg .json .txt \
  --max-files 50 \
  --algos zip gzip xz zstd 7z \
  --workers "${WORKERS:-4}" \
  --zstd-level "${ZSTD_LEVEL:-19}"
