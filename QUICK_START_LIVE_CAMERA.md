# 🚀 Quick Start - Live Camera Inspection

## ⚡ 3-Step Setup

### 1️⃣ Test Your Camera
```bash
cd "C:\Users\darak\Desktop\onion zip\onioncheck"
python test_camera.py
```
**Expected:** Live camera preview window. Press 'Q' to close.

---

### 2️⃣ Run Live Inspection
```bash
python live_camera_inspection.py
```

**Controls:**
- **SPACE** = Capture frame
- **Q** = Quit
- **S** = Toggle stats
- **C** = Toggle confidence
- **F** = Toggle FPS

---

### 3️⃣ Test API Integration
```bash
# In terminal 1: Start AI service
python defect_api.py

# In terminal 2: Test endpoints
curl http://localhost:5000/api/camera/status
curl http://localhost:5000/api/camera/frame
```

---

## 📸 What You'll See

```
┌─────────────────────────────────┐
│ LIVE INSPECTION - Frame #123    │
│ FPS: 28.5                        │
│ Detected: 3 onions               │
│ Healthy: 2 | Defective: 1        │
│ Defect Rate: 33.3%               │
└─────────────────────────────────┘

  🟢 ONION (Healthy)
     Conf: 0.94 | Size: medium
     D: 7.5cm | ~171g
     Sev: 0/3

  🔴 BLACK_SMUT (Severe)
     Conf: 0.87 | Size: medium  
     D: 7.0cm | ~150g
     Sev: 3/3
```

---

## 🎯 Current Git Branch

```bash
# You are on feature branch
git branch
# * feature/live-camera-inspection

# To switch to main
git checkout main

# To merge changes
git checkout main
git merge feature/live-camera-inspection
```

---

## 📁 Files Added

```
onioncheck/
├── live_camera_inspection.py       # Main app
├── test_camera.py                  # Camera test
├── ROBOFLOW_MODEL_ARCHITECTURE.md  # Tech docs
├── LIVE_CAMERA_INSPECTION_GUIDE.md # User guide
└── live_captures/                  # Auto-created

Root:
├── LIVE_CAMERA_FEATURE.md          # Implementation summary
└── QUICK_START_LIVE_CAMERA.md      # This file
```

---

## 🔧 Quick Troubleshooting

**Camera not found?**
```python
# Edit live_camera_inspection.py, line 49:
CAMERA_INDEX = 1  # Try 1 or 2 instead of 0
```

**Too slow?**
```python
# Edit live_camera_inspection.py, lines 50-51:
FRAME_WIDTH = 640   # Lower resolution
FRAME_HEIGHT = 480
```

**API not responding?**
```bash
# Check if service is running on port 5000
# Restart: python defect_api.py
```

---

## 🌐 Integration with OnionSure

Add to `src/pages/LiveInspection.tsx`:
```typescript
const { data } = await axios.get(
  'http://localhost:5000/api/camera/frame'
);
setImage(data.image);
setStats(data.statistics);
```

---

## ✅ Ready?

Run this now:
```bash
cd "C:\Users\darak\Desktop\onion zip\onioncheck"
python live_camera_inspection.py
```

Then press **SPACE** to capture your first annotated frame! 📸

---

**Need Help?** Read:
- `LIVE_CAMERA_INSPECTION_GUIDE.md` - Full user guide
- `ROBOFLOW_MODEL_ARCHITECTURE.md` - Technical details
- `LIVE_CAMERA_FEATURE.md` - Implementation summary
