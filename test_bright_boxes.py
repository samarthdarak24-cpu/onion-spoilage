"""
Quick test to verify bright bounding boxes
"""
import sys
sys.path.insert(0, r'C:\Users\darak\Desktop\onion zip\onioncheck')

from defect_detection import detect_defects_with_sizing
from pathlib import Path
import cv2

# Test with sample image
test_image = Path(r"C:\Users\darak\Desktop\onion zip\onioncheck\test\images\Onion13364_jpg.rf.Ulf8LXLw2grOxarqqnHX.jpg")

if test_image.exists():
    print("🔍 Testing bright bounding boxes...")
    print(f"📸 Image: {test_image.name}")
    
    # Run detection
    results = detect_defects_with_sizing(str(test_image))
    
    # Save result
    output_path = Path(r"C:\Users\darak\Desktop\onion zip\bright_boxes_test.jpg")
    cv2.imwrite(str(output_path), results["annotated_image"])
    
    print(f"\n✅ SUCCESS!")
    print(f"📊 Detected: {results['total_detected']} onions")
    print(f"🎨 Annotated image saved to: {output_path}")
    print(f"\n🎯 Open this file to see BRIGHT RED/GREEN boxes!")
    
    # Show detections
    print(f"\n📋 Detections:")
    for det in results['detections']:
        color_name = {
            (0, 255, 0): "🟢 BRIGHT GREEN",
            (0, 0, 255): "🔴 BRIGHT RED",
            (0, 165, 255): "🟠 BRIGHT ORANGE",
            (0, 255, 255): "🟡 BRIGHT YELLOW"
        }.get(tuple(det.get('color', (0,0,0))), "⚫ Color")
        
        # Get defect info to show color
        from defect_detection import get_defect_info
        info = get_defect_info(det['class'])
        color = info['color']
        color_name = {
            (0, 255, 0): "🟢 BRIGHT GREEN",
            (0, 0, 255): "🔴 BRIGHT RED", 
            (0, 165, 255): "🟠 BRIGHT ORANGE",
            (0, 255, 255): "🟡 BRIGHT YELLOW"
        }.get(color, "⚫ Color")
        
        print(f"  - {det['class'].upper()}: {color_name} box (Confidence: {det['confidence']:.2f})")
else:
    print(f"❌ Test image not found: {test_image}")
