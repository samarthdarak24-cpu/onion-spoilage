"""
Download Additional Datasets from Roboflow Universe and Other Sources
======================================================================

This script downloads public datasets to enhance your training data.

Usage:
    python download_additional_datasets.py
"""

import os
from pathlib import Path
from roboflow import Roboflow


# ==========================================================================
# CONFIGURATION
# ==========================================================================

BASE_DIR = Path(__file__).resolve().parent
DATASETS_DIR = BASE_DIR / "datasets"
DATASETS_DIR.mkdir(exist_ok=True)

# Your Roboflow API key (from .env)
from dotenv import load_dotenv
load_dotenv()
API_KEY = os.getenv("ROBOFLOW_API_KEY")

# Public datasets to download (Roboflow Universe)
PUBLIC_DATASETS = [
    {
        "workspace": "veg1-hcqsf-2",  # Your current workspace
        "project": "veg1-hcqsf-2",
        "version": 4,
        "output_dir": "roboflow_original"
    },
    # Add more public datasets here
    # Example:
    # {
    #     "workspace": "onion-quality",
    #     "project": "onion-defects",
    #     "version": 1,
    #     "output_dir": "roboflow_additional_1"
    # },
]


# ==========================================================================
# DOWNLOAD FUNCTIONS
# ==========================================================================

def download_roboflow_dataset(workspace, project, version, output_dir):
    """
    Download dataset from Roboflow.
    
    Args:
        workspace: Workspace name
        project: Project name
        version: Version number
        output_dir: Directory to save dataset
    """
    try:
        print(f"\n{'='*60}")
        print(f"Downloading: {workspace}/{project}/v{version}")
        print(f"Output: {output_dir}")
        print('='*60)
        
        # Initialize Roboflow
        rf = Roboflow(api_key=API_KEY)
        
        # Get project
        full_project_name = f"{workspace}/{project}"
        project_obj = rf.workspace(workspace).project(project)
        
        # Get version
        version_obj = project_obj.version(version)
        
        # Download dataset
        output_path = DATASETS_DIR / output_dir
        dataset = version_obj.download(
            model_format="yolov8",
            location=str(output_path)
        )
        
        print(f"✓ Downloaded successfully to: {output_path}")
        print(f"  Dataset YAML: {dataset.location}/data.yaml")
        
        return dataset
        
    except Exception as e:
        print(f"✗ Error downloading {workspace}/{project}: {e}")
        return None


def search_roboflow_universe(query="onion quality"):
    """
    Search Roboflow Universe for public datasets.
    
    Args:
        query: Search term
    """
    print(f"\n{'='*60}")
    print(f"Searching Roboflow Universe for: '{query}'")
    print('='*60)
    print("\nManual search URLs:")
    print(f"1. https://universe.roboflow.com/search?q={query.replace(' ', '+')}")
    print(f"2. https://universe.roboflow.com/browse/object-detection")
    print("\nSteps:")
    print("1. Visit the URLs above")
    print("2. Find relevant public datasets")
    print("3. Note the workspace/project/version")
    print("4. Add to PUBLIC_DATASETS list in this script")
    print("5. Re-run this script")
    print('='*60)


def download_kaggle_dataset(dataset_name, output_dir):
    """
    Download dataset from Kaggle.
    
    Requires: kaggle API configured (~/.kaggle/kaggle.json)
    
    Args:
        dataset_name: Kaggle dataset slug (e.g., "username/dataset-name")
        output_dir: Directory to save dataset
    """
    try:
        import kaggle
        
        print(f"\n{'='*60}")
        print(f"Downloading Kaggle dataset: {dataset_name}")
        print(f"Output: {output_dir}")
        print('='*60)
        
        output_path = DATASETS_DIR / output_dir
        output_path.mkdir(exist_ok=True, parents=True)
        
        # Download dataset
        kaggle.api.dataset_download_files(
            dataset_name,
            path=str(output_path),
            unzip=True
        )
        
        print(f"✓ Downloaded successfully to: {output_path}")
        return True
        
    except ImportError:
        print("✗ Kaggle API not installed. Install with: pip install kaggle")
        print("  Configure API key: https://www.kaggle.com/docs/api")
        return False
        
    except Exception as e:
        print(f"✗ Error downloading Kaggle dataset: {e}")
        return False


def scrape_google_images(query, num_images=100, output_dir="google_images"):
    """
    Scrape images from Google Images (requires manual labeling).
    
    Note: This is for educational purposes. Ensure proper licensing!
    
    Args:
        query: Search query
        num_images: Number of images to download
        output_dir: Directory to save images
    """
    try:
        from google_images_download import google_images_download
        
        print(f"\n{'='*60}")
        print(f"Scraping Google Images: '{query}'")
        print(f"Count: {num_images}")
        print(f"Output: {output_dir}")
        print('='*60)
        
        output_path = DATASETS_DIR / output_dir
        output_path.mkdir(exist_ok=True, parents=True)
        
        response = google_images_download.googleimagesdownload()
        
        arguments = {
            "keywords": query,
            "limit": num_images,
            "output_directory": str(output_path),
            "image_directory": "raw",
            "format": "jpg",
            "size": "medium",
            "aspect_ratio": "square"
        }
        
        paths = response.download(arguments)
        
        print(f"✓ Downloaded {len(paths)} images to: {output_path}")
        print("\n⚠ WARNING: These images need manual labeling!")
        print("  Use tools like LabelImg or Roboflow to annotate.")
        
        return True
        
    except ImportError:
        print("✗ google-images-download not installed.")
        print("  Install with: pip install google-images-download")
        return False
        
    except Exception as e:
        print(f"✗ Error scraping images: {e}")
        return False


# ==========================================================================
# MAIN FUNCTION
# ==========================================================================

def main():
    """Main function to download all datasets."""
    
    print("\n" + "🧅" * 30)
    print("ONION DATASET DOWNLOADER")
    print("🧅" * 30)
    
    print("\n📁 Output directory:", DATASETS_DIR)
    print("🔑 API Key:", "✓ Found" if API_KEY else "✗ Not found")
    
    if not API_KEY:
        print("\n⚠ WARNING: ROBOFLOW_API_KEY not found in .env file")
        print("  Add your API key to .env file:")
        print("  ROBOFLOW_API_KEY=your_key_here")
        return
    
    # Option 1: Download from Roboflow
    print("\n" + "="*60)
    print("OPTION 1: Download from Roboflow Universe")
    print("="*60)
    
    for idx, dataset_info in enumerate(PUBLIC_DATASETS, 1):
        print(f"\nDataset {idx}/{len(PUBLIC_DATASETS)}")
        download_roboflow_dataset(
            workspace=dataset_info["workspace"],
            project=dataset_info["project"],
            version=dataset_info["version"],
            output_dir=dataset_info["output_dir"]
        )
    
    # Option 2: Search for more datasets
    print("\n" + "="*60)
    print("OPTION 2: Find More Datasets")
    print("="*60)
    search_roboflow_universe("onion quality")
    search_roboflow_universe("vegetable defects")
    
    # Option 3: Kaggle datasets (commented - requires setup)
    print("\n" + "="*60)
    print("OPTION 3: Kaggle Datasets (Optional)")
    print("="*60)
    print("\nTo download from Kaggle:")
    print("1. Install kaggle: pip install kaggle")
    print("2. Setup API key: https://www.kaggle.com/docs/api")
    print("3. Search for datasets: https://www.kaggle.com/search?q=onion")
    print("4. Uncomment and modify the code below:")
    print("\n# Example:")
    print("# download_kaggle_dataset('username/onion-dataset', 'kaggle_onions')")
    
    # Option 4: Google Images (commented - requires manual labeling)
    print("\n" + "="*60)
    print("OPTION 4: Google Images (Manual Labeling Required)")
    print("="*60)
    print("\nTo scrape images from Google:")
    print("1. Install: pip install google-images-download")
    print("2. Uncomment code below:")
    print("\n# Example:")
    print("# scrape_google_images('spoiled onion', 100, 'google_spoiled')")
    print("# scrape_google_images('healthy onion', 100, 'google_healthy')")
    
    # Summary
    print("\n" + "="*60)
    print("DOWNLOAD COMPLETE")
    print("="*60)
    print(f"\nDatasets saved to: {DATASETS_DIR}")
    print("\nNext steps:")
    print("1. Verify downloaded datasets")
    print("2. Run: python prepare_enhanced_dataset.py")
    print("3. Run: python train_enhanced_model.py")
    print("\n✓ Ready for dataset preparation!\n")


if __name__ == "__main__":
    main()
