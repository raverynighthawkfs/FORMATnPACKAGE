#!/bin/bash
# Simple wrapper script to run the compression utility

echo "FORMATnPACKAGE - File Compression Utility"
echo "=========================================="
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    echo "Please install Python 3 to use this utility"
    exit 1
fi

# Check if arguments are provided
if [ "$#" -lt 2 ]; then
    echo "Usage: $0 <input_directory> <output_directory>"
    echo ""
    echo "Example:"
    echo "  $0 ~/Documents/files ~/Desktop/compressed"
    echo ""
    exit 1
fi

INPUT_DIR="$1"
OUTPUT_DIR="$2"

# Check if input directory exists
if [ ! -d "$INPUT_DIR" ]; then
    echo "Error: Input directory '$INPUT_DIR' does not exist"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Run the Python compression script
echo "Starting compression..."
echo "Input:  $INPUT_DIR"
echo "Output: $OUTPUT_DIR"
echo ""

python3 "$SCRIPT_DIR/compress.py" "$INPUT_DIR" "$OUTPUT_DIR"

echo ""
echo "Compression complete! Check $OUTPUT_DIR for results."
