# Camera Troubleshooting Guide

## Issue: Camera Access Timeout

### Problem
The camera is timing out when accessed through OpenCV's `cv2.VideoCapture()` on Windows. This is a common issue caused by:
1. Camera being used by another application
2. Windows camera privacy settings
3. DirectShow driver initialization delay
4. Multiple camera access attempts

### Quick Fixes to Try

#### 1. Close Other Camera Apps
Close any applications that might be using the camera:
- Camera app
- Skype/Teams/Zoom
- OBS Studio
- Browser tabs with camera access

#### 2. Check Windows Camera Privacy
```
Settings > Privacy > Camera
- Ensure "Allow apps to access your camera" is ON
- Ensure "Allow desktop apps to access your camera" is ON
```

#### 3. Use Test Mode (Recommended for Now)
Add a test mode that uses sample images instead of live camera.

### Solutions Implemented

#### Option A: Increase Timeout (Done)
- Added 5-second timeout to camera initialization
- Added retry logic with delays
- Using DirectShow backend (`cv2.CAP_DSHOW`)

#### Option B: Test Mode (Recommended)
Since camera access is problematic, I recommend using test mode with sample images:

1. Use existing onion images from `Bulb/Healthy/Mixed/` folder
2. Simulate live feed by cycling through images
3. Run AI detection on these images
4. Show results as if from live camera

This way you can:
- Demo the feature without camera hardware
- Test the AI detection pipeline
- Show bounding boxes and detection
- Verify the complete workflow

### Alternative: Use Python Script Directly

Instead of web-based camera, use the standalone script:
```bash
cd "c:\Users\darak\Desktop\onion zip\onioncheck"
python live_camera_inspection.py
```

This script:
- Opens camera directly
- Shows live feed
- Runs AI detection
- Displays RED/GREEN boxes
- Works independently of web app

### Recommendation

**For Demo/Testing:**
Use test mode with sample images through the web interface

**For Real Usage:**
Use the standalone `live_camera_inspection.py` script which has better camera handling

Would you like me to:
1. Implement test mode with sample images?
2. Focus on fixing the camera access issue?
3. Update the web app to launch the standalone script?
