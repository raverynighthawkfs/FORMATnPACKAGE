#!/usr/bin/env python3
"""
File optimization script for FORMATnPACKAGE
Handles image optimization, PDF compression, etc.
"""

import sys
import os
import json
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Warning: Pillow not installed. Image optimization disabled.")

try:
    import PyPDF2
except ImportError:
    print("Warning: PyPDF2 not installed. PDF optimization disabled.")


def optimize_image(image_path, output_path=None, quality=85):
    """
    Optimize an image file
    """
    try:
        if 'Image' not in globals():
            return {"success": False, "error": "Pillow not installed"}
        
        if output_path is None:
            output_path = image_path
        
        img = Image.open(image_path)
        
        # Convert RGBA to RGB if saving as JPEG
        if img.mode == 'RGBA' and output_path.lower().endswith(('.jpg', '.jpeg')):
            img = img.convert('RGB')
        
        # Optimize and save
        img.save(output_path, optimize=True, quality=quality)
        
        original_size = os.path.getsize(image_path)
        optimized_size = os.path.getsize(output_path)
        savings = ((original_size - optimized_size) / original_size) * 100
        
        return {
            "success": True,
            "original_size": original_size,
            "optimized_size": optimized_size,
            "savings_percent": round(savings, 2)
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_pdf_info(pdf_path):
    """
    Get information about a PDF file
    """
    try:
        if 'PyPDF2' not in globals():
            return {"success": False, "error": "PyPDF2 not installed"}
        
        with open(pdf_path, 'rb') as file:
            pdf = PyPDF2.PdfReader(file)
            num_pages = len(pdf.pages)
            
            return {
                "success": True,
                "pages": num_pages,
                "size": os.path.getsize(pdf_path)
            }
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    """
    Main entry point for the script
    """
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)
    
    command = sys.argv[1]
    
    if command == "optimize_image" and len(sys.argv) >= 3:
        image_path = sys.argv[2]
        quality = int(sys.argv[3]) if len(sys.argv) >= 4 else 85
        result = optimize_image(image_path, quality=quality)
        print(json.dumps(result))
    
    elif command == "pdf_info" and len(sys.argv) >= 3:
        pdf_path = sys.argv[2]
        result = get_pdf_info(pdf_path)
        print(json.dumps(result))
    
    else:
        print(json.dumps({"error": "Invalid command"}))
        sys.exit(1)


if __name__ == "__main__":
    main()
