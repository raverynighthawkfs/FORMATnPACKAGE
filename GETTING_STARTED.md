# Getting Started with FORMATnPACKAGE

## Quick Start Guide

### 1. Prerequisites Check

Before running the application, ensure you have:

- **Node.js** (v14 or higher): Check with `node --version`
- **Python 3** (3.7 or higher): Check with `python3 --version`
- **npm**: Check with `npm --version`

Optional:
- **7z**: Install for better compression (highly recommended)
  - macOS: `brew install p7zip`
  - Ubuntu/Debian: `sudo apt-get install p7zip-full`
  - Windows: Download from https://www.7-zip.org/

### 2. Installation Steps

```bash
# Clone the repository
git clone https://github.com/raverynighthawkfs/FORMATnPACKAGE.git
cd FORMATnPACKAGE

# Install Node.js dependencies
npm install

# Install Python dependencies (optional - will auto-install when needed)
pip3 install -r requirements.txt
```

### 3. Running the Application

```bash
npm start
```

This will launch the Electron GUI application.

### 4. Using the Application

1. **Select Input Directory**: Click the "Select Input Directory" button and choose a folder containing files you want to compress

2. **Select Output Directory**: Click the "Select Output Directory" button and choose where compressed files should be saved

3. **Start Compression**: Click "Start Compression" to begin the process

4. **View Results**: After compression completes, you'll see:
   - A table showing each file's compression results
   - Original and compressed file sizes
   - Compression ratios for each algorithm
   - Average compression ratios per algorithm

## Understanding the Results

### Compression Ratios

- **Green (>50%)**: Excellent compression - file size reduced by more than half
- **Orange (20-50%)**: Good compression - noticeable space savings
- **Red (<20%)**: Poor compression - file may not be very compressible

### Negative Ratios

Some files (especially very small ones) may show negative compression ratios. This means the compressed file is larger than the original due to:
- Compression overhead (headers, metadata)
- File already being compressed
- File too small to benefit from compression

### Algorithm Comparison

Different algorithms work better for different file types:

- **ZIP**: Universal, widely supported, good general-purpose
- **GZIP**: Fast, good for text files
- **XZ**: Excellent compression ratio, slower
- **Zstd**: Modern, fast with good compression
- **7z**: Often the best compression, slower

## Testing with Sample Files

Create a test directory:

```bash
mkdir ~/test_compression
cd ~/test_compression

# Create some test files
echo "This is a test file with repeating text. " > test1.txt
for i in {1..100}; do echo "Repeating line $i" >> test1.txt; done

# Create a JSON file
echo '{"data": [1,2,3,4,5], "name": "test"}' > test.json

# Create a log file
for i in {1..50}; do echo "[$(date)] Log entry $i" >> test.log; done
```

Then compress this directory with FORMATnPACKAGE to see the results!

## Troubleshooting

### Python Not Found

If you see "Python is not installed" error:
- Install Python 3 from https://www.python.org/
- On macOS: `brew install python3`
- On Ubuntu: `sudo apt-get install python3`

### Dependencies Error

If compression fails due to missing dependencies:
- The app will try to auto-install them
- Or manually run: `pip3 install -r requirements.txt`

### No Compression Results

If no files are compressed:
- Check that input directory contains files
- Verify you have write permissions to output directory
- Check the progress log for error messages

## Performance Tips

- Larger files benefit more from compression
- Text files (logs, code, JSON) compress very well
- Already compressed files (images, videos) won't compress much
- Use output directory on fast storage for best performance

## Advanced Usage

### Command Line Mode

You can also use the Python script directly:

```bash
python3 compress.py /path/to/input /path/to/output
```

This outputs JSON results suitable for parsing or integration with other tools.

### Batch Processing

For processing multiple directories:

```bash
for dir in dir1 dir2 dir3; do
  python3 compress.py "$dir" "output_$dir"
done
```

## Architecture

The application consists of:

1. **Electron GUI** (`src/main.js`, `src/index.html`): User interface
2. **Python Backend** (`compress.py`): Compression logic
3. **IPC Communication**: Electron communicates with Python subprocess

This architecture allows:
- Cross-platform compatibility (Mac, Windows, Linux)
- Use of Python's excellent compression libraries
- Beautiful Material UI interface
- Easy maintenance and updates
