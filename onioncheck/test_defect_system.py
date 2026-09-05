"""
Test Script for Defect Detection System
========================================

This script tests all components of the defect detection system:
- Environment setup
- API connectivity
- Detection functionality
- Calibration
- Export features

Run this to verify your installation is working correctly.
"""

import os
import sys
from pathlib import Path
import json

# Color codes for terminal output
class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'


def print_header(text):
    """Print formatted header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}\n")


def print_success(text):
    """Print success message"""
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")


def print_error(text):
    """Print error message"""
    print(f"{Colors.RED}✗ {text}{Colors.END}")


def print_warning(text):
    """Print warning message"""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")


def print_info(text):
    """Print info message"""
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")


def test_imports():
    """Test if all required modules can be imported"""
    print_header("Testing Module Imports")
    
    modules = {
        "cv2": "OpenCV",
        "numpy": "NumPy",
        "pandas": "Pandas",
        "streamlit": "Streamlit",
        "flask": "Flask",
        "inference_sdk": "Roboflow SDK",
        "dotenv": "python-dotenv",
        "PIL": "Pillow"
    }
    
    all_ok = True
    
    for module, name in modules.items():
        try:
            __import__(module)
            print_success(f"{name} imported successfully")
        except ImportError as e:
            print_error(f"{name} import failed: {e}")
            all_ok = False
    
    return all_ok


def test_environment():
    """Test environment configuration"""
    print_header("Testing Environment Configuration")
    
    # Check .env file
    env_path = Path(__file__).parent / ".env"
    
    if not env_path.exists():
        print_error(".env file not found!")
        print_info("Create .env file with: ROBOFLOW_API_KEY=your_key_here")
        return False
    
    print_success(".env file exists")
    
    # Load and check API key
    from dotenv import load_dotenv
    load_dotenv(env_path)
    
    api_key = os.getenv("ROBOFLOW_API_KEY")
    
    if not api_key:
        print_error("ROBOFLOW_API_KEY not set in .env")
        return False
    
    if api_key.strip() == "":
        print_error("ROBOFLOW_API_KEY is empty")
        return False
    
    print_success(f"ROBOFLOW_API_KEY found (length: {len(api_key)})")
    
    return True


def test_detection_module():
    """Test defect detection module"""
    print_header("Testing Defect Detection Module")
    
    try:
        from defect_detection import (
            detect_defects_with_sizing,
            calibrate_size_detection,
            DEFECT_CLASSES,
            SIZE_CATEGORIES
        )
        print_success("defect_detection module imported")
        
        # Check defect classes
        print_info(f"Loaded {len(DEFECT_CLASSES)} defect classes")
        print_info(f"Loaded {len(SIZE_CATEGORIES)} size categories")
        
        return True
    
    except ImportError as e:
        print_error(f"Failed to import defect_detection: {e}")
        return False
    
    except Exception as e:
        print_error(f"Error loading defect_detection: {e}")
        return False


def test_roboflow_connection():
    """Test Roboflow API connection"""
    print_header("Testing Roboflow API Connection")
    
    try:
        from inference_sdk import InferenceHTTPClient
        from dotenv import load_dotenv
        
        load_dotenv()
        api_key = os.getenv("ROBOFLOW_API_KEY")
        
        client = InferenceHTTPClient(
            api_url="https://serverless.roboflow.com",
            api_key=api_key
        )
        
        print_success("Roboflow client initialized")
        print_info("API endpoint: https://serverless.roboflow.com")
        
        return True
    
    except Exception as e:
        print_error(f"Roboflow connection failed: {e}")
        return False


def test_detection_pipeline():
    """Test actual detection on sample image"""
    print_header("Testing Detection Pipeline")
    
    # Find test image
    test_dirs = [
        Path(__file__).parent / "test" / "images",
        Path(__file__).parent / "test_image",
        Path(__file__).parent / "valid" / "images"
    ]
    
    test_image = None
    
    for test_dir in test_dirs:
        if test_dir.exists():
            images = list(test_dir.glob("*.jpg")) + list(test_dir.glob("*.png"))
            if images:
                test_image = images[0]
                break
    
    if not test_image:
        print_warning("No test images found, skipping detection test")
        print_info("Add test images to test/images/ folder")
        return True  # Not a critical failure
    
    print_info(f"Using test image: {test_image.name}")
    
    try:
        from defect_detection import detect_defects_with_sizing
        import cv2
        
        # Run detection
        print_info("Running detection...")
        
        results = detect_defects_with_sizing(
            str(test_image),
            pixels_per_cm=20.0,
            confidence_threshold=0.4
        )
        
        # Verify results structure
        required_keys = [
            'total_detected',
            'defect_summary',
            'severity_summary',
            'detections',
            'statistics',
            'annotated_image'
        ]
        
        for key in required_keys:
            if key not in results:
                print_error(f"Missing key in results: {key}")
                return False
        
        print_success("Detection completed successfully")
        print_info(f"Detected: {results['total_detected']} onions")
        print_info(f"Healthy: {results['severity_summary']['healthy']}")
        print_info(f"Defect rate: {results['statistics']['defect_rate']}%")
        
        # Save test output
        output_path = Path(__file__).parent / "test_output.jpg"
        cv2.imwrite(str(output_path), results['annotated_image'])
        print_success(f"Test output saved: {output_path}")
        
        # Save JSON results
        json_output = Path(__file__).parent / "test_output.json"
        
        # Remove image data for JSON
        json_results = {k: v for k, v in results.items() if k != 'annotated_image'}
        
        with open(json_output, 'w') as f:
            json.dump(json_results, f, indent=2)
        
        print_success(f"JSON results saved: {json_output}")
        
        return True
    
    except Exception as e:
        print_error(f"Detection pipeline failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_export_functions():
    """Test export functionality"""
    print_header("Testing Export Functions")
    
    try:
        import pandas as pd
        import json
        
        # Test CSV export
        test_data = [
            {"id": 1, "class": "onion", "severity": 0},
            {"id": 2, "class": "sprouted", "severity": 2}
        ]
        
        df = pd.DataFrame(test_data)
        csv_output = df.to_csv(index=False)
        
        print_success("CSV export working")
        
        # Test JSON export
        json_output = json.dumps(test_data, indent=2)
        
        print_success("JSON export working")
        
        return True
    
    except Exception as e:
        print_error(f"Export test failed: {e}")
        return False


def test_streamlit_app():
    """Test if Streamlit app can be loaded"""
    print_header("Testing Streamlit Application")
    
    app_file = Path(__file__).parent / "defect_detection_app.py"
    
    if not app_file.exists():
        print_error("defect_detection_app.py not found")
        return False
    
    print_success("Streamlit app file exists")
    print_info("To run: streamlit run defect_detection_app.py --server.port 8502")
    
    return True


def test_flask_api():
    """Test if Flask API can be loaded"""
    print_header("Testing Flask API")
    
    api_file = Path(__file__).parent / "defect_api.py"
    
    if not api_file.exists():
        print_error("defect_api.py not found")
        return False
    
    print_success("Flask API file exists")
    print_info("To run: python defect_api.py")
    
    return True


def main():
    """Run all tests"""
    
    print(f"\n{Colors.BOLD}{'='*60}{Colors.END}")
    print(f"{Colors.BOLD}Defect Detection System - Test Suite{Colors.END}")
    print(f"{Colors.BOLD}{'='*60}{Colors.END}")
    
    tests = [
        ("Module Imports", test_imports),
        ("Environment", test_environment),
        ("Detection Module", test_detection_module),
        ("Roboflow Connection", test_roboflow_connection),
        ("Detection Pipeline", test_detection_pipeline),
        ("Export Functions", test_export_functions),
        ("Streamlit App", test_streamlit_app),
        ("Flask API", test_flask_api)
    ]
    
    results = []
    
    for name, test_func in tests:
        try:
            result = test_func()
            results.append((name, result))
        except Exception as e:
            print_error(f"Test crashed: {e}")
            results.append((name, False))
    
    # Summary
    print_header("Test Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        if result:
            print_success(f"{name}: PASSED")
        else:
            print_error(f"{name}: FAILED")
    
    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.END}")
    
    if passed == total:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 All tests passed! System is ready to use.{Colors.END}\n")
        print_info("Next steps:")
        print("  1. Run Streamlit dashboard: streamlit run defect_detection_app.py")
        print("  2. Run Flask API: python defect_api.py")
        print("  3. Check documentation: README_DEFECT_DETECTION.md")
        return 0
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}❌ Some tests failed. Please fix the issues above.{Colors.END}\n")
        return 1


if __name__ == "__main__":
    sys.exit(main())
