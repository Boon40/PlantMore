# BioClip Service

Python microservice for plant classification using BioClip.

## Setup

1. Install dependencies:
```bash
cd bioclip_service
pip install -r requirements.txt
```

2. Run the service:
```bash
python app.py
```

Or with environment variables:
```bash
BIOCLIP_PORT=5000 BIOCLIP_HOST=127.0.0.1 python app.py
```

## API Endpoints

### Health Check
```
GET /health
```

### Classify Image
```
POST /classify
Content-Type: application/json

{
  "image_path": "/absolute/path/to/image.jpg"
}
```

Response:
```json
{
  "success": true,
  "prediction": "Aloe Vera",
  "confidence": 0.95,
  "top_k": [
    {"plant": "Aloe Vera", "confidence": 0.95},
    {"plant": "Jade plant (Crassula ovata)", "confidence": 0.03},
    ...
  ]
}
```

### Zero-shot Classification
```
POST /classify/zero-shot
Content-Type: application/json

{
  "image_path": "/absolute/path/to/image.jpg",
  "prompts": ["Aloe Vera", "Monstera", ...]  // optional
}
```

## Integration with Node.js Backend

The Node.js backend calls this service via HTTP. Make sure this service is running before starting the backend.

