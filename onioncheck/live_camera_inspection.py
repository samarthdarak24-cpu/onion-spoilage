"""
Live Camera Inspection System for Onion Quality Assessment
===========================================================

Real-time defect detection using webcam/USB camera with Roboflow YOLO model.
Features:
- Live video stream with bounding boxes
- Real-time defect classification
- Frame-by-frame analysis
- Snapshot capture with annotations
- Statistics overlay
- Keyboard controls

Usage:
    python live_camera_inspection.py

Controls:
    SPACE - Capture current frame & save annotated image
    Q     - Quit application
    S     - Toggle statistics display
    C     - Toggle confidence display
    F     - Toggle FPS counter

Author: OnionSure Development Team
Date: September 5, 2026
"""

import os
import cv2
import time
import numpy as np
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional
from dotenv import load_dotenv
from inference_sdk import InferenceHTTPClient


# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("ROBOFLOW_API_KEY")
if not API_KEY:
    raise ValueError("ROBOFLOW_API_KEY not found in .env")

API_KEY = API_KEY.strip()
MODEL_ID = "veg1-hcqsf-2/4"

# Initialize Roboflow client
CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=API_KEY
)

# Camera configuration
CAMERA_INDEX = 0  # Default webcam (0), change to 1, 2 for USB cameras
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
INFERENCE_SIZE = 640  # YOLOv8 input size
CONFIDENCE_THRESHOLD = 0.4
FPS_TARGET = 30

# Output directory for captured images
CAPTURES_DIR = BASE_DIR / "live_captures"
CAPTURES_DIR.mkdir(exist_ok=True)


# ==========================================================================
# DEFECT CLASSIFICATION (Same as defect_detection.py)
# ==========================================================================

DEFECT_CLASSES = {
    "onion": {
        "category": "healthy",
        "severity": 0,
        "color": (0, 255, 0),  # Bright Green
        "description": "Good quality"
    },
    "staining": {
        "category": "minor_defect",
        "severity": 1,
        "color": (0, 255, 255),  # Bright Yellow
        "description": "Surface staining"
    },
    "sprouted": {
        "category": "moderate_defect",
        "severity": 2,
        "color": (0, 165, 255),  # Bright Orange
        "description": "Sprouted"
    },
    "double_split": {
        "category": "moderate_defect",
        "severity": 2,
        "color": (0, 165, 255),
        "description": "Double split"
    },
    "double split": {
        "category": "moderate_defect",
        "severity": 2,
        "color": (0, 165, 255),
        "description": "Double split"
    },
    "black_smut": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),  # Bright Red
        "description": "Black smut"
    },
    "black smut": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),
        "description": "Black smut"
    },
    "spoiled": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),
        "description": "Spoiled"
    },
    "unhealthy": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),
        "description": "Unhealthy"
    },
    "rotten": {
        "category": "severe_defect",
        "severity": 3,
        "color": (0, 0, 255),
        "description": "Rotten"
    },
    "manual_review": {
        "category": "needs_review",
        "severity": 2,
        "color": (255, 0, 255),  # Magenta
        "description": "Needs review"
    },
    "manual review": {
        "category": "needs_review",
        "severity": 2,
        "color": (255, 0, 255),
        "description": "Needs review"
    },
}


def get_defect_info(class_name: str) -> Dict:
    """Get defect information for detected class."""
    class_key = str(class_name).lower().strip()
    return DEFECT_CLASSES.get(class_key, {
        "category": "unknown",
        "severity": 3,
        "color": (128, 128, 128),
        "description": f"Unknown: {class_name}"
    })


# ==========================================================================
# LIVE CAMERA INSPECTION CLASS
# ==========================================================================

class LiveCameraInspector:
    """
    Real-time onion quality inspection using live camera feed.
    """
    
    def __init__(
        self,
        camera_index: int = CAMERA_INDEX,
        confidence_threshold: float = CONFIDENCE_THRESHOLD
    ):
        """
        Initialize live camera inspector.
        
        Args:
            camera_index: Camera device index (0 for default webcam)
            confidence_threshold: Minimum confidence for detection
        """
        self.camera_index = camera_index
        self.confidence_threshold = confidence_threshold
        
        # Initialize camera
        self.cap = cv2.VideoCapture(camera_index)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open camera {camera_index}")
        
        # Set camera properties
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
        self.cap.set(cv2.CAP_PROP_FPS, FPS_TARGET)
        
        # Get actual camera properties
        self.frame_width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.frame_height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        
        print(f"Camera initialized: {self.frame_width}x{self.frame_height} @ {self.fps}fps")
        
        # Statistics tracking
        self.frame_count = 0
        self.detection_count = 0
        self.total_healthy = 0
        self.total_defective = 0
        self.capture_count = 0
        
        # Display toggles
        self.show_stats = True
        self.show_confidence = True
        self.show_fps = True
        
        # FPS calculation
        self.fps_counter = 0
        self.fps_start_time = time.time()
        self.current_fps = 0
        
        # Detection cache (avoid re-processing same frame)
        self.last_predictions = []
        self.last_frame_time = time.time()
    
    def detect_onions(self, frame: np.ndarray) -> List[Dict]:
        """
        Run Roboflow inference on frame.
        
        Args:
            frame: BGR image from camera
            
        Returns:
            List of detection dictionaries
        """
        try:
            # Run inference
            result = CLIENT.infer(frame, model_id=MODEL_ID)
            predictions = result.get("predictions", [])
            
            # Filter by confidence
            filtered = [
                pred for pred in predictions
                if pred.get("confidence", 0) >= self.confidence_threshold
            ]
            
            return filtered
            
        except Exception as e:
            print(f"Inference error: {e}")
            return []
    
    def draw_detection(
        self,
        frame: np.ndarray,
        prediction: Dict,
        detection_id: int
    ) -> None:
        """
        Draw bounding box and label for single detection.
        
        Args:
            frame: Image to draw on (modified in-place)
            prediction: Detection dictionary from Roboflow
            detection_id: Sequential ID for this detection
        """
        # Extract prediction data
        detected_class = str(prediction.get("class", "unknown"))
        confidence = float(prediction.get("confidence", 0))
        
        # Get bounding box
        center_x = float(prediction.get("x", 0))
        center_y = float(prediction.get("y", 0))
        box_width = float(prediction.get("width", 0))
        box_height = float(prediction.get("height", 0))
        
        # Convert to corners
        x1 = int(center_x - box_width / 2)
        y1 = int(center_y - box_height / 2)
        x2 = int(center_x + box_width / 2)
        y2 = int(center_y + box_height / 2)
        
        # Clamp to frame boundaries
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(self.frame_width, x2), min(self.frame_height, y2)
        
        # Get defect info
        defect_info = get_defect_info(detected_class)
        color = defect_info["color"]
        severity = defect_info["severity"]
        
        # Draw thick bounding box
        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
        
        # Prepare label text
        if self.show_confidence:
            label = f"{detected_class.upper()} - {confidence:.2f}"
        else:
            label = detected_class.upper()
        
        # Calculate label background size
        (text_width, text_height), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
        )
        
        # Draw label background
        label_y = y1 - 10 if y1 - 10 > 20 else y2 + 20
        cv2.rectangle(
            frame,
            (x1, label_y - text_height - 5),
            (x1 + text_width + 5, label_y + 5),
            (0, 0, 0),
            -1
        )
        
        # Draw label text
        cv2.putText(
            frame, label,
            (x1 + 2, label_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6, (255, 255, 255), 2
        )
        
        # Draw severity indicator
        severity_text = f"Sev: {severity}/3"
        (sev_width, sev_height), _ = cv2.getTextSize(
            severity_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2
        )
        
        sev_y = y2 + 15
        cv2.rectangle(
            frame,
            (x1, sev_y - sev_height - 2),
            (x1 + sev_width + 5, sev_y + 2),
            (0, 0, 0),
            -1
        )
        cv2.putText(
            frame, severity_text,
            (x1 + 2, sev_y),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5, color, 2
        )
        
        # Draw detection ID circle (top-right)
        center = (x2 - 20, y1 + 20)
        cv2.circle(frame, center, 15, color, -1)
        cv2.putText(
            frame, str(detection_id),
            (center[0] - 7, center[1] + 7),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6, (255, 255, 255), 2
        )
    
    def draw_statistics(
        self,
        frame: np.ndarray,
        predictions: List[Dict]
    ) -> None:
        """
        Draw statistics overlay on frame.
        
        Args:
            frame: Image to draw on
            predictions: Current frame detections
        """
        # Count current frame
        healthy_count = sum(
            1 for p in predictions
            if get_defect_info(p.get("class"))["severity"] == 0
        )
        defective_count = len(predictions) - healthy_count
        
        # Calculate defect rate
        defect_rate = (
            (defective_count / len(predictions) * 100)
            if predictions else 0
        )
        
        # Prepare stats text
        stats_lines = [
            f"LIVE INSPECTION - Frame #{self.frame_count}",
            f"Detected: {len(predictions)} onions",
            f"Healthy: {healthy_count} | Defective: {defective_count}",
            f"Defect Rate: {defect_rate:.1f}%",
            "",
            f"Session Total: {self.detection_count} detections",
            f"Captures Saved: {self.capture_count}"
        ]
        
        # Add FPS if enabled
        if self.show_fps:
            stats_lines.insert(1, f"FPS: {self.current_fps:.1f}")
        
        # Draw semi-transparent background
        overlay = frame.copy()
        cv2.rectangle(
            overlay,
            (10, 10),
            (400, 50 + len(stats_lines) * 30),
            (0, 0, 0),
            -1
        )
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        
        # Draw stats text
        y_offset = 40
        for line in stats_lines:
            if line:  # Skip empty lines
                cv2.putText(
                    frame, line,
                    (20, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6, (255, 255, 255), 2
                )
            y_offset += 30
    
    def draw_controls(self, frame: np.ndarray) -> None:
        """
        Draw control instructions at bottom of frame.
        
        Args:
            frame: Image to draw on
        """
        controls = [
            "SPACE: Capture | Q: Quit | S: Stats | C: Confidence | F: FPS"
        ]
        
        # Draw background
        overlay = frame.copy()
        cv2.rectangle(
            overlay,
            (0, self.frame_height - 40),
            (self.frame_width, self.frame_height),
            (0, 0, 0),
            -1
        )
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)
        
        # Draw controls text
        cv2.putText(
            frame, controls[0],
            (20, self.frame_height - 15),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6, (255, 255, 255), 2
        )
    
    def save_capture(
        self,
        frame: np.ndarray,
        predictions: List[Dict]
    ) -> str:
        """
        Save current frame with annotations.
        
        Args:
            frame: Annotated frame to save
            predictions: Detection results
            
        Returns:
            Path to saved image
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"live_capture_{timestamp}_{len(predictions)}onions.jpg"
        filepath = CAPTURES_DIR / filename
        
        # Add capture watermark
        watermark = f"Live Capture - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        cv2.putText(
            frame, watermark,
            (self.frame_width - 400, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6, (0, 255, 0), 2
        )
        
        # Save image
        cv2.imwrite(str(filepath), frame)
        self.capture_count += 1
        
        print(f"✓ Captured: {filename}")
        return str(filepath)
    
    def update_fps(self) -> None:
        """Update FPS counter."""
        self.fps_counter += 1
        elapsed = time.time() - self.fps_start_time
        
        if elapsed > 1.0:  # Update every second
            self.current_fps = self.fps_counter / elapsed
            self.fps_counter = 0
            self.fps_start_time = time.time()
    
    def run(self) -> None:
        """
        Main loop for live camera inspection.
        Runs until user quits (press Q).
        """
        print("\n" + "=" * 60)
        print("LIVE CAMERA INSPECTION STARTED")
        print("=" * 60)
        print(f"Camera: {self.frame_width}x{self.frame_height}")
        print(f"Model: {MODEL_ID}")
        print(f"Confidence Threshold: {self.confidence_threshold}")
        print("\nControls:")
        print("  SPACE - Capture frame")
        print("  Q     - Quit")
        print("  S     - Toggle statistics")
        print("  C     - Toggle confidence display")
        print("  F     - Toggle FPS counter")
        print("=" * 60 + "\n")
        
        try:
            while True:
                # Read frame
                ret, frame = self.cap.read()
                if not ret:
                    print("Failed to read frame from camera")
                    break
                
                self.frame_count += 1
                
                # Run detection every frame (adjust for performance)
                predictions = self.detect_onions(frame)
                self.last_predictions = predictions
                self.detection_count += len(predictions)
                
                # Update statistics
                healthy = sum(
                    1 for p in predictions
                    if get_defect_info(p.get("class"))["severity"] == 0
                )
                defective = len(predictions) - healthy
                self.total_healthy += healthy
                self.total_defective += defective
                
                # Draw detections
                for idx, pred in enumerate(predictions, start=1):
                    self.draw_detection(frame, pred, idx)
                
                # Draw overlays
                if self.show_stats:
                    self.draw_statistics(frame, predictions)
                
                self.draw_controls(frame)
                
                # Update FPS
                self.update_fps()
                
                # Display frame
                cv2.imshow("OnionSure - Live Camera Inspection", frame)
                
                # Handle keyboard input
                key = cv2.waitKey(1) & 0xFF
                
                if key == ord('q') or key == ord('Q'):
                    print("\nQuitting live inspection...")
                    break
                
                elif key == ord(' '):  # Space - capture
                    capture_frame = frame.copy()
                    self.save_capture(capture_frame, predictions)
                
                elif key == ord('s') or key == ord('S'):
                    self.show_stats = not self.show_stats
                    print(f"Statistics display: {'ON' if self.show_stats else 'OFF'}")
                
                elif key == ord('c') or key == ord('C'):
                    self.show_confidence = not self.show_confidence
                    print(f"Confidence display: {'ON' if self.show_confidence else 'OFF'}")
                
                elif key == ord('f') or key == ord('F'):
                    self.show_fps = not self.show_fps
                    print(f"FPS counter: {'ON' if self.show_fps else 'OFF'}")
        
        except KeyboardInterrupt:
            print("\nInterrupted by user")
        
        finally:
            # Cleanup
            self.cap.release()
            cv2.destroyAllWindows()
            
            # Print session summary
            print("\n" + "=" * 60)
            print("LIVE INSPECTION SESSION SUMMARY")
            print("=" * 60)
            print(f"Total Frames Processed: {self.frame_count}")
            print(f"Total Detections: {self.detection_count}")
            print(f"Total Healthy: {self.total_healthy}")
            print(f"Total Defective: {self.total_defective}")
            print(f"Captures Saved: {self.capture_count}")
            print(f"Captures Directory: {CAPTURES_DIR}")
            print("=" * 60 + "\n")


# ==========================================================================
# MAIN ENTRY POINT
# ==========================================================================

def main():
    """Main function to start live camera inspection."""
    
    print("\n" + "🧅" * 30)
    print("OnionSure - Live Camera Inspection System")
    print("🧅" * 30 + "\n")
    
    try:
        # Initialize inspector
        inspector = LiveCameraInspector(
            camera_index=CAMERA_INDEX,
            confidence_threshold=CONFIDENCE_THRESHOLD
        )
        
        # Run live inspection
        inspector.run()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n✓ Live inspection session ended.\n")


if __name__ == "__main__":
    main()
