# PlantMore

A plant identification and care assistant application using BioClip for plant classification.

## Architecture

This project consists of:
- **Frontend**: React/Vite application
- **Backend**: Node.js/Express API
- **BioClip Service**: Python microservice for plant classification using BioClip

## Prerequisites

- Node.js (v18+)
- Python 3.8+
- PostgreSQL (via Docker Compose)
- pip (Python package manager)

## Setup Instructions

### 1. Database Setup

Start PostgreSQL using Docker Compose:

```bash
cd backend
npm run db:up
```

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

The backend will run on `http://localhost:3001`

### 3. BioClip Service Setup

The BioClip service is a Python microservice that handles plant classification.

#### Option A: Using the startup script (Recommended)

**Linux/Mac:**
```bash
cd bioclip_service
chmod +x start.sh
./start.sh
```

**Windows:**
```bash
cd bioclip_service
start.bat
```

#### Option B: Manual setup

```bash
cd bioclip_service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the service
python app.py
```

The BioClip service will run on `http://127.0.0.1:5000` by default.

#### Environment Variables

You can customize the BioClip service with environment variables:

- `BIOCLIP_PORT`: Port number (default: 5000)
- `BIOCLIP_HOST`: Host address (default: 127.0.0.1)
- `FLASK_DEBUG`: Enable debug mode (default: false)

Example:
```bash
BIOCLIP_PORT=5000 BIOCLIP_HOST=0.0.0.0 python app.py
```

### 4. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` (or another port if 5173 is busy)

## BioClip Integration

### How It Works

1. **Image Upload**: Users upload plant images through the frontend
2. **Backend Processing**: The Node.js backend receives the image and stores it
3. **Classification**: The backend calls the Python BioClip service to classify the plant
4. **Response**: Classification results are returned to the frontend

### API Endpoints

#### BioClip Service (Python)

- `GET /health` - Health check
- `POST /classify` - Classify an image
  ```json
  {
    "image_path": "/absolute/path/to/image.jpg"
  }
  ```
- `POST /classify/zero-shot` - Zero-shot classification with custom prompts

#### Backend API (Node.js)

- `POST /api/image/upload` - Upload an image
  - Add `auto_classify=true` to automatically classify on upload
- `POST /api/image/:id/classify` - Classify an uploaded image by ID
- `GET /api/image/bioclip/health` - Check BioClip service health

### Testing the Integration

1. **Check BioClip service health:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Test classification:**
   ```bash
   curl -X POST http://localhost:5000/classify \
     -H "Content-Type: application/json" \
     -d '{"image_path": "/absolute/path/to/test/image.jpg"}'
   ```

3. **Check from backend:**
   ```bash
   curl http://localhost:3001/api/image/bioclip/health
   ```

## Configuration

### Backend Configuration

The backend connects to the BioClip service via environment variables:

- `BIOCLIP_SERVICE_URL`: URL of the BioClip service (default: `http://127.0.0.1:5000`)
- `BIOCLIP_TIMEOUT`: Request timeout in milliseconds (default: 30000)

Add these to your `.env` file in the `backend` directory:

```env
BIOCLIP_SERVICE_URL=http://127.0.0.1:5000
BIOCLIP_TIMEOUT=30000
```

## Troubleshooting

### BioClip Service Not Starting

1. **Check Python version:**
   ```bash
   python3 --version  # Should be 3.8+
   ```

2. **Check dependencies:**
   ```bash
   cd bioclip_service
   pip list | grep -i bioclip
   ```

3. **Check logs:** The service will log errors if the model fails to load

### Classification Not Working

1. **Verify BioClip service is running:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check backend can reach service:**
   ```bash
   curl http://localhost:3001/api/image/bioclip/health
   ```

3. **Check image paths:** Ensure absolute paths are used when calling the classification API

### Model Loading Issues

- The first classification request will load the model (may take 30-60 seconds)
- Ensure you have sufficient RAM (BioClip models can be large)
- Check that `autodistill-bioclip` is properly installed:
  ```bash
  pip install autodistill-bioclip
  ```

## Development

### Running in Development Mode

1. Start all services in separate terminals:
   - Terminal 1: `cd backend && npm run dev`
   - Terminal 2: `cd bioclip_service && ./start.sh` (or `python app.py`)
   - Terminal 3: `cd frontend && npm run dev`

2. Enable debug mode for BioClip service:
   ```bash
   FLASK_DEBUG=true python app.py
   ```

## Production Deployment

For production:

1. Use a process manager (PM2, systemd, etc.) for the Node.js backend
2. Use gunicorn or uwsgi for the Python service:
   ```bash
   pip install gunicorn
   gunicorn -w 2 -b 0.0.0.0:5000 app:app
   ```
3. Set up proper environment variables
4. Configure reverse proxy (nginx) if needed
5. Monitor service health endpoints

## License

[Your License Here]
