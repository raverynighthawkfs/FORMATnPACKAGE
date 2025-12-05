param(
  [Parameter(Mandatory=$true)][string]$InputDir,
  [Parameter(Mandatory=$false)][string]$OutDir,
  [string[]]$Ext = @('.tif', '.tiff', '.png', '.jpg', '.json', '.txt'),
  [int]$MaxFiles = 50
)

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) { throw "Python not found on PATH. Install Python and re-run." }

$argv = @('compression_backbone.py', $InputDir)
if ($OutDir) { $argv += @('--out-dir', $OutDir) }
if ($Ext -and $Ext.Count -gt 0) { $argv += @('--ext') + $Ext }
if ($MaxFiles -gt 0) { $argv += @('--max-files', $MaxFiles) }

& python @argv