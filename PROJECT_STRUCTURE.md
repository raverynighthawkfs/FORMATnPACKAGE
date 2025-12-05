# FORMATnPACKAGE - Project Structure

## Directory Structure

```
FORMATnPACKAGE/
├── src/
│   ├── main.js              # Electron main process
│   ├── main/                # Main process modules
│   ├── renderer/            # Renderer process modules
│   ├── utils/               # Utility functions
│   │   └── fileUtils.js     # File handling utilities
│   └── python/              # Python scripts for file processing
│       └── file_processor.py # Image/PDF optimization
├── public/
│   ├── index.html           # Main UI
│   ├── css/
│   │   └── styles.css       # Application styles
│   ├── js/
│   │   └── renderer.js      # Renderer process logic
│   └── images/              # Application assets
├── tests/                   # Test files
├── package.json             # Node.js dependencies
└── requirements.txt         # Python dependencies
```

## Setup Instructions

### NodeJS Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Run in development mode:
   ```bash
   npm run dev
   ```

3. Start the application:
   ```bash
   npm start
   ```

### Python Setup
1. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Features

- **File Sorting**: Automatically categorizes files by type
- **File Optimization**: Compresses images and optimizes PDFs
- **Batch Processing**: Process multiple files at once
- **Custom Output**: Choose where to save processed files
- **Cross-Platform**: Works on Mac, Windows, and Linux

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **Backend**: Electron, Node.js
- **File Processing**: Python (Pillow, PyPDF2)
- **File System**: fs-extra, mime-types
