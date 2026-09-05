#!/usr/bin/env python3
"""
OnionSure — Computer-Vision Defect Detector (REAL ROBOFLOW MODEL)

INPUT  (JSON string via argv[1] or stdin):
  {"scenario": "random"|"demo", "total": 100, "image_path": "/path/to/image.jpg"}

OUTPUT (JSON to stdout):
  {"mode":"ROBOFLOW","total":X,"counts":{...},"percentages":{...},
   "visionScore":X,"confidence":X,"detections":[{class,confidence,bbox,size},...]}

Integrated with Roboflow YOLO model from onioncheck/defect_detection.py

Run:  python3 vision_service.py '{"image_path":"/path/to/image.jpg"}'
"""

import sys
import json
import os
from pathlib import Path

# Add onioncheck to path
ONIONCHECK_PATH = Path(__file__).parent.parent / 'onioncheck'
sys.path.insert(0, str(ONIONCHECK_PATH))

try:
    from defect_detection import detect_defects_with_sizing, get_defect_info
    ROBOFLOW_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Could not import defect_detection: {e}", file=sys.stderr)
    ROBOFLOW_AVAILABLE = False

CLASSES = ["healthy", "damaged", "rotten", "sprouted", "undersized"]


def map_roboflow_to_onionsure(roboflow_class):
    """Map Roboflow detection classes to OnionSure 5-class model"""
    cls = str(roboflow_class).lower().strip()
    
    # Healthy
    if cls == "onion" or cls == "good" or cls == "fresh":
        return "healthy"
    
    # Rotten
    if cls in ["rotten", "spoiled", "unhealthy", "black_smut", "black smut"]:
        return "rotten"
    
    # Sprouted
    if cls == "sprouted":
        return "sprouted"
    
    # Damaged (minor/moderate defects)
    if cls in ["staining", "double_split", "double split", "damaged", "bruised"]:
        return "damaged"
    
    # Default to damaged for unknown
    return "damaged"


def analyze_with_roboflow(image_path, pixels_per_cm=20.0):
    """Run real Roboflow YOLO detection"""
    if not ROBOFLOW_AVAILABLE:
        return sample_demo()
    
    if not image_path or not os.path.exists(image_path):
        return sample_demo()
    
    try:
        # Run Roboflow detection
        results = detect_defects_with_sizing(
            image_path,
            pixels_per_cm=pixels_per_cm,
            confidence_threshold=0.4
        )
        
        # Save annotated image with bounding boxes
        import cv2
        annotated_path = image_path.replace('.jpg', '_annotated.jpg')
        cv2.imwrite(annotated_path, results['annotated_image'])
        
        # Map to OnionSure format
        counts = {"healthy": 0, "damaged": 0, "rotten": 0, "sprouted": 0, "undersized": 0}
        detections = []
        
        for i, det in enumerate(results['detections']):
            onionsure_class = map_roboflow_to_onionsure(det['class'])
            counts[onionsure_class] += 1
            
            bbox = det['bounding_box']
            size_cm = det['size_estimation']['diameter_cm']
            
            # Check if undersized (< 4cm diameter)
            if size_cm < 4.0:
                onionsure_class = "undersized"
                counts["undersized"] += 1
                counts[map_roboflow_to_onionsure(det['class'])] -= 1
            
            detections.append({
                "id": f"det_{i}",
                "class": onionsure_class,
                "confidence": round(det['confidence'], 2),
                "bbox": {
                    "x": bbox['x1'],
                    "y": bbox['y1'],
                    "width": bbox['width_px'],
                    "height": bbox['height_px']
                },
                "size": int(size_cm * 10),  # mm
                "roboflow_class": det['class'],
                "severity": det['severity'],
                "diameter_cm": size_cm,
                "weight_g": det['size_estimation']['estimated_weight_g']
            })
        
        total = results['total_detected']
        if total == 0:
            return sample_demo()
        
        # Calculate vision score
        defect_rate = results['statistics']['defect_rate']
        vision_score = max(0, 100 - int(defect_rate))
        
        # Calculate percentages
        percentages = {c: round(counts[c] / total * 100, 1) for c in CLASSES}
        
        return {
            "mode": "ROBOFLOW",
            "total": total,
            "counts": counts,
            "percentages": percentages,
            "visionScore": vision_score,
            "confidence": 0.95,
            "detections": detections,
            "statistics": results['statistics'],
            "defect_summary": results['defect_summary'],
            "annotated_image_path": annotated_path
        }
        
    except Exception as e:
        print(f"Roboflow detection error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return sample_demo()


def sample_demo(scenario="random", total=100):
    """Fallback demo mode"""
    import random
    random.seed()
    
    if scenario == "demo":
        counts = {"healthy": 91, "damaged": 4, "rotten": 1, "sprouted": 2, "undersized": 2}
        vision_score = 94
        conf = 0.95
    else:
        damaged = random.randint(0, 8)
        rotten = random.randint(0, 4)
        sprouted = random.randint(0, 6)
        undersized = random.randint(0, 7)
        healthy = max(0, total - damaged - rotten - sprouted - undersized)
        counts = {"healthy": healthy, "damaged": damaged, "rotten": rotten,
                  "sprouted": sprouted, "undersized": undersized}
        vision_score = max(0, min(100, 100 - (rotten * 2.5 + damaged * 1.0 + sprouted * 1.0 + undersized * 0.5)))
        conf = round(0.90 + random.random() * 0.08, 2)

    pct = {c: round(counts[c] / total * 100, 1) for c in CLASSES}
    detections = []
    i = 0
    for c in CLASSES:
        for _ in range(counts[c]):
            detections.append({
                "id": f"det_{i}",
                "class": c,
                "confidence": round((0.9 + random.random() * 0.09) if c == "healthy" else (0.7 + random.random() * 0.25), 2),
                "bbox": {"x": random.randint(10, 70), "y": random.randint(10, 70),
                         "width": random.randint(18, 43), "height": random.randint(18, 43)},
                "size": random.randint(30, 70) if c != "undersized" else random.randint(30, 38),
            })
            i += 1
    return {
        "mode": "DEMO",
        "total": total,
        "counts": counts,
        "percentages": pct,
        "visionScore": vision_score if scenario == "demo" else int(round(vision_score)),
        "confidence": conf,
        "detections": detections,
    }


def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    data = json.loads(raw) if raw.strip() else {}
    
    # Check if image_path is provided for real detection
    image_path = data.get("image_path")
    
    if image_path and ROBOFLOW_AVAILABLE:
        out = analyze_with_roboflow(image_path, data.get("pixels_per_cm", 20.0))
    else:
        out = sample_demo(data.get("scenario", "random"), data.get("total", 100))
    
    print(json.dumps(out))


if __name__ == "__main__":
    main()

