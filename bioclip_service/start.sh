#!/bin/bash
# Startup script for BioClip service

set -e

echo "🌿 Starting BioClip Service..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Set default environment variables if not set
export BIOCLIP_PORT=${BIOCLIP_PORT:-5000}
export BIOCLIP_HOST=${BIOCLIP_HOST:-127.0.0.1}
export FLASK_DEBUG=${FLASK_DEBUG:-false}

echo "✅ Starting service on ${BIOCLIP_HOST}:${BIOCLIP_PORT}"
python app.py

