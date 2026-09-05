"""
Export Trained Model to Different Formats
==========================================

Exports model to ONNX, TensorRT, CoreML, etc.

Usage:
    python export_model.py --weights runs/train/onion_enhanced_v1/weights/best.pt
    python export_model.py --weights best.pt --format onnx
"""

import argparse
from pathlib import Path
from ultralytics import YOLO


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Export YOLOv8 Model")
    parser.add_argument("--weights", type=str, required=True,
                        help="Path to model weights (.pt file)")
    parser.add_argument("--format", type=str, default="onnx",
                        choices=["onnx", "torchscript", "engine", "coreml", "saved_model", "pb", "tflite", "edgetpu", "tfjs", "paddle"],
                        help="Export format")
    parser.add_argument("--imgsz", type=int, default=640,
                        help="Image size for export")
    parser.add_argument("--half", action="store_true",
                        help="FP16 quantization")
    parser.add_argument("--int8", action="store_true",
                        help="INT8 quantization")
    parser.add_argument("--dynamic", action="store_true",
                        help="Dynamic axes (ONNX/TF)")
    parser.add_argument("--simplify", action="store_true",
                        help="Simplify ONNX model")
    parser.add_argument("--opset", type=int, default=12,
                        help="ONNX opset version")
    return parser.parse_args()


def main():
    """Main export function."""
    args = parse_args()
    
    print("\n" + "🧅" * 30)
    print("MODEL EXPORT")
    print("🧅" * 30)
    
    # Load model
    print(f"\n📦 Loading model: {args.weights}")
    model = YOLO(args.weights)
    
    # Export model
    print(f"\n🔄 Exporting to {args.format.upper()} format...")
    print(f"  Image size: {args.imgsz}")
    print(f"  FP16: {args.half}")
    print(f"  INT8: {args.int8}")
    
    exported_model = model.export(
        format=args.format,
        imgsz=args.imgsz,
        half=args.half,
        int8=args.int8,
        dynamic=args.dynamic,
        simplify=args.simplify,
        opset=args.opset
    )
    
    print(f"\n✅ Export complete!")
    print(f"  Exported model: {exported_model}")
    
    # Usage instructions
    print(f"\n📖 Usage:")
    if args.format == "onnx":
        print(f"  # Python:")
        print(f"  model = YOLO('{exported_model}')")
        print(f"  results = model.predict('image.jpg')")
    elif args.format == "engine":
        print(f"  # TensorRT (fastest on NVIDIA GPU):")
        print(f"  model = YOLO('{exported_model}')")
        print(f"  results = model.predict('image.jpg')")
    
    print("\n")


if __name__ == "__main__":
    main()
