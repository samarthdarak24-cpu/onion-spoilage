"""
Prepare Enhanced Dataset for Training
=====================================

Combines multiple datasets, applies augmentation, and creates train/val/test splits.

Usage:
    python prepare_enhanced_dataset.py
"""

import os
import shutil
import random
from pathlib import Path
from collections import Counter
import yaml


# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent
DATASETS_DIR = BASE_DIR / "datasets"
OUTPUT_DIR = BASE_DIR / "datasets" / "enhanced_combined"

# Dataset sources (add your downloaded datasets here)
DATASET_SOURCES = [
    DATASETS_DIR / "roboflow_original",
    # Add more as you download them:
    # DATASETS_DIR / "roboflow_additional_1",
    # DATASETS_DIR / "kaggle_onions",
]

# Train/Val/Test split
TRAIN_RATIO = 0.70
VAL_RATIO = 0.20
TEST_RATIO = 0.10

# Class mapping (update based on your classes)
CLASS_NAMES = {
    0: "onion",          # healthy
    1: "staining",       # minor defect
    2: "sprouted",       # moderate defect
    3: "double_split",   # moderate defect
    4: "black_smut",     # severe defect
    5: "spoiled",        # severe defect
    6: "unhealthy",      # severe defect
    7: "manual_review"   # needs review
}

# Minimum images per class (for balancing)
MIN_IMAGES_PER_CLASS = 100


# ==========================================================================
# HELPER FUNCTIONS
# ==========================================================================

def find_datasets(base_dir):
    """Find all YOLO datasets in directory."""
    datasets = []
    
    for subdir in base_dir.iterdir():
        if subdir.is_dir():
            # Check if it looks like a YOLO dataset
            train_dir = subdir / "train" / "images"
            if train_dir.exists():
                datasets.append(subdir)
                print(f"  Found dataset: {subdir.name}")
    
    return datasets


def count_images_per_class(dataset_path):
    """Count number of images for each class."""
    class_counts = Counter()
    
    for split in ["train", "valid", "test"]:
        labels_dir = dataset_path / split / "labels"
        if not labels_dir.exists():
            continue
        
        for label_file in labels_dir.glob("*.txt"):
            with open(label_file, 'r') as f:
                for line in f:
                    if line.strip():
                        class_id = int(line.split()[0])
                        class_counts[class_id] += 1
    
    return class_counts


def copy_dataset_files(source_dataset, target_dir, split="train"):
    """
    Copy images and labels from source to target.
    
    Args:
        source_dataset: Source dataset path
        target_dir: Target directory
        split: Split name (train/val/test)
    """
    source_images = source_dataset / split / "images"
    source_labels = source_dataset / split / "labels"
    
    if not source_images.exists():
        # Try different split naming
        if split == "valid" and (source_dataset / "val" / "images").exists():
            source_images = source_dataset / "val" / "images"
            source_labels = source_dataset / "val" / "labels"
        else:
            return 0
    
    target_images = target_dir / split / "images"
    target_labels = target_dir / split / "labels"
    
    target_images.mkdir(parents=True, exist_ok=True)
    target_labels.mkdir(parents=True, exist_ok=True)
    
    copied = 0
    
    for img_file in source_images.glob("*.*"):
        # Copy image
        shutil.copy2(img_file, target_images / img_file.name)
        
        # Copy corresponding label
        label_file = source_labels / (img_file.stem + ".txt")
        if label_file.exists():
            shutil.copy2(label_file, target_labels / label_file.name)
        
        copied += 1
    
    return copied


def balance_dataset(dataset_dir, min_images_per_class=MIN_IMAGES_PER_CLASS):
    """
    Balance dataset by duplicating underrepresented classes.
    
    Args:
        dataset_dir: Dataset directory
        min_images_per_class: Minimum images per class
    """
    print("\n" + "="*60)
    print("BALANCING DATASET")
    print("="*60)
    
    # Count current distribution
    class_counts = count_images_per_class(dataset_dir)
    
    print("\nCurrent distribution:")
    for class_id, count in sorted(class_counts.items()):
        class_name = CLASS_NAMES.get(class_id, f"unknown_{class_id}")
        print(f"  {class_name:20s}: {count:5d} images")
    
    # Balance train split
    train_images = dataset_dir / "train" / "images"
    train_labels = dataset_dir / "train" / "labels"
    
    # Group files by class
    files_by_class = {i: [] for i in range(len(CLASS_NAMES))}
    
    for label_file in train_labels.glob("*.txt"):
        with open(label_file, 'r') as f:
            lines = f.readlines()
            if lines:
                class_id = int(lines[0].split()[0])
                img_file = train_images / (label_file.stem + ".jpg")
                if not img_file.exists():
                    img_file = train_images / (label_file.stem + ".png")
                
                if img_file.exists():
                    files_by_class[class_id].append((img_file, label_file))
    
    # Duplicate underrepresented classes
    balanced = 0
    for class_id, files in files_by_class.items():
        current_count = len(files)
        if current_count == 0:
            continue
        
        class_name = CLASS_NAMES.get(class_id, f"unknown_{class_id}")
        
        if current_count < min_images_per_class:
            needed = min_images_per_class - current_count
            print(f"\n  Balancing {class_name}: {current_count} → {min_images_per_class}")
            
            # Duplicate random samples
            for i in range(needed):
                img_file, label_file = random.choice(files)
                
                # Create new filename
                new_stem = f"{img_file.stem}_aug{i}"
                new_img = train_images / f"{new_stem}{img_file.suffix}"
                new_label = train_labels / f"{new_stem}.txt"
                
                # Copy files
                shutil.copy2(img_file, new_img)
                shutil.copy2(label_file, new_label)
                
                balanced += 1
    
    print(f"\n✓ Added {balanced} augmented images for balancing")
    
    # Show final distribution
    final_counts = count_images_per_class(dataset_dir)
    print("\nFinal distribution:")
    for class_id, count in sorted(final_counts.items()):
        class_name = CLASS_NAMES.get(class_id, f"unknown_{class_id}")
        change = count - class_counts.get(class_id, 0)
        print(f"  {class_name:20s}: {count:5d} images (+{change})")


def create_data_yaml(output_dir, class_names):
    """Create data.yaml configuration file."""
    data_yaml = {
        "path": str(output_dir.absolute()),
        "train": "train/images",
        "val": "val/images",
        "test": "test/images",
        "nc": len(class_names),
        "names": class_names
    }
    
    yaml_path = output_dir / "data.yaml"
    with open(yaml_path, 'w') as f:
        yaml.dump(data_yaml, f, default_flow_style=False)
    
    print(f"\n✓ Created: {yaml_path}")
    return yaml_path


def split_train_val_test(dataset_dir, train_ratio=0.7, val_ratio=0.2, test_ratio=0.1):
    """
    Split combined dataset into train/val/test.
    
    Args:
        dataset_dir: Dataset directory
        train_ratio: Training split ratio
        val_ratio: Validation split ratio
        test_ratio: Test split ratio
    """
    print("\n" + "="*60)
    print("SPLITTING DATASET")
    print("="*60)
    
    train_images = dataset_dir / "train" / "images"
    train_labels = dataset_dir / "train" / "labels"
    
    val_images = dataset_dir / "val" / "images"
    val_labels = dataset_dir / "val" / "labels"
    
    test_images = dataset_dir / "test" / "images"
    test_labels = dataset_dir / "test" / "labels"
    
    val_images.mkdir(parents=True, exist_ok=True)
    val_labels.mkdir(parents=True, exist_ok=True)
    test_images.mkdir(parents=True, exist_ok=True)
    test_labels.mkdir(parents=True, exist_ok=True)
    
    # Get all training files
    all_images = list(train_images.glob("*.*"))
    random.shuffle(all_images)
    
    total = len(all_images)
    val_count = int(total * val_ratio / (train_ratio + val_ratio + test_ratio))
    test_count = int(total * test_ratio / (train_ratio + val_ratio + test_ratio))
    
    print(f"\nTotal images: {total}")
    print(f"  Train: {total - val_count - test_count} ({train_ratio*100:.0f}%)")
    print(f"  Val:   {val_count} ({val_ratio*100:.0f}%)")
    print(f"  Test:  {test_count} ({test_ratio*100:.0f}%)")
    
    # Move files to val
    for img_file in all_images[:val_count]:
        label_file = train_labels / (img_file.stem + ".txt")
        shutil.move(str(img_file), str(val_images / img_file.name))
        if label_file.exists():
            shutil.move(str(label_file), str(val_labels / label_file.name))
    
    # Move files to test
    for img_file in all_images[val_count:val_count + test_count]:
        label_file = train_labels / (img_file.stem + ".txt")
        shutil.move(str(img_file), str(test_images / img_file.name))
        if label_file.exists():
            shutil.move(str(label_file), str(test_labels / label_file.name))
    
    print("\n✓ Dataset split complete")


# ==========================================================================
# MAIN FUNCTION
# ==========================================================================

def main():
    """Main function to prepare enhanced dataset."""
    
    print("\n" + "🧅" * 30)
    print("ENHANCED DATASET PREPARATION")
    print("🧅" * 30)
    
    print(f"\nBase directory: {BASE_DIR}")
    print(f"Datasets directory: {DATASETS_DIR}")
    print(f"Output directory: {OUTPUT_DIR}")
    
    # Find available datasets
    print("\n" + "="*60)
    print("FINDING DATASETS")
    print("="*60)
    
    available_datasets = []
    for source in DATASET_SOURCES:
        if source.exists():
            available_datasets.append(source)
            print(f"  ✓ Found: {source.name}")
        else:
            print(f"  ✗ Not found: {source.name}")
    
    if not available_datasets:
        print("\n⚠ No datasets found!")
        print("  Run: python download_additional_datasets.py")
        return
    
    # Create output directory
    if OUTPUT_DIR.exists():
        print(f"\n⚠ Output directory exists: {OUTPUT_DIR}")
        response = input("  Delete and recreate? (y/n): ")
        if response.lower() == 'y':
            shutil.rmtree(OUTPUT_DIR)
            print("  ✓ Deleted")
        else:
            print("  ✗ Aborted")
            return
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Merge datasets
    print("\n" + "="*60)
    print("MERGING DATASETS")
    print("="*60)
    
    total_copied = 0
    
    for dataset_path in available_datasets:
        print(f"\nProcessing: {dataset_path.name}")
        
        # Copy train split
        train_count = copy_dataset_files(dataset_path, OUTPUT_DIR, "train")
        print(f"  Train: {train_count} images")
        total_copied += train_count
        
        # Copy valid split
        val_count = copy_dataset_files(dataset_path, OUTPUT_DIR, "valid")
        if val_count == 0:
            val_count = copy_dataset_files(dataset_path, OUTPUT_DIR, "val")
        print(f"  Val:   {val_count} images")
        total_copied += val_count
        
        # Copy test split (if exists)
        test_count = copy_dataset_files(dataset_path, OUTPUT_DIR, "test")
        if test_count > 0:
            print(f"  Test:  {test_count} images")
            total_copied += test_count
    
    print(f"\n✓ Merged {total_copied} images total")
    
    # Balance dataset
    if MIN_IMAGES_PER_CLASS > 0:
        balance_dataset(OUTPUT_DIR, MIN_IMAGES_PER_CLASS)
    
    # Split train/val/test
    split_train_val_test(OUTPUT_DIR, TRAIN_RATIO, VAL_RATIO, TEST_RATIO)
    
    # Create data.yaml
    yaml_path = create_data_yaml(OUTPUT_DIR, CLASS_NAMES)
    
    # Summary
    print("\n" + "="*60)
    print("PREPARATION COMPLETE")
    print("="*60)
    
    final_counts = count_images_per_class(OUTPUT_DIR)
    total_images = sum(final_counts.values())
    
    print(f"\nEnhanced dataset ready!")
    print(f"  Location: {OUTPUT_DIR}")
    print(f"  Config: {yaml_path}")
    print(f"  Total images: {total_images}")
    print(f"  Classes: {len(CLASS_NAMES)}")
    
    print("\nClass distribution:")
    for class_id, count in sorted(final_counts.items()):
        class_name = CLASS_NAMES.get(class_id, f"unknown_{class_id}")
        percentage = (count / total_images * 100) if total_images > 0 else 0
        print(f"  {class_name:20s}: {count:5d} images ({percentage:5.1f}%)")
    
    print("\nNext step:")
    print("  python train_enhanced_model.py")
    print("\n✓ Ready for training!\n")


if __name__ == "__main__":
    main()
