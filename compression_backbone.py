#!/usr/bin/env python3
"""
Compression Backbone Module
A Python module for handling file compression operations in the FORMATnPACKAGE project.
"""

import os
import sys
import zipfile
import gzip
import shutil
from pathlib import Path


class CompressionBackbone:
    """
    Core compression functionality for file processing.
    Provides methods for compressing files and directories.
    """
    
    def __init__(self):
        """Initialize the CompressionBackbone."""
        self.supported_formats = ['zip', 'gz']
    
    def compress_file(self, input_path, output_path=None, format='zip'):
        """
        Compress a single file.
        
        Args:
            input_path (str): Path to the file to compress
            output_path (str): Path for the compressed output (optional)
            format (str): Compression format ('zip' or 'gz')
        
        Returns:
            str: Path to the compressed file
        """
        if format not in self.supported_formats:
            raise ValueError(f"Unsupported format: {format}. Use {self.supported_formats}")
        
        input_file = Path(input_path)
        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")
        
        if output_path is None:
            output_path = f"{input_path}.{format}"
        
        if format == 'zip':
            with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                zipf.write(input_path, input_file.name)
        elif format == 'gz':
            with open(input_path, 'rb') as f_in:
                with gzip.open(output_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
        
        return output_path
    
    def compress_directory(self, input_dir, output_path=None):
        """
        Compress an entire directory into a zip file.
        
        Args:
            input_dir (str): Path to the directory to compress
            output_path (str): Path for the compressed output (optional)
        
        Returns:
            str: Path to the compressed file
        """
        input_path = Path(input_dir)
        if not input_path.exists() or not input_path.is_dir():
            raise ValueError(f"Invalid directory: {input_dir}")
        
        if output_path is None:
            output_path = f"{input_dir}.zip"
        
        with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in input_path.rglob('*'):
                if file_path.is_file():
                    arcname = file_path.relative_to(input_path)
                    zipf.write(file_path, arcname)
        
        return output_path
    
    def get_compression_info(self, file_path):
        """
        Get information about a compressed file.
        
        Args:
            file_path (str): Path to the compressed file
        
        Returns:
            dict: Information about the compressed file
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        info = {
            'path': str(file_path),
            'size': file_path.stat().st_size,
            'format': file_path.suffix.lstrip('.')
        }
        
        return info


def main():
    """Main function for CLI usage."""
    if len(sys.argv) < 2:
        print("Usage: compression_backbone.py <file_or_directory>")
        sys.exit(1)
    
    target = sys.argv[1]
    compressor = CompressionBackbone()
    
    if os.path.isfile(target):
        output = compressor.compress_file(target)
        print(f"Compressed file: {output}")
    elif os.path.isdir(target):
        output = compressor.compress_directory(target)
        print(f"Compressed directory: {output}")
    else:
        print(f"Error: {target} is not a valid file or directory")
        sys.exit(1)


if __name__ == "__main__":
    main()
