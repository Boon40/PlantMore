#!/usr/bin/env python3
"""
BioClip Service - Python microservice for plant classification using BioClip
This service provides a REST API that the Node.js backend can call.
"""

import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Allow cross-origin requests from Node.js backend

# Global variable to store the model (loaded lazily)
_model = None
_plant_classes = None

# Plant classes list (from your original model)
PLANT_CLASSES = [
    'African Violet (Saintpaulia ionantha)',
    'Aloe Vera',
    'Anthurium (Anthurium andraeanum)',
    'Areca Palm (Dypsis lutescens)',
    'Asparagus Fern (Asparagus setaceus)',
    'Begonia (Begonia spp.)',
    'Bird of Paradise (Strelitzia reginae)',
    'Birds Nest Fern (Asplenium nidus)',
    'Boston Fern (Nephrolepis exaltata)',
    'Calathea',
    'Cast Iron Plant (Aspidistra elatior)',
    'Chinese Money Plant (Pilea peperomioides)',
    'Chinese evergreen (Aglaonema)',
    'Christmas Cactus (Schlumbergera bridgesii)',
    'Chrysanthemum',
    'Ctenanthe',
    'Daffodils (Narcissus spp.)',
    'Dracaena',
    'Dumb Cane (Dieffenbachia spp.)',
    'Elephant Ear (Alocasia spp.)',
    'English Ivy (Hedera helix)',
    'Hyacinth (Hyacinthus orientalis)',
    'Iron Cross begonia (Begonia masoniana)',
    'Jade plant (Crassula ovata)',
    'Kalanchoe',
    'Lilium (Hemerocallis)',
    'Lily of the valley (Convallaria majalis)',
    'Money Tree (Pachira aquatica)',
    'Monstera Deliciosa (Monstera deliciosa)',
    'Orchid',
    'Parlor Palm (Chamaedorea elegans)',
    'Peace lily',
    'Poinsettia (Euphorbia pulcherrima)',
    'Polka Dot Plant (Hypoestes phyllostachya)',
    'Ponytail Palm (Beaucarnea recurvata)',
    'Pothos (Ivy arum)',
    'Prayer Plant (Maranta leuconeura)',
    'Rattlesnake Plant (Calathea lancifolia)',
    'Rubber Plant (Ficus elastica)',
    'Sago Palm (Cycas revoluta)',
    'Schefflera',
    'Snake plant (Sanseviera)',
    'Tradescantia',
    'Tulip',
    'Venus Flytrap',
    'Yucca',
    'ZZ Plant (Zamioculcas zamiifolia)'
]


def load_model():
    """Lazy load the BioClip model on first use."""
    global _model
    if _model is None:
        try:
            logger.info("Loading BioClip model...")
            
            # Try autodistill-bioclip first (recommended)
            try:
                import torch
                # Force CPU mode BEFORE importing autodistill_bioclip
                # The library checks CUDA availability at import time
                use_cpu = os.environ.get('BIOCLIP_USE_CPU', 'true').lower() == 'true'
                
                if use_cpu:
                    # Hide CUDA from PyTorch to force CPU mode
                    original_cuda_available = torch.cuda.is_available
                    torch.cuda.is_available = lambda: False
                    logger.info("Forcing CPU mode for BioClip (set BIOCLIP_USE_CPU=false to use GPU)")
                
                from autodistill_bioclip import BioCLIP
                from autodistill.detection import CaptionOntology
                
                # Create ontology mapping plant classes to prompts
                ontology_dict = {plant: plant for plant in PLANT_CLASSES}
                ontology = CaptionOntology(ontology_dict)
                
                _model = BioCLIP(ontology=ontology)
                
                # Restore original cuda.is_available if we patched it
                if use_cpu:
                    torch.cuda.is_available = original_cuda_available
                    # Ensure model is on CPU
                    if hasattr(_model, 'model') and hasattr(_model.model, 'to'):
                        _model.model = _model.model.to('cpu')
                        _model.model.eval()  # Set to eval mode
                    # Patch the predict method to ensure CPU usage
                    original_predict = _model.predict
                    def cpu_predict(input, confidence=0.5):
                        import torch
                        from autodistill.helpers import load_image
                        import supervision as sv
                        import numpy as np
                        
                        classes = _model.ontology.prompts()
                        image = load_image(input, return_format="PIL")
                        # Force preprocessing to CPU
                        image_tensor = _model.preprocess(image).unsqueeze(0).to('cpu')
                        
                        with torch.no_grad():
                            image_features = _model.model.encode_image(image_tensor)
                            text_features = _model.model.encode_text(
                                _model.tokenizer([f"This is a photo of a {class_}" for class_ in classes])
                            )
                            image_features /= image_features.norm(dim=-1, keepdim=True)
                            text_features /= text_features.norm(dim=-1, keepdim=True)
                            text_probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)
                            
                            return sv.Classifications(
                                class_id=np.array([i for i in range(len(classes))]),
                                confidence=text_probs.cpu().numpy()[0],
                            )
                    
                    _model.predict = cpu_predict
                    logger.info("Model patched to use CPU for all operations")
                else:
                    device = 'cuda' if torch.cuda.is_available() else 'cpu'
                    logger.info(f"Using {device} mode for BioClip")
                
                logger.info(f"Model initialized successfully")
                
                logger.info("✅ BioClip model loaded successfully using autodistill-bioclip!")
                
            except ImportError:
                # Fallback to pybioclip if autodistill is not available
                logger.info("autodistill-bioclip not found, trying pybioclip...")
                try:
                    from pybioclip import BioCLIP
                    _model = BioCLIP()
                    logger.info("✅ BioClip model loaded successfully using pybioclip!")
                except ImportError:
                    raise ImportError(
                        "Neither autodistill-bioclip nor pybioclip is installed. "
                        "Please install one: pip install autodistill-bioclip"
                    )
                    
        except ImportError as e:
            logger.error(f"❌ Failed to import BioClip: {e}")
            logger.error("Please install: pip install autodistill-bioclip")
            raise
        except Exception as e:
            logger.error(f"❌ Failed to load BioClip model: {e}")
            raise
    return _model


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    try:
        model = load_model()
        return jsonify({
            'status': 'ok',
            'model_loaded': model is not None
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


@app.route('/classify', methods=['POST'])
def classify_image():
    """
    Classify a plant image using BioClip.
    
    Expected request:
    - JSON body with 'image_path' (absolute path to image file)
    OR
    - Form data with 'image_path' field
    
    Returns:
    {
        "success": true,
        "prediction": "Plant Name",
        "confidence": 0.95,
        "top_k": [
            {"plant": "Plant Name", "confidence": 0.95},
            ...
        ]
    }
    """
    try:
        # Get image path from request
        if request.is_json:
            data = request.get_json()
            image_path = data.get('image_path')
        else:
            image_path = request.form.get('image_path')
        
        if not image_path:
            return jsonify({
                'success': False,
                'error': 'image_path is required'
            }), 400
        
        # Validate image path exists
        if not os.path.exists(image_path):
            return jsonify({
                'success': False,
                'error': f'Image file not found: {image_path}'
            }), 404
        
        # Load model
        model = load_model()
        
        # Load and preprocess image
        logger.info(f"Classifying image: {image_path}")
        image = Image.open(image_path).convert('RGB')
        
        # Use BioClip to classify
        # Try both image path and PIL Image object
        logger.info(f"Calling model.predict() on {image_path}")
        try:
            # First try with image path (autodistill-bioclip typically uses paths)
            results = model.predict(image_path)
        except Exception as e:
            logger.warning(f"predict() with path failed: {e}, trying with PIL Image object")
            # Fallback: try with PIL Image object
            results = model.predict(image)
        
        logger.info(f"Results type: {type(results)}, has get_top_k: {hasattr(results, 'get_top_k')}")
        
        # Get top prediction
        if hasattr(results, 'get_top_k'):
            try:
                top_k = results.get_top_k(k=min(5, len(PLANT_CLASSES)))
                logger.info(f"get_top_k returned: {top_k}, type: {type(top_k)}")
                
                # Handle different return formats
                # Format 1: tuple of arrays (class_ids, confidences)
                if isinstance(top_k, tuple) and len(top_k) == 2:
                    class_ids, confidences = top_k
                    # Convert numpy arrays to lists
                    if hasattr(class_ids, 'tolist'):
                        class_ids = class_ids.tolist()
                    if hasattr(confidences, 'tolist'):
                        confidences = confidences.tolist()
                    
                    # Zip them together
                    top_k_pairs = list(zip(class_ids, confidences))
                    logger.info(f"Processed top_k_pairs: {top_k_pairs}")
                # Format 2: list of tuples [(idx, score), ...]
                elif isinstance(top_k, list):
                    top_k_pairs = top_k
                else:
                    logger.error(f"Unexpected top_k format: {type(top_k)}")
                    raise ValueError(f"Unexpected top_k format: {type(top_k)}")
                
                if top_k_pairs and len(top_k_pairs) > 0:
                    # Get first prediction
                    top_idx, top_score = top_k_pairs[0]
                    
                    # Convert to int/float if needed
                    top_idx = int(top_idx)
                    top_score = float(top_score)
                    
                    # Validate indices are within bounds
                    if top_idx >= len(PLANT_CLASSES) or top_idx < 0:
                        logger.error(f"Invalid class index {top_idx}, max is {len(PLANT_CLASSES) - 1}")
                        raise ValueError(f"Class index {top_idx} out of range")
                    
                    predicted_plant = PLANT_CLASSES[top_idx]
                    confidence = top_score
                    
                    logger.info(f"Top prediction: {predicted_plant} with confidence {confidence}")
                    
                    # Format top k results
                    top_k_results = []
                    for idx, score in top_k_pairs:
                        idx = int(idx)
                        score = float(score)
                        if idx < len(PLANT_CLASSES):
                            top_k_results.append({
                                'plant': PLANT_CLASSES[idx],
                                'confidence': score
                            })
                    
                    return jsonify({
                        'success': True,
                        'prediction': predicted_plant,
                        'confidence': confidence,
                        'top_k': top_k_results
                    })
                else:
                    logger.warning("get_top_k returned empty or None")
                    raise ValueError("No predictions returned from model")
            except Exception as e:
                logger.error(f"Error processing get_top_k results: {e}", exc_info=True)
                raise
        else:
            # Fallback: if results structure is different
            logger.warning(f"Results object doesn't have get_top_k method. Type: {type(results)}, Value: {results}")
            if isinstance(results, dict):
                # Try to extract prediction from dict
                predicted_plant = results.get('prediction', 'Unknown')
                confidence = results.get('confidence', 0.0)
                logger.info(f"Extracted from dict: {predicted_plant} ({confidence})")
                return jsonify({
                    'success': True,
                    'prediction': predicted_plant,
                    'confidence': confidence,
                    'top_k': [{'plant': predicted_plant, 'confidence': confidence}]
                })
            else:
                # Log the actual results structure for debugging
                logger.error(f"Unexpected results structure: {type(results)} = {results}")
                raise ValueError(f"Unexpected results type: {type(results)}. Expected object with get_top_k() method.")
                
    except Exception as e:
        logger.error(f"Error during classification: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/classify/zero-shot', methods=['POST'])
def classify_zero_shot():
    """
    Zero-shot classification using BioClip with custom prompts.
    
    Expected request:
    {
        "image_path": "/path/to/image.jpg",
        "prompts": ["plant name 1", "plant name 2", ...]  # optional, defaults to PLANT_CLASSES
    }
    """
    try:
        data = request.get_json() if request.is_json else request.form.to_dict()
        image_path = data.get('image_path')
        prompts = data.get('prompts', PLANT_CLASSES)
        
        if not image_path:
            return jsonify({
                'success': False,
                'error': 'image_path is required'
            }), 400
        
        if not os.path.exists(image_path):
            return jsonify({
                'success': False,
                'error': f'Image file not found: {image_path}'
            }), 404
        
        model = load_model()
        logger.info(f"Zero-shot classifying image: {image_path}")
        
        # For autodistill-bioclip, we need to recreate the model with new prompts
        # This is a limitation - we'll use the existing model and filter results
        # For a production system, you might want to cache multiple models
        
        # Perform classification (model already has ontology, but we can filter)
        results = model.predict(image_path)
        
        # Process results
        if hasattr(results, 'get_top_k'):
            top_k = results.get_top_k(k=min(10, len(PLANT_CLASSES)))
            
            # Filter to only include prompts that were requested
            prompt_set = set(prompts)
            filtered_results = [
                (idx, score) for idx, score in top_k
                if PLANT_CLASSES[idx] in prompt_set
            ]
            
            if filtered_results:
                top_k_results = [
                    {
                        'plant': PLANT_CLASSES[idx],
                        'confidence': float(score)
                    }
                    for idx, score in filtered_results[:5]
                ]
                
                if top_k_results:
                    top_result = top_k_results[0]
                    return jsonify({
                        'success': True,
                        'prediction': top_result['plant'],
                        'confidence': top_result['confidence'],
                        'top_k': top_k_results
                    })
        
        return jsonify({
            'success': False,
            'error': 'Unable to process BioClip results or no matching predictions'
        }), 500
        
    except Exception as e:
        logger.error(f"Error during zero-shot classification: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/test', methods=['GET'])
def test_endpoint():
    """Test endpoint to check model loading and basic functionality."""
    try:
        model = load_model()
        model_type = type(model).__name__
        model_module = type(model).__module__
        
        # Try to get model info
        info = {
            'model_loaded': model is not None,
            'model_type': model_type,
            'model_module': model_module,
            'has_predict': hasattr(model, 'predict'),
        }
        
        # Test with a simple check
        if hasattr(model, 'predict'):
            info['predict_method'] = str(model.predict)
        
        return jsonify({
            'status': 'ok',
            'info': info,
            'plant_classes_count': len(PLANT_CLASSES)
        })
    except Exception as e:
        logger.error(f"Test endpoint error: {e}", exc_info=True)
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('BIOCLIP_PORT', 5000))
    host = os.environ.get('BIOCLIP_HOST', '127.0.0.1')
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting BioClip service on {host}:{port}")
    app.run(host=host, port=port, debug=debug)

