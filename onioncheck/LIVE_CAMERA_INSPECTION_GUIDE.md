# 📹 Live Camera Inspection Guide
**OnionSure - Real-Time Quality Assessment**

---

## 🎯 Overview

The Live Camera Inspection feature allows real-time onion quality assessment using a webcam or USB camera with Roboflow YOLO model detection.

### Features
✅ **Real-time detection** with bright RED/GREEN bounding boxes  
✅ **Live statistics** (healthy count, defect rate, FPS)  
✅ **Frame capture** with annotations  
✅ **Keyboard controls** for easy operation  
✅ **Session summaries** with total counts  
✅ **Web API integration** for remote access  

---

## 🚀 Quick Start

### Option 1: Standalone Python Application

```bash
# Navigate to onioncheck directory
cd "C:\Users\darak\Desktop\onion zip\onioncheck"

# Activate virtual environment
.venv\Scripts\activate

# Run live camera inspection
python live_camera_inspection.py
```

### Option 2: Flask API Integration

```bash
# Start the AI service (includes camera endpoints)
python defect_api.py

# Camera endpoints available at:
# GET http://localhost:5000/api/camera/status
# GET http://localhost:5000/api/camera/frame
```

---

## ⌨️ Keyboard Controls

| Key | Action |
|-----|--------|
| **SPACE** | Capture current frame and save annotated image |
| **Q** | Quit application |
| **S** | Toggle statistics display on/off |
| **C** | Toggle confidence scores on/off |
| **F** | Toggle FPS counter on/off |

---

## 🎨 Visual Output

### Bounding Box Colors
- 🟢 **Bright Green** - Healthy onions (Severity 0)
- 🟡 **Bright Yellow** - Minor defects like staining (Severity 1)
- 🟠 **Bright Orange** - Moderate defects like sprouting (Severity 2)
- 🔴 **Bright Red** - Severe defects like black smut (Severity 3)
- 🟣 **Magenta** - Needs manual review

### On-Screen Information

**Top-Left Statistics Panel:**
```
LIVE INSPECTION - Frame #1234
FPS: 28.5
Detected: 3 onions
Healthy: 2 | Defective: 1
Defect Rate: 33.3%

Session Total: 456 detections
Captures Saved: 12
```

**Each Detection Shows:**
- Class name (ONION, BLACK_SMUT, etc.)
- Confidence score (0.0-1.0)
- Size category (small/medium/large)
- Diameter in cm
- Estimated weight in grams
- Severity level (0-3)
- Detection ID number

**Bottom Controls Bar:**
```
SPACE: Capture | Q: Quit | S: Stats | C: Confidence | F: FPS
```

---

## 📸 Captured Images

### Storage Location
```
C:\Users\darak\Desktop\onion zip\onioncheck\live_captures\
```

### Filename Format
```
live_capture_20260905_143052_3onions.jpg
                 │         │      │
                 │         │      └─ Number of onions detected
                 │         └─ Time (HH:MM:SS)
                 └─ Date (YYYYMMDD)
```

### Captured Image Includes
- Full annotated frame with bounding boxes
- All detection labels and statistics
- Timestamp watermark
- Session information

---

## 🔧 Configuration

### Camera Settings

Edit `live_camera_inspection.py`:

```python
# Camera configuration
CAMERA_INDEX = 0          # 0=default webcam, 1=USB camera
FRAME_WIDTH = 1280
FRAME_HEIGHT = 720
CONFIDENCE_THRESHOLD = 0.4  # Detection confidence (0.0-1.0)
FPS_TARGET = 30
```

### Performance Tuning

**For better FPS:**
```python
FRAME_WIDTH = 640       # Lower resolution
FRAME_HEIGHT = 480
INFERENCE_SIZE = 416    # Smaller YOLOv8 input
```

**For better accuracy:**
```python
CONFIDENCE_THRESHOLD = 0.5  # Higher confidence
FRAME_WIDTH = 1920          # Higher resolution
FRAME_HEIGHT = 1080
```

---

## 🌐 Web API Integration

### Check Camera Status

```bash
curl http://localhost:5000/api/camera/status
```

**Response:**
```json
{
  "available": true,
  "camera_index": 0,
  "resolution": "1280x720",
  "fps": 30,
  "message": "Camera ready for live inspection"
}
```

### Get Single Camera Frame

```bash
curl http://localhost:5000/api/camera/frame
```

**Response:**
```json
{
  "success": true,
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "detections": [
    {
      "id": 1,
      "class": "onion",
      "confidence": 0.94,
      "severity": 0,
      "bounding_box": { ... },
      "size_estimation": { ... }
    }
  ],
  "statistics": {
    "total_onions": 2,
    "healthy_count": 1,
    "defective_count": 1,
    "defect_rate": 50.0
  },
  "timestamp": "2026-09-05T14:30:52.123456"
}
```

### React Frontend Integration

```typescript
// src/services/api.ts
export const getCameraFrame = async () => {
  const response = await axios.get(
    'http://localhost:5000/api/camera/frame'
  );
  return response.data;
};

// Usage in component
const [liveImage, setLiveImage] = useState<string>('');

const startLiveInspection = async () => {
  const intervalId = setInterval(async () => {
    try {
      const result = await getCameraFrame();
      setLiveImage(result.image);
      setStats(result.statistics);
    } catch (error) {
      console.error('Live inspection error:', error);
    }
  }, 1000); // Update every second
  
  return intervalId;
};
```

---

## 🎭 Use Cases

### 1. **Quality Control Station**
Set up a camera above a conveyor belt or inspection table. Run live camera inspection to automatically detect and classify onions in real-time.

### 2. **Manual Inspection Support**
Use as a second opinion tool during manual sorting. Operator places onions under camera and sees instant quality assessment.

### 3. **Training & Demonstration**
Demonstrate the AI model's capabilities to stakeholders, farmers, or FPO members in real-time.

### 4. **Batch Documentation**
Capture key frames during batch processing to maintain quality records with timestamps.

### 5. **Remote Monitoring**
Use API endpoints to integrate with web dashboard for remote quality monitoring.

---

## 📊 Performance Metrics

### Typical Performance

| Metric | Value | Notes |
|--------|-------|-------|
| **FPS** | 15-30 fps | Depends on hardware (CPU/GPU) |
| **Latency** | 50-200ms | Per frame inference time |
| **Resolution** | 1280x720 | Default, adjustable |
| **Detection Range** | 3-10 onions | Per frame, optimal 5-7 |
| **Min Confidence** | 0.4 | Adjustable (0.0-1.0) |

### Hardware Requirements

**Minimum:**
- CPU: Intel i5 or equivalent
- RAM: 4GB
- Camera: 720p webcam
- Storage: 1GB for captures

**Recommended:**
- CPU: Intel i7 or AMD Ryzen 7
- RAM: 8GB
- GPU: NVIDIA GTX 1050+ (10x faster)
- Camera: 1080p webcam with good lighting
- Storage: 10GB SSD

---

## 🔍 Troubleshooting

### Camera Not Detected

**Error:** `Cannot open camera 0`

**Solutions:**
1. Check camera is connected and powered
2. Try different camera index (1, 2, etc.)
3. Close other apps using camera (Zoom, Teams)
4. Check camera permissions in Windows Settings
5. Test camera in Camera app first

```python
# Try different camera indexes
CAMERA_INDEX = 1  # USB camera
CAMERA_INDEX = 2  # Secondary camera
```

### Low FPS / Laggy Performance

**Solutions:**
1. Reduce frame resolution:
   ```python
   FRAME_WIDTH = 640
   FRAME_HEIGHT = 480
   ```

2. Lower inference frequency (process every N frames):
   ```python
   if self.frame_count % 2 == 0:  # Process every 2nd frame
       predictions = self.detect_onions(frame)
   ```

3. Use GPU if available (requires CUDA setup)

4. Close other programs using resources

### Poor Detection Accuracy

**Solutions:**
1. Improve lighting conditions
2. Adjust camera angle (top-down works best)
3. Increase confidence threshold:
   ```python
   CONFIDENCE_THRESHOLD = 0.5
   ```

4. Ensure onions are clearly visible (not overlapping)
5. Clean camera lens

### Roboflow API Errors

**Error:** `Inference failed`

**Solutions:**
1. Check internet connection (API requires internet)
2. Verify API key in `.env` file
3. Check Roboflow API quota/limits
4. Ensure model ID is correct: `veg1-hcqsf-2/4`

---

## 🔄 Integration with OnionSure Backend

### Add to Inspection Workflow

The live camera can be integrated into the main OnionSure inspection process:

**Step 1: Add Camera Inspection Screen**
```typescript
// src/pages/LiveInspection.tsx
import { getCameraFrame } from '../services/api';

const LiveInspection = () => {
  const [isActive, setIsActive] = useState(false);
  const [frame, setFrame] = useState<string>('');
  
  useEffect(() => {
    if (!isActive) return;
    
    const intervalId = setInterval(async () => {
      const result = await getCameraFrame();
      setFrame(result.image);
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [isActive]);
  
  return (
    <div className="live-inspection">
      <h1>Live Camera Inspection</h1>
      <button onClick={() => setIsActive(!isActive)}>
        {isActive ? 'Stop' : 'Start'} Live Feed
      </button>
      
      {frame && <img src={frame} alt="Live inspection" />}
    </div>
  );
};
```

**Step 2: Add Route**
```typescript
// src/App.tsx
<Route path="/live-inspection" element={<LiveInspection />} />
```

**Step 3: Add Navigation Link**
```typescript
// Procurement Officer Dashboard
<Card onClick={() => navigate('/live-inspection')}>
  <Camera size={24} />
  <h3>Live Camera Inspection</h3>
</Card>
```

---

## 📝 Session Summary Example

```
============================================================
LIVE INSPECTION SESSION SUMMARY
============================================================
Total Frames Processed: 1,234
Total Detections: 456
Total Healthy: 298
Total Defective: 158
Captures Saved: 12
Captures Directory: C:\...\live_captures
============================================================
```

---

## 🎓 Best Practices

### 1. **Lighting Setup**
- Use diffused, even lighting (avoid shadows)
- Natural daylight or LED panel lights work best
- Avoid direct sunlight (causes glare)

### 2. **Camera Positioning**
- Mount camera directly above inspection area
- Distance: 30-50cm from onions
- Angle: Straight down (90° to surface)
- Ensure stable mounting (no vibration)

### 3. **Background**
- Use neutral background (white/gray)
- Avoid busy patterns or text
- Keep background clean

### 4. **Onion Placement**
- Spread onions with space between them
- Avoid overlapping (affects detection)
- Optimal: 3-7 onions per frame
- Rotate onions to see all sides

### 5. **Performance Optimization**
- Start with default settings
- Adjust resolution if FPS < 15
- Use GPU if available
- Close unnecessary applications

---

## 🔐 Security Considerations

### Privacy
- Camera only activates when application runs
- No automatic recording or cloud upload
- Captures stored locally
- No personal data in images

### Network Security
- API endpoints use localhost by default
- For production: Add authentication
- Use HTTPS for remote access
- Implement rate limiting

---

## 📚 Technical Details

### Detection Pipeline

```
1. Camera Capture (OpenCV VideoCapture)
   ↓
2. Frame Preprocessing (resize, format)
   ↓
3. Roboflow API Inference (YOLOv8)
   ↓
4. Bounding Box Drawing (OpenCV)
   ↓
5. Statistics Calculation
   ↓
6. Display Frame (OpenCV imshow)
```

### Frame Processing Time Breakdown

| Step | Time | Percentage |
|------|------|------------|
| Camera capture | 5-10ms | 5% |
| Roboflow inference | 150-200ms | 85% |
| Drawing/overlay | 5-10ms | 5% |
| Display | 5-10ms | 5% |
| **Total** | **165-230ms** | **100%** |

---

## 🚀 Future Enhancements

### Planned Features
- [ ] Multi-camera support (multiple angles)
- [ ] Video recording with annotations
- [ ] Automated sorting signals (GPIO/relay control)
- [ ] Real-time alerts for defect rate > threshold
- [ ] Historical trend charts
- [ ] Mobile app integration
- [ ] WebRTC streaming for remote viewing
- [ ] AI model hot-swapping (different models)
- [ ] Calibration wizard with UI
- [ ] Batch export to Excel/PDF

---

## 📞 Support

### Common Issues

**Q: Can I use multiple cameras?**  
A: Yes, modify `CAMERA_INDEX` or run multiple instances with different indexes.

**Q: Does it work offline?**  
A: Requires internet for Roboflow API. For offline use, need local YOLO deployment.

**Q: Can I change detection models?**  
A: Yes, update `MODEL_ID` to different Roboflow model version.

**Q: How to improve accuracy?**  
A: Better lighting, clear background, proper camera positioning, and model retraining.

---

## 📄 License

Part of OnionSure - Smart India Hackathon 2026 Submission  
Proprietary - OnionSure Development Team

---

**Version:** 1.0.0  
**Last Updated:** September 5, 2026  
**Tested On:** Windows 11, Python 3.11, OpenCV 4.12

---

*For additional support, refer to `ROBOFLOW_MODEL_ARCHITECTURE.md` for model details.*
