# 🎓 YOLOv8 Model Training Guide - Enhanced Dataset

## 🎯 Goal
Train a custom YOLOv8 model with enhanced dataset for accurate onion quality detection using:
1. Your existing Roboflow dataset
2. Additional internet datasets
3. Data augmentation techniques

---

## 📊 Dataset Sources

### 1. Current Dataset (Roboflow)
- **Quality Dataset:** `quality_dataset_two/`
  - Healthy: 696 images
  - Unhealthy: 624 images
  - Total: 1,320 images

### 2. Additional Public Datasets (Recommended)

#### A. Roboflow Universe (Free Public Datasets)
```
1. "Onion Quality Detection" by various authors
   https://universe.roboflow.com/search?q=onion

2. "Vegetable Quality Assessment"
   https://universe.roboflow.com/search?q=vegetable+quality

3. "Agricultural Defects"
   https://universe.roboflow.com/search?q=agricultural+defects
```

#### B. Kaggle Datasets
```
1. "Onion Quality Detection Dataset"
   https://www.kaggle.com/search?q=onion+quality

2. "Vegetable Image Dataset"
   https://www.kaggle.com/search?q=vegetable+images

3. "Fruit and Vegetable Defects"
   https://www.kaggle.com/search?q=fruit+defect
```

#### C. Google Open Images
```
Search for: onion, vegetables, spoiled food
Download using: fiftyone or google-images-download
```

---

## 🚀 Quick Start - Enhanced Training

### Step 1: Download Additional Datasets

**Method 1: Roboflow Universe**
```bash
# Install Roboflow
pip install roboflow

# Download from Roboflow Universe
python download_additional_datasets.py
```

**Method 2: Manual Download**
1. Visit https://universe.roboflow.com/
2. Search "onion quality" or "vegetable defect"
3. Download in YOLOv8 format
4. Extract to `datasets/` folder

---

### Step 2: Prepare Enhanced Dataset

```bash
# Run dataset preparation script
python prepare_enhanced_dataset.py
```

This will:
- Merge your existing data with new datasets
- Apply data augmentation
- Split train/val/test (70/20/10)
- Generate updated data.yaml
- Balance class distribution

---

### Step 3: Train Enhanced Model

```bash
# Train with enhanced dataset
python train_enhanced_model.py
```

**Training Configuration:**
- Model: YOLOv8n/s/m (nano/small/medium)
- Epochs: 100-300
- Batch size: 16-32
- Image size: 640x640
- Augmentation: ON
- Device: GPU (if available) or CPU

---

## 📁 Enhanced Dataset Structure

```
onioncheck/
├── datasets/
│   ├── roboflow_original/        # Your existing data
│   │   ├── train/
│   │   └── valid/
│   │
│   ├── roboflow_additional/      # Downloaded from Universe
│   │   ├── train/
│   │   └── valid/
│   │
│   ├── kaggle_onions/            # Kaggle datasets
│   │   ├── images/
│   │   └── labels/
│   │
│   ├── google_images/            # Scraped images
│   │   └── raw/
│   │
│   └── enhanced_combined/        # Final merged dataset
│       ├── train/
│       │   ├── images/
│       │   └── labels/
│       ├── val/
│       │   ├── images/
│       │   └── labels/
│       └── test/
│           ├── images/
│           └── labels/
│
├── data_enhanced.yaml            # Updated config
└── train_enhanced_model.py       # Training script
```

---

## 🎯 Target Dataset Size

| Class | Current | Target | Source |
|-------|---------|--------|--------|
| onion (healthy) | 696 | 2,000+ | Roboflow + Internet |
| staining | ? | 500+ | Roboflow Universe |
| sprouted | ? | 500+ | Internet scraping |
| double_split | ? | 500+ | Roboflow Universe |
| black_smut | ? | 500+ | Kaggle + Roboflow |
| spoiled | 624 | 1,000+ | Multiple sources |
| unhealthy | ? | 500+ | Augmentation |
| **Total** | 1,320 | **5,500+** | Combined |

---

## 🔄 Data Augmentation Strategy

### Applied Augmentations
```python
- Rotation: ±15°
- Flip: Horizontal & Vertical
- Brightness: ±25%
- Contrast: ±20%
- Saturation: ±20%
- Hue: ±10°
- Noise: Gaussian (σ=0.01)
- Blur: Up to 2px
- Zoom: 0.9-1.1x
- Translation: ±10%
- Cutout: 3 boxes of 5% size
- Mosaic: 4-image mosaic
- Mixup: Alpha=0.1
```

These increase effective dataset size by **5-10x**!

---

## 📊 Expected Results

### Current Model (Roboflow)
```
mAP@0.5: ~0.75-0.85
Precision: ~0.80
Recall: ~0.75
Training time: N/A (pre-trained)
```

### Enhanced Model (After Training)
```
mAP@0.5: 0.85-0.92 (target)
Precision: 0.88-0.93
Recall: 0.85-0.90
Training time: 4-8 hours (GPU) / 24-48 hours (CPU)
```

### Performance Improvement
- **+10-15% mAP** from larger dataset
- **+5-10% precision** from better class balance
- **Better generalization** across lighting/angles
- **Fewer false positives** from augmentation

---

## 🛠️ Installation Requirements

```bash
# Core libraries (already installed)
pip install ultralytics opencv-python numpy

# Dataset tools
pip install roboflow
pip install kaggle
pip install fiftyone
pip install albumentations

# Optional: GPU acceleration
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

---

## 📖 Training Commands

### Basic Training (Current)
```bash
python train_model.py
```

### Enhanced Training (Recommended)
```bash
# Step 1: Download additional data
python download_additional_datasets.py

# Step 2: Prepare merged dataset
python prepare_enhanced_dataset.py

# Step 3: Train with enhanced dataset
python train_enhanced_model.py --epochs 200 --batch 16 --device 0
```

### Advanced Training Options
```bash
# Train with specific model size
python train_enhanced_model.py --model yolov8s.pt  # small
python train_enhanced_model.py --model yolov8m.pt  # medium

# Train with GPU
python train_enhanced_model.py --device 0  # GPU 0
python train_enhanced_model.py --device cpu  # CPU only

# Resume training
python train_enhanced_model.py --resume runs/train/onion_v4/weights/last.pt

# Multi-GPU training
python train_enhanced_model.py --device 0,1,2,3
```

---

## 🎯 Best Practices

### 1. **Data Quality**
✓ Remove duplicates
✓ Fix incorrect labels
✓ Balance class distribution
✓ Verify bounding boxes
✓ Use consistent lighting

### 2. **Training Strategy**
✓ Start with YOLOv8n (nano) for testing
✓ Use YOLOv8s/m for production
✓ Train for 100-300 epochs
✓ Use early stopping (patience=20)
✓ Monitor validation metrics

### 3. **Hyperparameters**
```yaml
# Recommended settings
lr0: 0.01              # Initial learning rate
lrf: 0.01              # Final learning rate
momentum: 0.937        # SGD momentum
weight_decay: 0.0005   # Weight decay
warmup_epochs: 3       # Warmup epochs
warmup_momentum: 0.8   # Warmup momentum
box: 7.5               # Box loss gain
cls: 0.5               # Class loss gain
dfl: 1.5               # DFL loss gain
```

### 4. **Augmentation Balance**
- Too little: Model overfits
- Too much: Model underfits
- **Sweet spot:** 5-8 augmentation types

### 5. **Evaluation**
✓ Test on unseen data
✓ Check confusion matrix
✓ Validate on real-world images
✓ Test different lighting conditions
✓ Verify bounding box accuracy

---

## 📈 Monitoring Training

### TensorBoard (Real-time Monitoring)
```bash
# Start TensorBoard
tensorboard --logdir runs/train

# Open browser
http://localhost:6006
```

**Metrics to Watch:**
- `train/box_loss` - Should decrease
- `train/cls_loss` - Should decrease
- `val/mAP50` - Should increase
- `val/precision` - Should increase
- `val/recall` - Should increase

### Training Logs
```
Epoch   GPU_mem   box_loss   cls_loss   dfl_loss   Instances   Size
  1/200    2.5G      1.234      0.876      1.123        156      640
  50/200   2.5G      0.456      0.234      0.567        156      640
  100/200  2.5G      0.234      0.123      0.345        156      640
  
Final: mAP@0.5=0.89, Precision=0.91, Recall=0.87
```

---

## 🎨 Class Distribution Balance

### Current (Imbalanced)
```
onion (healthy): 696 ████████████████
unhealthy: 624      ██████████████
others: ???         ??
```

### Target (Balanced)
```
onion: 2000         ████████████████████
staining: 500       █████
sprouted: 500       █████
double_split: 500   █████
black_smut: 500     █████
spoiled: 1000       ██████████
unhealthy: 500      █████
manual_review: 500  █████
```

**How to Balance:**
1. **Oversample** minority classes (duplicate + augment)
2. **Undersample** majority classes (careful!)
3. **Synthetic data** (GAN/diffusion - advanced)
4. **Class weights** (in training config)

---

## 🔍 Validation Strategy

### K-Fold Cross-Validation (Optional)
```bash
# 5-fold cross-validation
python train_kfold.py --folds 5
```

Benefits:
- More robust evaluation
- Better generalization estimate
- Identifies overfitting
- Requires 5x training time

### Test-Time Augmentation (TTA)
```python
# Enable TTA during inference
model.predict(image, augment=True)
```

Benefits:
- +2-5% mAP improvement
- More stable predictions
- Slower inference (3-5x)

---

## 💾 Model Export

### After Training
```bash
# Export to different formats
python export_model.py
```

**Available Formats:**
- PyTorch (.pt) - Default
- ONNX (.onnx) - Cross-platform
- TensorRT (.engine) - NVIDIA GPU
- CoreML (.mlmodel) - iOS/Mac
- TensorFlow (.pb) - TF ecosystem
- OpenVINO - Intel CPUs

### Example Export
```python
from ultralytics import YOLO

model = YOLO('runs/train/onion_v4/weights/best.pt')

# Export to ONNX (recommended)
model.export(format='onnx')

# Export to TensorRT (fastest on NVIDIA GPU)
model.export(format='engine', device=0)
```

---

## 🎯 Training Checklist

### Pre-Training
- [ ] Download additional datasets
- [ ] Merge and clean data
- [ ] Balance class distribution
- [ ] Verify label format (YOLO)
- [ ] Update data.yaml
- [ ] Set training hyperparameters

### During Training
- [ ] Monitor TensorBoard
- [ ] Check GPU utilization
- [ ] Watch for overfitting
- [ ] Validate periodically
- [ ] Save checkpoints

### Post-Training
- [ ] Evaluate on test set
- [ ] Check confusion matrix
- [ ] Test on real images
- [ ] Compare with baseline
- [ ] Export best model
- [ ] Update API to use new model

---

## 🚀 Quick Commands Reference

```bash
# 1. Download datasets
python download_additional_datasets.py

# 2. Prepare data
python prepare_enhanced_dataset.py

# 3. Train model
python train_enhanced_model.py

# 4. Evaluate model
python evaluate_model.py --weights runs/train/best.pt

# 5. Test inference
python test_inference.py --image test.jpg --model best.pt

# 6. Export model
python export_model.py --weights best.pt --format onnx

# 7. Update API
cp runs/train/onion_v4/weights/best.pt models/onion_detector_enhanced.pt
# Update defect_detection.py to use new model
```

---

## 📊 Expected Timeline

| Phase | Duration | Activity |
|-------|----------|----------|
| **Data Collection** | 2-4 hours | Download from Roboflow, Kaggle, etc. |
| **Data Preparation** | 1-2 hours | Merge, clean, augment |
| **Training Setup** | 30 mins | Configure hyperparameters |
| **Training (GPU)** | 4-8 hours | 200 epochs |
| **Training (CPU)** | 24-48 hours | 200 epochs |
| **Evaluation** | 1 hour | Test and validate |
| **Export & Deploy** | 30 mins | Export and update API |
| **Total (GPU)** | 8-16 hours | Full pipeline |
| **Total (CPU)** | 30-56 hours | Full pipeline |

---

## 🎓 Next Steps

1. **Read this guide completely**
2. **Run dataset download scripts** (next file)
3. **Prepare enhanced dataset**
4. **Start training**
5. **Monitor and evaluate**
6. **Deploy improved model**

---

**Ready to train?** Let's create the training scripts! 🚀
