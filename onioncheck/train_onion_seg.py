"""
Quick Onion Segmentation Training
==================================
Trains YOLOv8n-seg on the onion quality dataset (healthy/unhealthy).
"""

from pathlib import Path
from ultralytics import YOLO
import torch

BASE_DIR = Path(__file__).resolve().parent
DATA_YAML = BASE_DIR / "data.yaml"

def main():
    print("=" * 60)
    print("  ONION SEGMENTATION TRAINING (YOLOv8n-seg)")
    print("=" * 60)

    print(f"\nDataset: {DATA_YAML}")
    print(f"  Train: {694} images")
    print(f"  Val:   {194} images")
    print(f"  Classes: healthy (0), unhealthy (1)")

    # Check device
    if torch.cuda.is_available():
        device = "0"
        print(f"\nGPU: {torch.cuda.get_device_name(0)}")
    else:
        device = "cpu"
        print("\nDevice: CPU (training will be slower)")

    # Load segmentation model
    print("\nLoading yolov8n-seg.pt...")
    model = YOLO("yolov8n-seg.pt")
    print("Model loaded!")

    # Training config
    config = dict(
        data=str(DATA_YAML),
        epochs=10,
        batch=8,
        imgsz=640,
        device=device,
        workers=4,
        patience=20,
        save=True,
        save_period=5,
        project=str(BASE_DIR / "runs"),
        name="onion_seg_test",
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
        box=7.5,
        cls=0.5,
        dfl=1.5,
        hsv_h=0.015,
        hsv_s=0.7,
        hsv_v=0.4,
        degrees=15.0,
        translate=0.1,
        scale=0.5,
        flipud=0.0,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.0,
        close_mosaic=10,
        amp=True,
        verbose=True,
        seed=0,
        deterministic=True,
        rect=False,
        cos_lr=False,
        val=True,
    )

    print("\n" + "=" * 60)
    print("  STARTING TRAINING")
    print("=" * 60)

    try:
        results = model.train(**config)

        print("\n" + "=" * 60)
        print("  TRAINING COMPLETE!")
        print("=" * 60)

        best_path = BASE_DIR / "runs" / "onion_seg_test" / "weights" / "best.pt"
        print(f"\nBest model: {best_path}")

        if hasattr(results, "results_dict"):
            m = results.results_dict
            print(f"\nFinal Metrics:")
            print(f"  mAP@0.5:      {m.get('metrics/mAP50(B)', 0):.4f}")
            print(f"  mAP@0.5:0.95: {m.get('metrics/mAP50-95(B)', 0):.4f}")
            print(f"  Precision:    {m.get('metrics/precision(B)', 0):.4f}")
            print(f"  Recall:       {m.get('metrics/recall(B)', 0):.4f}")
            # Segmentation metrics
            print(f"  Seg mAP@0.5:      {m.get('metrics/mAP50(M)', 0):.4f}")
            print(f"  Seg mAP@0.5:0.95: {m.get('metrics/mAP50-95(M)', 0):.4f}")

        print("\nTraining pipeline complete!")

    except KeyboardInterrupt:
        print("\n\nTraining interrupted by user. Resume with --resume")
    except Exception as e:
        print(f"\n\nTraining failed: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
