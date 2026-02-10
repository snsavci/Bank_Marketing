#!/bin/bash

echo "Starting Bank Marketing API Server..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    exit 1
fi

# Check if virtual environment exists
if [ -d "venv" ]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
else
    echo "WARNING: Virtual environment not found. Using system Python."
    echo "Consider creating a virtual environment: python3 -m venv venv"
    echo ""
fi

# Check if requirements are installed
if ! python3 -c "import fastapi" &> /dev/null; then
    echo "Installing requirements..."
    pip install -r requirements.txt
    echo ""
fi

# Start the API server
echo "Starting FastAPI server on http://127.0.0.1:8000"
echo "API Documentation: http://127.0.0.1:8000/docs"
echo ""
python3 -m uvicorn api:app --reload --host 0.0.0.0 --port 8000


