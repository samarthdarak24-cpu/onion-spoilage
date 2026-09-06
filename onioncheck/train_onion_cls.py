"""
Train YOLOv8 Classification Model - Onion Quality (Healthy vs Unhealthy)
========================================================================
Uses the quality_dataset_two folder-based classification dataset.
Trains a YOLOv8n-cls model to classify onions as healthy or unhealthy.

Output model: runs/classify/onion_cls/weights/best.pt
"""

from ultralytics import YOLO
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "quality_dataset_two"
PRETRAINED = BASE_DIR / "yolov8n-cls.pt"

print("=" * 60)
print("  ONION QUALITY CLASSIFICATION TRAINING")
print("  Model: YOLOv8n-cls (classification)")
print("  Dataset: quality_dataset_two (healthy vs unhealthy)")
print("=" * 60)
print(f"  Dataset path: {DATASET_PATH}")
print(f"  Train: {DATASET_PATH / 'train'}")
print(f"  Val:   {DATASET_PATH / 'val'}")
print(f"  Pretrained: {PRETRAINED}")
print("=" * 60)

# Verify dataset
train_healthy = len(list((DATASET_PATH / "train" / "healthy").glob("*")))
train_unhealthy = len(list((DATASET_PATH / "train" / "unhealthy").glob("*")))
val_healthy = len(list((DATASET_PATH / "val" / "healthy").glob("*")))
val_unhealthy = len(list((DATASET_PATH / "val" / "unhealthy").glob("*")))

print(f"\n  Train: healthy={train_healthy}, unhealthy={train_unhealthy}")
print(f"  Val:   healthy={val_healthy}, unhealthy={val_unhealthy}")
print(f"  Total: {train_healthy + train_unhealthy + val_healthy + val_unhealthy} images")

if train_healthy == 0 or train_unhealthy == 0:
    print("\n  ERROR: Missing training images!")
    exit(1)

# Load pretrained classification model
model = YOLO(str(PRETRAINED))
print(f"\n  Loaded pretrained model: {PRETRAINED.name}")
print(f"  Classes: {model.names}")

# Train
print("\n  Starting training...\n")
results = model.train(
    data=str(DATASET_PATH),
    epochs=15,
    batch=32,
    imgsz=224,
    device="cpu",
    workers=4,
    patience=10,
    save=True,
    save_period=5,
    project="runs",
    name="onion_cls",
    exist_ok=True,
    pretrained=True,
    optimizer="auto",
    lr0=0.01,
    lrf=0.01,
    momentum=0.937,
    weight_decay=0.0005,
    warmup_epochs=3.0,
    warmup_momentum=0.8,
    warmup_bias_lr=0.1,
    # Augmentation
    hsv_h=0.015,
    hsv_s=0.7,
    hsv_v=0.4,
    degrees=15.0,
    translate=0.1,
    scale=0.5,
    flipud=0.0,
    fliplr=0.5,
    erasing=0.4,
    auto_augment="randaugment",
    verbose=True,
    seed=0,
    deterministic=True,
)

print("\n" + "=" * 60)
print("  TRAINING COMPLETE!")
print("=" * 60)
print(f"  Best model:  runs/classify/onion_cls/weights/best.pt")
print(f"  Last model:  runs/classify/onion_cls/weights/last.pt")
print("=" * 60)
