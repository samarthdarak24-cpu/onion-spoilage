"""Debug: Analyze model predictions to find the issue."""
from ultralytics import YOLO
import cv2
import glob
import os

model = YOLO("runs/segment/runs/onion_seg_test/weights/best.pt")
print(f"Model classes: {model.names}")
print()

# Check what class IDs exist in the labels
print("=== Label class distribution (train) ===")
label_dir = "train/labels"
class_counts = {}
for lf in sorted(glob.glob(f"{label_dir}/*.txt")):
    with open(lf, "r") as f:
        for line in f:
            parts = line.strip().split()
            if parts:
                cls_id = int(parts[0])
                class_counts[cls_id] = class_counts.get(cls_id, 0) + 1
print(f"  Class IDs in labels: {class_counts}")
print()

# Check validation labels too
print("=== Label class distribution (valid) ===")
label_dir = "valid/labels"
class_counts = {}
for lf in sorted(glob.glob(f"{label_dir}/*.txt")):
    with open(lf, "r") as f:
        for line in f:
            parts = line.strip().split()
            if parts:
                cls_id = int(parts[0])
                class_counts[cls_id] = class_counts.get(cls_id, 0) + 1
print(f"  Class IDs in labels: {class_counts}")
print()

# Test on multiple images
print("=== Model predictions on 10 validation images ===")
test_images = sorted(glob.glob("valid/images/*.jpg"))[:10]
for img_path in test_images:
    frame = cv2.imread(img_path)
    results = model(frame, conf=0.25, imgsz=640, verbose=False, retina_masks=True)
    r = results[0]
    fname = os.path.basename(img_path)
    if r.boxes is not None and len(r.boxes) > 0:
        classes = {}
        for i in range(len(r.boxes)):
            cls = int(r.boxes.cls[i].item())
            conf = float(r.boxes.conf[i].item())
            if cls not in classes:
                classes[cls] = []
            classes[cls].append(conf)
        print(f"{fname}:")
        for cls_id, confs in classes.items():
            cls_name = model.names.get(cls_id, f"cls_{cls_id}")
            print(f"  {cls_name} (class {cls_id}): {len(confs)} dets, conf: {min(confs):.3f}-{max(confs):.3f}")
    else:
        print(f"{fname}: NO DETECTIONS")

print()
# Check if label format is segmentation or detection
print("=== Sample label format check ===")
sample_labels = sorted(glob.glob("train/labels/*.txt"))[:5]
for lf in sample_labels:
    fname = os.path.basename(lf)
    with open(lf, "r") as f:
        lines = f.readlines()
    for i, line in enumerate(lines):
        parts = line.strip().split()
        if parts:
            cls_id = int(parts[0])
            num_values = len(parts) - 1
            # Detection: 4 values (x,y,w,h). Segmentation: even number >4 (polygon points)
            if num_values == 4:
                fmt = "DETECTION (bbox)"
            elif num_values > 4 and num_values % 2 == 0:
                fmt = "SEGMENTATION (polygon)"
            else:
                fmt = f"UNKNOWN ({num_values} values)"
            print(f"  {fname} line {i}: class={cls_id}, {num_values} coords -> {fmt}")
            break  # just first line per file
