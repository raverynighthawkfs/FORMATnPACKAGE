# FORMATnPACKAGE

A Mac/PC NodeJS+Python GUI App that scans then optimizes files based on format/type. Saves it on a server, drive or folder of choice. Material UI icons, fonts and layouts.

## Features

- **Multiple Compression Algorithms**: Tests and compares:
  - ZIP (Deflate level 9)
  - GZIP (level 9)
  - XZ (LZMA max compression)
  - Zstandard (max level)
  - 7z CLI (if available on PATH)
  
- **Beautiful Material UI Interface**: Clean, modern design with Material icons and fonts
- **Directory Scanning**: Walk through directories to find all files
- **Comparison Table**: Shows original sizes, compressed sizes, and compression ratios
- **Statistics**: Displays per-algorithm average compression ratios
- **Auto-Install Dependencies**: Automatically installs missing Python packages

## Prerequisites

- **Node.js** (v14 or higher)
- **Python 3** (3.7 or higher)
- **Optional**: 7z command-line tool for 7z compression

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/raverynighthawkfs/FORMATnPACKAGE.git
   cd FORMATnPACKAGE
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Python dependencies will be installed automatically when first running compression

## Usage

1. Start the application:
   ```bash
   npm start
   ```

2. Select an input directory containing files to compress

3. Select an output directory where compressed files will be saved

4. Click "Start Compression" to begin the process

5. View the results table showing:
   - Original file sizes
   - Compressed sizes for each algorithm
   - Compression ratios (percentage saved)
   - Average compression ratios per algorithm

## How It Works

1. **Directory Scanning**: The Python backend walks through the selected directory and finds all files
2. **Compression**: Each file is compressed using multiple algorithms
3. **Comparison**: Results are compared and statistics are calculated
4. **Display**: The GUI presents results in an easy-to-read table with color-coded compression ratios

## Compression Algorithms

- **ZIP (Deflate)**: Standard ZIP compression with maximum compression level (9)
- **GZIP**: GNU zip with maximum compression level (9)
- **XZ**: LZMA2 compression with maximum preset (9)
- **Zstandard**: Modern compression algorithm with maximum level (22)
- **7z**: If 7z CLI is installed on your PATH, it will be used with maximum compression (-mx9)

## Development

To modify the application:

- **GUI**: Edit `src/index.html` for the interface
- **Main Process**: Edit `src/main.js` for Electron backend
- **Compression Logic**: Edit `compress.py` for compression algorithms

## License

Apache License 2.0

## Weight Loss for your Files!

This tool helps you find the best compression algorithm for your files, potentially saving significant storage space.
