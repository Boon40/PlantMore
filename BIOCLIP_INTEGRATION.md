# BioClip Integration Guide - Step by Step

This guide walks you through integrating BioClip into your PlantMore application.

## Overview

BioClip replaces your custom MobileNetV2 model with a more powerful, pre-trained vision-language model specifically designed for biological image classification.

## Integration Steps

### Step 1: Install BioClip Service Dependencies

```bash
cd bioclip_service
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

This installs:
- `autodistill-bioclip` - BioClip integration package
- `flask` - Web framework for the API
- `flask-cors` - CORS support
- `Pillow` - Image processing

### Step 2: Start the BioClip Service

**Option A: Using startup script (Recommended)**
```bash
cd bioclip_service
./start.sh  # Linux/Mac
# or
start.bat   # Windows
```

**Option B: Manual start**
```bash
cd bioclip_service
source venv/bin/activate
python app.py
```

The service will start on `http://127.0.0.1:5000` by default.

**Verify it's running:**
```bash
curl http://localhost:5000/health
```

You should see:
```json
{
  "status": "ok",
  "model_loaded": true
}
```

### Step 3: Configure Backend to Use BioClip

The backend is already configured to use BioClip! The integration is complete.

**Optional:** Set environment variables in `backend/.env`:
```env
BIOCLIP_SERVICE_URL=http://127.0.0.1:5000
BIOCLIP_TIMEOUT=30000
```

### Step 4: Test the Integration

1. **Start your backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Check BioClip health from backend:**
   ```bash
   curl http://localhost:3001/api/image/bioclip/health
   ```

3. **Test classification:**
   - Upload an image through your frontend
   - Or use the API directly:
   ```bash
   # First upload an image
   curl -X POST http://localhost:3001/api/image/upload \
     -F "file=@/path/to/plant/image.jpg" \
     -F "message_id=1" \
     -F "auto_classify=true"
   ```

### Step 5: Use Classification in Your App

#### Automatic Classification on Upload

When uploading an image, add `auto_classify=true`:

```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('message_id', messageId);
formData.append('auto_classify', 'true');

const response = await fetch('/api/image/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// result.classification contains the prediction
```

#### Manual Classification

Classify an already uploaded image:

```javascript
// Classify by image ID
const response = await fetch(`/api/image/${imageId}/classify`, {
  method: 'POST'
});

const classification = await response.json();
// classification.prediction - plant name
// classification.confidence - confidence score
// classification.top_k - top 5 predictions
```

## API Reference

### BioClip Service Endpoints

#### `GET /health`
Check if the service is running and model is loaded.

**Response:**
```json
{
  "status": "ok",
  "model_loaded": true
}
```

#### `POST /classify`
Classify a plant image.

**Request:**
```json
{
  "image_path": "/absolute/path/to/image.jpg"
}
```

**Response:**
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

### Backend Endpoints

#### `POST /api/image/upload`
Upload an image (optionally with auto-classification).

**Form Data:**
- `file`: Image file
- `message_id`: Message ID (integer)
- `auto_classify`: "true" to automatically classify (optional)

#### `POST /api/image/:id/classify`
Classify an uploaded image by ID.

**Response:**
```json
{
  "success": true,
  "prediction": "Monstera Deliciosa",
  "confidence": 0.92,
  "top_k": [...]
}
```

#### `GET /api/image/bioclip/health`
Check BioClip service health from backend.

## Troubleshooting

### Issue: BioClip service won't start

**Solution:**
1. Check Python version: `python3 --version` (needs 3.8+)
2. Verify virtual environment is activated
3. Check if dependencies installed: `pip list | grep bioclip`
4. Check logs for specific error messages

### Issue: Model loading fails

**Solution:**
1. Ensure internet connection (model downloads on first use)
2. Check available disk space (models can be several GB)
3. Verify `autodistill-bioclip` is installed: `pip install autodistill-bioclip`
4. Check system RAM (models require significant memory)

### Issue: Classification returns errors

**Solution:**
1. Verify BioClip service is running: `curl http://localhost:5000/health`
2. Check image path is absolute (not relative)
3. Verify image file exists and is readable
4. Check backend logs for connection errors

### Issue: Timeout errors

**Solution:**
1. First classification takes longer (model loading)
2. Increase timeout: Set `BIOCLIP_TIMEOUT=60000` in backend `.env`
3. Check system resources (CPU/RAM)

## Migration Notes

### What Changed

1. **Removed:** Custom MobileNetV2 model (`MobileNetV2_202511031208.keras`)
2. **Added:** Python BioClip service (`bioclip_service/`)
3. **Updated:** Backend image routes to call BioClip service
4. **Added:** New classification endpoints

### Backward Compatibility

- Existing image uploads still work
- Classification is now optional (opt-in with `auto_classify`)
- Old model files can be safely removed

### Performance Considerations

- **First request:** Slow (30-60s) - model loads on first use
- **Subsequent requests:** Fast (1-3s per image)
- **Memory:** BioClip requires more RAM than MobileNetV2
- **Accuracy:** BioClip generally provides better accuracy, especially for rare plants

## Next Steps

1. ✅ BioClip service is integrated
2. ✅ Backend can call BioClip service
3. ✅ Classification endpoints are available
4. 🔄 Update frontend to display classification results
5. 🔄 Add classification UI/UX improvements
6. 🔄 Consider caching frequently classified images

## Support

If you encounter issues:
1. Check the logs in both services
2. Verify all services are running
3. Test the BioClip service directly first
4. Check network connectivity between services

