# FORMATnPACKAGE

A Python tool to compare compression formats (zip/gzip/xz/zstd/7z) over a folder of files and report sizes/ratios. Includes a minimal Material Design UI preview for future integration.

## Quick start

- PowerShell

```powershell
python compression_backbone.py "<input_dir>" --out-dir "<output_dir>" --ext .tif .tiff .png .jpg .json .txt --workers 4 --algos zip gzip xz zstd 7z
```

- Optional dependencies
  - zstandard (for zstd): `pip install zstandard`
  - 7‑Zip (for 7z): install 7‑Zip and ensure `7z.exe` is on PATH

- Outputs
  - Per‑algorithm files under `<out_dir>/<algo>/`
  - `report.json` and `report.csv` in `<out_dir>` with per‑file rows and averages

See `ui/preview/index.html` for a static Material 3 preview (not yet wired to the CLI).
A Mac/PC NodeJS App that sorts, optimizes and packages files based on format/type then saves on a server, drive or folder. Weight Loss for your Mom and Your Code!
# READ WARP.md 