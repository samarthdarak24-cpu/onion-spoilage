"""
Flask REST API for Defect Detection System
===========================================

Provides HTTP endpoints for:
- Defect detection on uploaded images
- Size calibration
- Batch processing
- Report generation

Usage:
    python defect_api.py
    
Access at: http://localhost:5000
"""

import os
import io
import tempfile
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, List

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import cv2
import numpy as np

from defect_detection import (
    detect_defects_with_sizing,
    calibrate_size_detection,
    DEFECT_CLASSES,
    SIZE_CATEGORIES
)


# ==========================================================================
# APPLICATION SETUP
# ==========================================================================

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = Path(__file__).parent / "temp_uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)

app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}


# ==========================================================================
# HELPER FUNCTIONS
# ==========================================================================

def allowed_file(filename: str) -> bool:
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def cleanup_temp_file(filepath: str):
    """Remove temporary file"""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except Exception as e:
        print(f"Warning: Could not delete temp file {filepath}: {e}")


def save_upload(file) -> str:
    """Save uploaded file and return path"""
    if not file or not allowed_file(file.filename):
        raise ValueError("Invalid file or file type")
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    filename = f"upload_{timestamp}.jpg"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    
    file.save(filepath)
    return filepath


# ==========================================================================
# API ENDPOINTS
# ==========================================================================

@app.route('/')
def index():
    """API information endpoint"""
    return jsonify({
        "name": "Onion Defect Detection API",
        "version": "2.0",
        "endpoints": {
            "POST /api/detect": "Run defect detection on image",
            "POST /api/calibrate": "Calibrate size detection",
            "POST /api/batch": "Process multiple images",
            "GET /api/info": "Get system information",
            "GET /api/classes": "List defect classes",
            "GET /health": "Health check"
        },
        "status": "operational"
    })


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy"}), 200


@app.route('/api/info')
def api_info():
    """Get system information"""
    return jsonify({
        "model": {
            "type": "YOLO",
            "provider": "Roboflow",
            "model_id": "veg1-hcqsf-2/4"
        },
        "features": {
            "defect_detection": True,
            "size_estimation": True,
            "severity_classification": True,
            "batch_processing": True,
            "calibration": True
        },
        "supported_formats": list(ALLOWED_EXTENSIONS),
        "max_file_size_mb": 16
    })


@app.route('/api/classes')
def get_classes():
    """Get list of defect classes"""
    return jsonify({
        "defect_classes": DEFECT_CLASSES,
        "size_categories": SIZE_CATEGORIES
    })


@app.route('/api/detect', methods=['POST'])
def detect_defects():
    """
    Run defect detection on uploaded image
    
    Request:
        - image: File (required)
        - pixels_per_cm: Float (optional, default 20.0)
        - confidence_threshold: Float (optional, default 0.4)
        - return_image: Bool (optional, default false)
    
    Response:
        JSON with detection results
    """
    
    # Validate request
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files['image']
    
    if image_file.filename == '':
        return jsonify({"error": "Empty filename"}), 400
    
    # Get parameters
    pixels_per_cm = float(request.form.get('pixels_per_cm', 20.0))
    confidence_threshold = float(request.form.get('confidence_threshold', 0.4))
    return_image = request.form.get('return_image', 'false').lower() == 'true'
    
    # Validate parameters
    if not (1.0 <= pixels_per_cm <= 100.0):
        return jsonify({"error": "pixels_per_cm must be between 1.0 and 100.0"}), 400
    
    if not (0.1 <= confidence_threshold <= 1.0):
        return jsonify({"error": "confidence_threshold must be between 0.1 and 1.0"}), 400
    
    filepath = None
    
    try:
        # Save uploaded file
        filepath = save_upload(image_file)
        
        # Run detection
        results = detect_defects_with_sizing(
            filepath,
            pixels_per_cm=pixels_per_cm,
            confidence_threshold=confidence_threshold
        )

        # Source image dimensions — lets downstream clients convert pixel
        # bounding boxes into percentage overlays.
        _img = cv2.imread(filepath)
        image_dimensions = {}
        if _img is not None:
            image_dimensions = {"width": _img.shape[1], "height": _img.shape[0]}
        
        # Prepare response
        response_data = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "total_detected": results["total_detected"],
            "defect_summary": results["defect_summary"],
            "severity_summary": results["severity_summary"],
            "statistics": results["statistics"],
            "detections": results["detections"],
            "calibration": results["calibration"],
            "image_dimensions": image_dimensions
        }
        
        # Optionally include base64 encoded image
        if return_image:
            _, buffer = cv2.imencode('.jpg', results["annotated_image"])
            import base64
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            response_data["annotated_image_base64"] = img_base64
        
        return jsonify(response_data), 200
    
    except ValueError as e:
        return jsonify({"error": f"Validation error: {str(e)}"}), 400
    
    except Exception as e:
        return jsonify({"error": f"Detection failed: {str(e)}"}), 500
    
    finally:
        if filepath:
            cleanup_temp_file(filepath)


@app.route('/api/calibrate', methods=['POST'])
def calibrate():
    """
    Calibrate size detection using reference onion
    
    Request:
        - image: File (required)
        - known_diameter_cm: Float (required)
    
    Response:
        JSON with calibrated pixels_per_cm ratio
    """
    
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files['image']
    
    if 'known_diameter_cm' not in request.form:
        return jsonify({"error": "known_diameter_cm parameter required"}), 400
    
    try:
        known_diameter = float(request.form['known_diameter_cm'])
    except ValueError:
        return jsonify({"error": "known_diameter_cm must be a number"}), 400
    
    if not (1.0 <= known_diameter <= 20.0):
        return jsonify({"error": "known_diameter_cm must be between 1.0 and 20.0 cm"}), 400
    
    filepath = None
    
    try:
        filepath = save_upload(image_file)
        
        pixels_per_cm = calibrate_size_detection(
            filepath,
            known_diameter
        )
        
        return jsonify({
            "success": True,
            "pixels_per_cm": pixels_per_cm,
            "known_diameter_cm": known_diameter,
            "message": "Calibration successful"
        }), 200
    
    except Exception as e:
        return jsonify({"error": f"Calibration failed: {str(e)}"}), 500
    
    finally:
        if filepath:
            cleanup_temp_file(filepath)


@app.route('/api/batch', methods=['POST'])
def batch_process():
    """
    Process multiple images in batch
    
    Request:
        - images: Multiple file uploads
        - pixels_per_cm: Float (optional, default 20.0)
        - confidence_threshold: Float (optional, default 0.4)
    
    Response:
        JSON array with results for each image
    """
    
    if 'images' not in request.files:
        return jsonify({"error": "No images provided"}), 400
    
    files = request.files.getlist('images')
    
    if len(files) == 0:
        return jsonify({"error": "No images in request"}), 400
    
    if len(files) > 50:
        return jsonify({"error": "Maximum 50 images per batch"}), 400
    
    pixels_per_cm = float(request.form.get('pixels_per_cm', 20.0))
    confidence_threshold = float(request.form.get('confidence_threshold', 0.4))
    
    batch_results = []
    processed_files = []
    
    try:
        for idx, file in enumerate(files):
            
            if not allowed_file(file.filename):
                batch_results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": "Invalid file type"
                })
                continue
            
            filepath = None
            
            try:
                filepath = save_upload(file)
                processed_files.append(filepath)
                
                results = detect_defects_with_sizing(
                    filepath,
                    pixels_per_cm=pixels_per_cm,
                    confidence_threshold=confidence_threshold
                )
                
                batch_results.append({
                    "filename": file.filename,
                    "success": True,
                    "total_detected": results["total_detected"],
                    "statistics": results["statistics"],
                    "severity_summary": results["severity_summary"]
                })
            
            except Exception as e:
                batch_results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": str(e)
                })
        
        # Calculate aggregate statistics
        successful_results = [r for r in batch_results if r.get("success")]
        
        aggregate_stats = {
            "total_images": len(files),
            "successful": len(successful_results),
            "failed": len(files) - len(successful_results),
            "total_onions_detected": sum(
                r.get("total_detected", 0) for r in successful_results
            ),
            "average_defect_rate": np.mean([
                r["statistics"]["defect_rate"] 
                for r in successful_results
            ]) if successful_results else 0
        }
        
        return jsonify({
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "aggregate_statistics": aggregate_stats,
            "results": batch_results
        }), 200
    
    except Exception as e:
        return jsonify({"error": f"Batch processing failed: {str(e)}"}), 500
    
    finally:
        # Cleanup all temporary files
        for filepath in processed_files:
            cleanup_temp_file(filepath)


@app.route('/api/detect-annotated', methods=['POST'])
def detect_with_image():
    """
    Run detection and return annotated image file
    
    Request:
        - image: File (required)
        - pixels_per_cm: Float (optional, default 20.0)
        - confidence_threshold: Float (optional, default 0.4)
    
    Response:
        Image file (JPEG) with bounding boxes and labels
    """
    
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    
    image_file = request.files['image']
    pixels_per_cm = float(request.form.get('pixels_per_cm', 20.0))
    confidence_threshold = float(request.form.get('confidence_threshold', 0.4))
    
    filepath = None
    output_path = None
    
    try:
        filepath = save_upload(image_file)
        
        results = detect_defects_with_sizing(
            filepath,
            pixels_per_cm=pixels_per_cm,
            confidence_threshold=confidence_threshold
        )
        
        # Save annotated image
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = os.path.join(
            app.config['UPLOAD_FOLDER'],
            f"annotated_{timestamp}.jpg"
        )
        
        cv2.imwrite(output_path, results["annotated_image"])
        
        return send_file(
            output_path,
            mimetype='image/jpeg',
            as_attachment=True,
            download_name='defect_detection_result.jpg'
        )
    
    except Exception as e:
        return jsonify({"error": f"Detection failed: {str(e)}"}), 500
    
    finally:
        if filepath:
            cleanup_temp_file(filepath)
        if output_path:
            # Schedule cleanup after response is sent
            @app.after_request
            def cleanup(response):
                cleanup_temp_file(output_path)
                return response


# ==========================================================================
# ERROR HANDLERS
# ==========================================================================

@app.errorhandler(413)
def file_too_large(e):
    return jsonify({"error": "File too large. Maximum size is 16MB"}), 413


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found"}), 404


@app.errorhandler(500)
def internal_error(e):
    return jsonify({"error": "Internal server error"}), 500


# ==========================================================================
# LIVE CAMERA ENDPOINTS
# ==========================================================================

@app.route('/api/camera/status', methods=['GET'])
def camera_status():
    """
    Check if camera is available for live inspection.
    
    Returns:
        {
            "available": true/false,
            "camera_index": 0,
            "message": "..."
        }
    """
    cap = None
    try:
        import time
        start_time = time.time()
        timeout = 5  # 5 second timeout
        
        cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # Use DirectShow on Windows
        
        # Wait for camera to open with timeout
        while not cap.isOpened() and (time.time() - start_time) < timeout:
            time.sleep(0.1)
        
        available = cap.isOpened()
        
        if available:
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = int(cap.get(cv2.CAP_PROP_FPS))
            
            return jsonify({
                "available": True,
                "camera_index": 0,
                "resolution": f"{width}x{height}",
                "fps": fps if fps > 0 else 30,
                "message": "Camera ready for live inspection"
            })
        else:
            return jsonify({
                "available": False,
                "message": "No camera detected or camera timeout"
            }), 404
    
    except Exception as e:
        import traceback
        print(f"Camera status error: {e}")
        print(traceback.format_exc())
        return jsonify({
            "available": False,
            "error": str(e),
            "message": "Camera check failed"
        }), 500
    
    finally:
        if cap:
            try:
                cap.release()
            except:
                pass


@app.route('/api/camera/frame', methods=['GET'])
def get_camera_frame():
    """
    Get single camera frame with detection (for web integration).
    
    Query params:
        - detect: if true, run AI detection on frame
        - format: 'json' for base64, 'image' for direct image (default: image)
    
    Returns:
        Direct image file with detections or JSON with base64
    """
    filepath = None
    cap = None
    
    try:
        import base64
        import time
        
        # Check if detection is requested
        run_detection = request.args.get('detect', 'false').lower() == 'true'
        response_format = request.args.get('format', 'image')
        
        # Capture frame with retry logic
        max_retries = 3
        frame = None
        
        for attempt in range(max_retries):
            cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # Use DirectShow on Windows for better compatibility
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            
            if not cap.isOpened():
                if cap:
                    cap.release()
                time.sleep(0.1)
                continue
            
            # Wait for camera to initialize
            time.sleep(0.05)
            
            # Try to read frame
            ret, frame = cap.read()
            cap.release()
            
            if ret and frame is not None:
                break
            
            time.sleep(0.1)
        
        if frame is None:
            return jsonify({"error": "Failed to capture frame after retries"}), 500
        
        # Process frame
        if run_detection:
            # Save temporary frame
            filepath = OUTPUT_DIR / f"temp_camera_frame_{int(time.time() * 1000)}.jpg"
            cv2.imwrite(str(filepath), frame)
            
            # Run detection
            result = detect_defects_with_sizing(
                str(filepath),
                confidence_threshold=0.4
            )
            
            processed_frame = result["annotated_image"]
            detections = result.get("detections", [])
            statistics = result.get("statistics", {})
        else:
            processed_frame = frame
            detections = []
            statistics = {}
        
        # Encode frame
        _, buffer = cv2.imencode('.jpg', processed_frame)
        
        # Return based on format
        if response_format == 'json':
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            return jsonify({
                "success": True,
                "image": f"data:image/jpeg;base64,{img_base64}",
                "detections": detections,
                "statistics": statistics,
                "timestamp": datetime.now().isoformat()
            })
        else:
            # Return image directly
            return send_file(
                io.BytesIO(buffer.tobytes()),
                mimetype='image/jpeg',
                as_attachment=False
            )
    
    except Exception as e:
        import traceback
        print(f"Camera frame error: {e}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
    finally:
        if cap:
            cap.release()
        if filepath:
            cleanup_temp_file(filepath)


# ==========================================================================
# MAIN
# ==========================================================================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("Defect Detection API Server")
    print("="*60)
    print("\nEndpoints:")
    print("  POST /api/detect              - Run defect detection")
    print("  POST /api/calibrate           - Calibrate size estimation")
    print("  POST /api/batch               - Batch processing")
    print("  POST /api/detect-annotated    - Get annotated image")
    print("  GET  /api/camera/status       - Check camera availability")
    print("  GET  /api/camera/frame        - Get single camera frame")
    print("  GET  /api/info                - System information")
    print("  GET  /api/classes             - List defect classes")
    print("  GET  /health                  - Health check")
    print("\nStarting server on http://0.0.0.0:5000")
    print("="*60 + "\n")
    
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True
    )
