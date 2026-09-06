"""
Evaluate Trained Model
======================

Evaluates model performance on test set with detailed metrics.

Usage:
    python evaluate_model.py --weights runs/train/onion_enhanced_v1/weights/best.pt
"""

import argparse
from pathlib import Path
from ultralytics import YOLO
import cv2
import numpy as np
from collections import defaultdict


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Evaluate YOLOv8 Model")
    parser.add_argument("--weights", type=str, required=True,
                        help="Path to model weights (.pt file)")
    parser.add_argument("--data", type=str, default="datasets/enhanced_combined/data.yaml",
                        help="Path to data.yaml")
    parser.add_argument("--split", type=str, default="test", choices=["test", "val"],
                        help="Dataset split to evaluate on")
    parser.add_argument("--conf", type=float, default=0.4,
                        help="Confidence threshold")
    parser.add_argument("--iou", type=float, default=0.45,
                        help="IoU threshold for NMS")
    return parser.parse_args()


def main():
    """Main evaluation function."""
    args = parse_args()
    
    print("\n" + "🧅" * 30)
    print("MODEL EVALUATION")
    print("🧅" * 30)
    
    # Load model
    print(f"\n📦 Loading model: {args.weights}")
    model = YOLO(args.weights)
    
    # Validate model
    print(f"\n🔍 Evaluating on {args.split} set...")
    print(f"  Confidence threshold: {args.conf}")
    print(f"  IoU threshold: {args.iou}")
    
    results = model.val(
        data=args.data,
        split=args.split,
        conf=args.conf,
        iou=args.iou,
        verbose=True
    )
    
    # Print results
    print("\n" + "="*60)
    print("EVALUATION RESULTS")
    print("="*60)
    
    print(f"\n📊 Overall Metrics:")
    print(f"  mAP@0.5:     {results.box.map50:.4f}")
    print(f"  mAP@0.5:0.95: {results.box.map:.4f}")
    print(f"  Precision:   {results.box.mp:.4f}")
    print(f"  Recall:      {results.box.mr:.4f}")
    print(f"  F1-Score:    {2 * results.box.mp * results.box.mr / (results.box.mp + results.box.mr):.4f}")
    
    # Per-class metrics
    if hasattr(results.box, 'maps'):
        print(f"\n📈 Per-Class mAP@0.5:")
        class_names = model.names
        for class_id, map_value in enumerate(results.box.maps):
            class_name = class_names.get(class_id, f"Class {class_id}")
            print(f"  {class_name:20s}: {map_value:.4f}")
    
    print("\n✅ Evaluation complete!\n")


if __name__ == "__main__":
    main()
