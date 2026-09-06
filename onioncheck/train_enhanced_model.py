"""
Train Enhanced YOLOv8 Model
============================

Trains YOLOv8 model on enhanced merged dataset with optimal hyperparameters.

Usage:
    python train_enhanced_model.py
    python train_enhanced_model.py --epochs 200 --batch 16 --device 0
    python train_enhanced_model.py --model yolov8s.pt --resume
"""

import argparse
from pathlib import Path
from ultralytics import YOLO
import torch


# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent
DATASET_YAML = BASE_DIR / "datasets" / "enhanced_combined" / "data.yaml"

# Default hyperparameters (optimized for onion detection)
DEFAULT_CONFIG = {
    # Model
    "model": "yolov8n.pt",  # nano (fastest), options: n/s/m/l/x
    
    # Training
    "epochs": 200,
    "batch": 16,
    "imgsz": 640,
    "device": "0",  # "0" for GPU, "cpu" for CPU
    
    # Optimization
    "patience": 30,  # Early stopping patience
    "save": True,
    "save_period": 10,  # Save checkpoint every N epochs
    
    # Augmentation
    "hsv_h": 0.015,  # HSV-Hue augmentation
    "hsv_s": 0.7,    # HSV-Saturation augmentation
    "hsv_v": 0.4,    # HSV-Value augmentation
    "degrees": 15.0,  # Rotation (±degrees)
    "translate": 0.1,  # Translation (±fraction)
    "scale": 0.5,    # Scale (±fraction)
    "shear": 0.0,    # Shear (±degrees)
    "perspective": 0.0,  # Perspective distortion
    "flipud": 0.5,   # Flip up-down probability
    "fliplr": 0.5,   # Flip left-right probability
    "mosaic": 1.0,   # Mosaic augmentation probability
    "mixup": 0.1,    # Mixup augmentation probability
    "copy_paste": 0.0,  # Copy-paste augmentation
    
    # Hyperparameters
    "lr0": 0.01,     # Initial learning rate
    "lrf": 0.01,     # Final learning rate (lr0 * lrf)
    "momentum": 0.937,  # SGD momentum
    "weight_decay": 0.0005,  # Weight decay
    "warmup_epochs": 3.0,  # Warmup epochs
    "warmup_momentum": 0.8,  # Warmup momentum
    "warmup_bias_lr": 0.1,  # Warmup bias learning rate
    "box": 7.5,      # Box loss gain
    "cls": 0.5,      # Class loss gain
    "dfl": 1.5,      # DFL loss gain
    
    # Other
    "workers": 8,    # Data loader workers
    "project": str(BASE_DIR / "runs"),
    "name": "onion_enhanced_v1",
    "exist_ok": False,
    "pretrained": True,
    "optimizer": "auto",  # auto, SGD, Adam, AdamW, RMSProp
    "verbose": True,
    "seed": 0,
    "deterministic": True,
    "single_cls": False,
    "rect": False,  # Rectangular training
    "cos_lr": False,  # Cosine LR scheduler
    "close_mosaic": 10,  # Disable mosaic last N epochs
    "resume": False,  # Resume training
    "amp": True,  # Automatic Mixed Precision
    "fraction": 1.0,  # Dataset fraction to train on
    "profile": False,  # Profile ONNX/TensorRT speeds
    "freeze": None,  # Freeze layers: backbone=10, first3=0 1 2
    "multi_scale": False,  # Multi-scale training
    "overlap_mask": True,  # Overlap mask
    "mask_ratio": 4,  # Mask downsample ratio
    "dropout": 0.0,  # Dropout regularization
    "val": True,  # Validate/test during training
}


# ==========================================================================
# ARGUMENT PARSER
# ==========================================================================

def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Train Enhanced YOLOv8 Model")
    
    # Model
    parser.add_argument("--model", type=str, default=DEFAULT_CONFIG["model"],
                        help="Model size (yolov8n/s/m/l/x.pt)")
    
    # Training parameters
    parser.add_argument("--epochs", type=int, default=DEFAULT_CONFIG["epochs"],
                        help="Number of epochs")
    parser.add_argument("--batch", type=int, default=DEFAULT_CONFIG["batch"],
                        help="Batch size")
    parser.add_argument("--imgsz", type=int, default=DEFAULT_CONFIG["imgsz"],
                        help="Image size")
    parser.add_argument("--device", type=str, default=DEFAULT_CONFIG["device"],
                        help="Device (0/1/2/cpu)")
    
    # Advanced
    parser.add_argument("--patience", type=int, default=DEFAULT_CONFIG["patience"],
                        help="Early stopping patience")
    parser.add_argument("--workers", type=int, default=DEFAULT_CONFIG["workers"],
                        help="Number of workers")
    parser.add_argument("--name", type=str, default=DEFAULT_CONFIG["name"],
                        help="Experiment name")
    parser.add_argument("--resume", action="store_true",
                        help="Resume training from last checkpoint")
    parser.add_argument("--data", type=str, default=None,
                        help="Path to data.yaml (default: enhanced_combined)")
    
    return parser.parse_args()


# ==========================================================================
# TRAINING FUNCTION
# ==========================================================================

def train_model(args):
    """
    Train YOLOv8 model with configuration.
    
    Args:
        args: Parsed command line arguments
    """
    
    # Check dataset
    data_yaml = Path(args.data) if args.data else DATASET_YAML
    
    if not data_yaml.exists():
        print(f"\n❌ ERROR: Dataset not found: {data_yaml}")
        print("\nPlease run data preparation first:")
        print("  python prepare_enhanced_dataset.py")
        return
    
    # Print configuration
    print("\n" + "🧅" * 30)
    print("YOLOV8 ENHANCED TRAINING")
    print("🧅" * 30)
    
    print(f"\n📊 Configuration:")
    print(f"  Model: {args.model}")
    print(f"  Dataset: {data_yaml}")
    print(f"  Epochs: {args.epochs}")
    print(f"  Batch size: {args.batch}")
    print(f"  Image size: {args.imgsz}")
    print(f"  Device: {args.device}")
    print(f"  Workers: {args.workers}")
    print(f"  Patience: {args.patience}")
    print(f"  Name: {args.name}")
    
    # Check GPU availability
    if args.device != "cpu":
        if torch.cuda.is_available():
            gpu_name = torch.cuda.get_device_name(0)
            print(f"\n🚀 GPU Detected: {gpu_name}")
            print(f"  CUDA Version: {torch.version.cuda}")
            print(f"  Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
        else:
            print("\n⚠ WARNING: GPU not available, using CPU")
            args.device = "cpu"
    
    # Load model
    print(f"\n📦 Loading model: {args.model}")
    model = YOLO(args.model)
    
    print("  Model loaded successfully!")
    print(f"  Parameters: {sum(p.numel() for p in model.model.parameters()):,}")
    
    # Update config with args
    config = DEFAULT_CONFIG.copy()
    config.update({
        "epochs": args.epochs,
        "batch": args.batch,
        "imgsz": args.imgsz,
        "device": args.device,
        "workers": args.workers,
        "patience": args.patience,
        "name": args.name,
        "resume": args.resume,
        "data": str(data_yaml),
    })
    
    # Start training
    print("\n" + "="*60)
    print("STARTING TRAINING")
    print("="*60)
    print("\nMonitor training:")
    print("  TensorBoard: tensorboard --logdir runs/train")
    print("  Browser: http://localhost:6006")
    print("\n" + "="*60 + "\n")
    
    try:
        # Train model
        results = model.train(**config)
        
        # Training complete
        print("\n" + "="*60)
        print("TRAINING COMPLETE")
        print("="*60)
        
        # Get best model path
        best_model_path = Path(config["project"]) / config["name"] / "weights" / "best.pt"
        last_model_path = Path(config["project"]) / config["name"] / "weights" / "last.pt"
        
        print(f"\n✓ Training finished successfully!")
        print(f"\n📊 Results:")
        print(f"  Best model: {best_model_path}")
        print(f"  Last model: {last_model_path}")
        print(f"  Results dir: {Path(config['project']) / config['name']}")
        
        # Print final metrics
        if hasattr(results, 'results_dict'):
            metrics = results.results_dict
            print(f"\n📈 Final Metrics:")
            print(f"  mAP@0.5: {metrics.get('metrics/mAP50(B)', 0):.4f}")
            print(f"  mAP@0.5:0.95: {metrics.get('metrics/mAP50-95(B)', 0):.4f}")
            print(f"  Precision: {metrics.get('metrics/precision(B)', 0):.4f}")
            print(f"  Recall: {metrics.get('metrics/recall(B)', 0):.4f}")
        
        # Next steps
        print(f"\n🎯 Next Steps:")
        print(f"  1. Evaluate model:")
        print(f"     python evaluate_model.py --weights {best_model_path}")
        print(f"\n  2. Test inference:")
        print(f"     python test_inference.py --model {best_model_path}")
        print(f"\n  3. Export model:")
        print(f"     python export_model.py --weights {best_model_path}")
        print(f"\n  4. Update API:")
        print(f"     cp {best_model_path} models/onion_detector_enhanced.pt")
        
        print("\n✅ Training pipeline complete!\n")
        
    except KeyboardInterrupt:
        print("\n\n⚠ Training interrupted by user")
        print("  Resume with: python train_enhanced_model.py --resume")
        
    except Exception as e:
        print(f"\n\n❌ Training failed with error:")
        print(f"  {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


# ==========================================================================
# MAIN
# ==========================================================================

def main():
    """Main function."""
    args = parse_args()
    train_model(args)


if __name__ == "__main__":
    main()
