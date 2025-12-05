#!/usr/bin/env python3
"""
File compression utility that tests multiple compression algorithms
and compares their effectiveness.
"""

import os
import sys
import gzip
import zipfile
import lzma
import subprocess
import json
from pathlib import Path
from typing import Dict, List, Tuple
import shutil

def ensure_dependencies():
    """Check and install missing Python dependencies."""
    required_packages = []
    
    try:
        import zstandard
    except ImportError:
        required_packages.append('zstandard')
    
    if required_packages:
        print(f"Installing missing dependencies: {', '.join(required_packages)}")
        subprocess.check_call([sys.executable, '-m', 'pip', 'install', '--user'] + required_packages)
        print("Dependencies installed successfully!")

def check_7z_available():
    """Check if 7z is available on PATH."""
    try:
        subprocess.run(['7z'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return True
    except (subprocess.SubprocessError, FileNotFoundError):
        return False

def get_file_size(filepath):
    """Get file size in bytes."""
    return os.path.getsize(filepath)

def compress_zip(input_file, output_file):
    """Compress file using ZIP with Deflate level 9."""
    try:
        with zipfile.ZipFile(output_file, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zipf:
            zipf.write(input_file, os.path.basename(input_file))
        return True
    except Exception as e:
        print(f"ZIP compression failed: {e}")
        return False

def compress_gzip(input_file, output_file):
    """Compress file using GZIP level 9."""
    try:
        with open(input_file, 'rb') as f_in:
            with gzip.open(output_file, 'wb', compresslevel=9) as f_out:
                shutil.copyfileobj(f_in, f_out)
        return True
    except Exception as e:
        print(f"GZIP compression failed: {e}")
        return False

def compress_xz(input_file, output_file):
    """Compress file using XZ with LZMA max compression."""
    try:
        with open(input_file, 'rb') as f_in:
            with lzma.open(output_file, 'wb', preset=9) as f_out:
                shutil.copyfileobj(f_in, f_out)
        return True
    except Exception as e:
        print(f"XZ compression failed: {e}")
        return False

def compress_zstd(input_file, output_file):
    """Compress file using Zstandard."""
    try:
        import zstandard as zstd
        with open(input_file, 'rb') as f_in:
            with open(output_file, 'wb') as f_out:
                cctx = zstd.ZstdCompressor(level=22)  # Max compression
                f_out.write(cctx.compress(f_in.read()))
        return True
    except Exception as e:
        print(f"Zstd compression failed: {e}")
        return False

def compress_7z(input_file, output_file):
    """Compress file using 7z CLI if available."""
    try:
        result = subprocess.run(
            ['7z', 'a', '-mx9', output_file, input_file],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=300
        )
        return result.returncode == 0
    except Exception as e:
        print(f"7z compression failed: {e}")
        return False

def scan_directory(directory):
    """Scan directory and return list of files."""
    files = []
    for root, _, filenames in os.walk(directory):
        for filename in filenames:
            filepath = os.path.join(root, filename)
            files.append(filepath)
    return files

def process_files(input_dir, output_dir):
    """Process all files in input directory with multiple compression algorithms."""
    ensure_dependencies()
    
    # Create output directory
    os.makedirs(output_dir, exist_ok=True)
    
    # Get all files
    files = scan_directory(input_dir)
    
    if not files:
        return {"error": "No files found in directory"}
    
    # Compression algorithms
    algorithms = [
        ('ZIP', 'zip', compress_zip),
        ('GZIP', 'gz', compress_gzip),
        ('XZ', 'xz', compress_xz),
        ('Zstd', 'zst', compress_zstd),
    ]
    
    # Add 7z if available
    if check_7z_available():
        algorithms.append(('7z', '7z', compress_7z))
    
    results = []
    algorithm_totals = {algo[0]: {'original': 0, 'compressed': 0, 'count': 0} for algo in algorithms}
    
    for filepath in files:
        file_result = {
            'filename': os.path.basename(filepath),
            'path': filepath,
            'original_size': get_file_size(filepath),
            'compressions': {}
        }
        
        for algo_name, ext, compress_func in algorithms:
            # Create output filename
            output_filename = f"{os.path.basename(filepath)}.{ext}"
            output_filepath = os.path.join(output_dir, output_filename)
            
            # Try compression
            success = compress_func(filepath, output_filepath)
            
            if success and os.path.exists(output_filepath):
                compressed_size = get_file_size(output_filepath)
                ratio = (1 - compressed_size / file_result['original_size']) * 100 if file_result['original_size'] > 0 else 0
                
                file_result['compressions'][algo_name] = {
                    'compressed_size': compressed_size,
                    'ratio': ratio,
                    'output_file': output_filepath
                }
                
                # Update totals
                algorithm_totals[algo_name]['original'] += file_result['original_size']
                algorithm_totals[algo_name]['compressed'] += compressed_size
                algorithm_totals[algo_name]['count'] += 1
            else:
                file_result['compressions'][algo_name] = {
                    'error': 'Compression failed'
                }
        
        results.append(file_result)
    
    # Calculate average ratios
    averages = {}
    for algo_name, totals in algorithm_totals.items():
        if totals['count'] > 0 and totals['original'] > 0:
            avg_ratio = (1 - totals['compressed'] / totals['original']) * 100
            averages[algo_name] = {
                'average_ratio': avg_ratio,
                'total_original': totals['original'],
                'total_compressed': totals['compressed'],
                'file_count': totals['count']
            }
    
    return {
        'results': results,
        'averages': averages,
        'total_files': len(files)
    }

def main():
    """Main entry point."""
    if len(sys.argv) < 3:
        print("Usage: compress.py <input_directory> <output_directory>")
        sys.exit(1)
    
    input_dir = sys.argv[1]
    output_dir = sys.argv[2]
    
    if not os.path.isdir(input_dir):
        print(f"Error: Input directory '{input_dir}' does not exist")
        sys.exit(1)
    
    print(f"Scanning directory: {input_dir}")
    print(f"Output directory: {output_dir}")
    print("-" * 80)
    
    results = process_files(input_dir, output_dir)
    
    # Print results as JSON for the GUI
    print(json.dumps(results, indent=2))

if __name__ == '__main__':
    main()
