#!/usr/bin/env python3
"""
OnionSure - Local YOLO Flask Service
====================================
Flask API server that runs the trained YOLOv8 models locally:
  1. YOLOv8-seg (onion detection)
  2. YOLOv8-cls (healthy/unhealthy classification)

Endpoints:
  GET  /api/health         - health check
  POST /api/detect         - upload image, get detection results
  POST /api/detect-base64  - send base64 image, get detection results

Response format matches what OnionSure's ai.js mapOnionCheckToVision expects.
"""

import io
import base64
import numpy as np
from pathlib import Path
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import cv2
from ultralytics import YOLO

# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent
ONIONCHECK_DIR = BASE_DIR.parent / "onioncheck"

SEG_MODEL_PATH = ONIONCHECK_DIR / "runs" / "segment" / "runs" / "onion_seg_test" / "weights" / "best.pt"
CLS_MODEL_PATH = ONIONCHECK_DIR / "runs" / "classify" / "runs" / "onion_cls" / "weights" / "best.pt"

INFERENCE_SIZE = 640
CLS_INFER_SIZE = 224
CONFIDENCE = 0.25
IOU_THRESHOLD = 0.4
MAX_DET = 30

CLASSES = ["healthy", "damaged", "rotten", "sprouted", "undersized"]

# Quality weights for vision score calculation
QUALITY_WEIGHT = {
    "healthy": 1.0,
    "undersized": 0.7,
    "damaged": 0.6,
    "sprouted": 0.3,
    "rotten": 0.0,
}

app = Flask(__name__)
CORS(app)

# Load models once at startup
print("=" * 60)
print("  OnionSure Local YOLO Flask Service")
print("=" * 60)

print(f"  Loading segmentation model: {SEG_MODEL_PATH}")
if not SEG_MODEL_PATH.exists():
    raise FileNotFoundError(f"Seg model not found: {SEG_MODEL_PATH}")
seg_model = YOLO(str(SEG_MODEL_PATH))
seg_names = seg_model.names if hasattr(seg_model, "names") else {0: "onion"}
print(f"  Seg classes: {seg_names}")

print(f"  Loading classification model: {CLS_MODEL_PATH}")
if not CLS_MODEL_PATH.exists():
    raise FileNotFoundError(f"Cls model not found: {CLS_MODEL_PATH}")
cls_model = YOLO(str(CLS_MODEL_PATH))
cls_names = cls_model.names if hasattr(cls_model, "names") else {0: "healthy", 1: "unhealthy"}
print(f"  Cls classes: {cls_names}")
print("=" * 60)


# ==========================================================================
# DETECTION LOGIC
# ==========================================================================

def run_detection(image_bgr):
    """Run seg + cls detection on a BGR numpy image."""
    h_img, w_img = image_bgr.shape[:2]

    # Step 1: Segmentation
    seg_results = seg_model(
        image_bgr,
        conf=CONFIDENCE,
        imgsz=INFERENCE_SIZE,
        iou=IOU_THRESHOLD,
        max_det=MAX_DET,
        verbose=False,
        retina_masks=True,
    )

    if not seg_results or len(seg_results) == 0:
        return {"success": False, "error": "No results"}, None

    result = seg_results[0]
    if result.boxes is None or len(result.boxes) == 0:
        return {"success": False, "error": "No onions detected"}, None

    boxes = result.boxes
    masks = result.masks if result.masks is not None else None

    detections = []
    counts = {"healthy": 0, "damaged": 0, "rotten": 0, "sprouted": 0, "undersized": 0}

    for i in range(len(boxes)):
        x1, y1, x2, y2 = boxes.xyxy[i].cpu().numpy()
        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
        seg_conf = float(boxes.conf[i].item())

        # Filter false positives
        box_w = x2 - x1
        box_h = y2 - y1
        if box_w < 30 or box_h < 30:
            continue

        margin = 5
        if x1 <= margin and y1 <= margin:
            continue
        if x2 >= w_img - margin and y2 >= h_img - margin:
            continue

        aspect = box_w / box_h if box_h > 0 else 0
        if aspect > 3.0 or aspect < 0.33:
            continue

        # Step 2: Classification
        pad = int(min(box_w, box_h) * 0.1)
        cx1 = max(0, x1 - pad)
        cy1 = max(0, y1 - pad)
        cx2 = min(w_img, x2 + pad)
        cy2 = min(h_img, y2 + pad)

        crop = image_bgr[cy1:cy2, cx1:cx2]

        cls_name = "unknown"
        cls_conf = 0.0
        if crop.size > 0 and crop.shape[0] >= 10 and crop.shape[1] >= 10:
            cls_results = cls_model(crop, imgsz=CLS_INFER_SIZE, verbose=False)
            if cls_results and len(cls_results) > 0:
                cls_result = cls_results[0]
                if cls_result.probs is not None:
                    probs = cls_result.probs
                    top1_idx = int(probs.top1)
                    cls_name = cls_names.get(top1_idx, f"class_{top1_idx}")
                    cls_conf = float(probs.top1conf)

        # Map to OnionSure 5-class model
        if cls_name.lower() == "healthy":
            onionsure_class = "healthy"
        elif cls_name.lower() == "unhealthy":
            onionsure_class = "damaged"
        else:
            onionsure_class = "damaged"

        # Size estimation (rough diameter in cm, assuming ~20 px/cm)
        diameter_px = (box_w + box_h) / 2
        diameter_cm = round(diameter_px / 20.0, 2)
        if diameter_cm < 4.0:
            onionsure_class = "undersized"

        counts[onionsure_class] += 1

        # Bounding box in percentage for frontend overlay
        bbox_pct = {
            "x": round((x1 / w_img) * 100, 2),
            "y": round((y1 / h_img) * 100, 2),
            "width": round((box_w / w_img) * 100, 2),
            "height": round((box_h / h_img) * 100, 2),
        }

        # Pixel coordinates for backend processing
        bbox_px = {"x1": x1, "y1": y1, "x2": x2, "y2": y2, "width_px": box_w, "height_px": box_h}

        detections.append({
            "id": f"det_{i}",
            "class": onionsure_class,
            "label": cls_name,
            "confidence": round(seg_conf, 2),
            "classification_confidence": round(cls_conf, 2),
            "bbox": bbox_pct,
            "bounding_box": bbox_px,
            "size": int(diameter_cm * 10),  # mm
            "diameter_cm": diameter_cm,
            "category": "healthy" if cls_name.lower() == "healthy" else "defective",
        })

    total = len(detections)
    if total == 0:
        return {"success": False, "error": "No valid onions detected after filtering"}, None

    # Calculate percentages
    percentages = {c: round((counts[c] / total) * 100, 1) for c in CLASSES}

    # Vision score: weighted average of quality classes
    weighted = sum(counts[c] * QUALITY_WEIGHT[c] for c in CLASSES)
    vision_score = round(100 * (weighted / total))

    # Defect rate
    defect_count = total - counts["healthy"]
    defect_rate = round((defect_count / total) * 100, 1)

    # Draw annotated image
    annotated = image_bgr.copy()
    for det in detections:
        bx = det["bounding_box"]
        x1, y1 = bx["x1"], bx["y1"]
        x2, y2 = bx["x2"], bx["y2"]
        color = (0, 200, 0) if det["class"] == "healthy" else (0, 0, 255)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 3)
        label = f"#{det['id'].split('_')[1]} {det['label']} {det['classification_confidence']:.2f}"
        cv2.putText(annotated, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)

    return {
        "success": True,
        "mode": "YOLO_LOCAL",
        "total": total,
        "counts": counts,
        "percentages": percentages,
        "visionScore": vision_score,
        "defect_rate": defect_rate,
        "confidence": 0.95,
        "detections": detections,
        "statistics": {
            "total_detected": total,
            "defect_rate": defect_rate,
            "vision_score": vision_score,
            "confidence": 0.95,
        },
        "image_dimensions": {"width": w_img, "height": h_img},
        "annotated_image": annotated,
    }, annotated


def image_to_base64(image_bgr):
    """Convert BGR image to base64 string."""
    _, buffer = cv2.imencode(".jpg", image_bgr, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode("utf-8")


# ==========================================================================
# API ENDPOINTS
# ==========================================================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "onionsure-yolo-local",
        "mode": "YOLO_LOCAL",
        "models": {
            "segmentation": str(SEG_MODEL_PATH.name),
            "classification": str(CLS_MODEL_PATH.name),
        },
        "time": datetime.now().isoformat(),
    })


@app.route("/api/detect", methods=["POST"])
def detect():
    """Upload an image file and get detection results."""
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image file provided"}), 400

    file = request.files["image"]
    if not file or file.filename == "":
        return jsonify({"success": False, "error": "Empty file"}), 400

    # Read image
    in_memory = io.BytesIO()
    file.save(in_memory)
    in_memory.seek(0)

    try:
        pil_image = Image.open(in_memory).convert("RGB")
        image_bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        return jsonify({"success": False, "error": f"Invalid image: {e}"}), 400

    # Run detection
    result, annotated = run_detection(image_bgr)

    if annotated is not None:
        result["annotated_image_base64"] = image_to_base64(annotated)

    return jsonify(result)


@app.route("/api/detect-base64", methods=["POST"])
def detect_base64():
    """Send a base64-encoded image and get detection results."""
    data = request.get_json(force=True, silent=True) or {}
    b64 = data.get("image") or data.get("image_base64")
    if not b64:
        return jsonify({"success": False, "error": "No image_base64 field"}), 400

    try:
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        img_bytes = base64.b64decode(b64)
        pil_image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        image_bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    except Exception as e:
        return jsonify({"success": False, "error": f"Invalid base64 image: {e}"}), 400

    result, annotated = run_detection(image_bgr)

    if annotated is not None:
        result["annotated_image_base64"] = image_to_base64(annotated)

    return jsonify(result)


# ==========================================================================
# MAIN
# ==========================================================================

if __name__ == "__main__":
    print("\n  Starting OnionSure YOLO Flask Service on port 5000...")
    print("  Endpoints:")
    print("    GET  /api/health")
    print("    POST /api/detect         (multipart file upload)")
    print("    POST /api/detect-base64   (JSON base64 image)")
    print("\n  Waiting for requests...\n")
    app.run(host="0.0.0.0", port=5000, debug=False, threaded=True)
