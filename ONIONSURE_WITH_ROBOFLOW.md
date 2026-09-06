# 🧅 OnionSure with Roboflow YOLO Integration

## ✅ **COMPLETE - YOUR PROJECT IS RUNNING!**

The Roboflow YOLO defect detection model has been successfully integrated into **OnionSure Quality Intelligence** system!

---

## 🔗 **YOUR LINKS:**

### **Main OnionSure Dashboard:**
```
http://localhost:3000/
```
👆 **OPEN THIS IN YOUR BROWSER**

This is your complete OnionSure system with:
- ✅ **AI Vision Detection** - Real Roboflow YOLO model
- ✅ **IoT Gas Sensors** - Ethane/Methane detection
- ✅ **Multimodal Fusion** - Vision + Gas + Environment
- ✅ **Digital Certificates** - QR-verifiable quality certificates
- ✅ **Real-time Dashboard** - Beautiful React/TypeScript UI

### **Backend API:**
```
http://localhost:4001/api/
```

### **Demo Login Credentials:**
- **Username:** `officer1`, `fpo1`, `farmer1`, `buyer1`, or `admin`
- **Password:** `password123`

---

## 🎯 **HOW TO USE THE AI MODEL:**

1. **Open OnionSure:** `http://localhost:3000/`

2. **Login** as Procurement Officer:
   - Username: `officer1`
   - Password: `password123`

3. **Go to "AI Analysis" section** in the sidebar

4. **Click "Upload Onion Image"** button

5. **Select an onion image** from your computer
   - Test images available in: `C:\Users\darak\Desktop\onion zip\onioncheck\test\images\`

6. **AI Analysis will show:**
   - 🟢 **Green boxes** around healthy onions
   - 🔴 **Red boxes** around rotten/defective onions
   - 🟠 **Orange boxes** around damaged onions
   - **Detection counts** (healthy, damaged, rotten, sprouted, undersized)
   - **Vision Score** (0-100)
   - **Quality Grading** (A, URS, or REJECTED)

---

## 🏗️ **SYSTEM ARCHITECTURE:**

### **1. Frontend (React + TypeScript):**
- Port: `3000`
- Location: `C:\Users\darak\Desktop\onion zip\onionsure\web\`
- Tech: React 18, Vite, Tailwind CSS, Framer Motion

### **2. Backend API (Node.js + Express):**
- Port: `4001`
- Location: `C:\Users\darak\Desktop\onion zip\onionsure\server\`
- Features: Auth, REST API, Python AI bridge

### **3. AI Services (Python):**
- Location: `C:\Users\darak\Desktop\onion zip\onionsure\python\`
- **vision_service.py** - Roboflow YOLO integration ✅
- **gas_quality_detector.py** - Gas sensor analysis
- **fusion_service.py** - Multimodal fusion engine

### **4. Roboflow Model:**
- Location: `C:\Users\darak\Desktop\onion zip\onioncheck\defect_detection.py`
- Model: YOLO-based defect detection
- Features:
  - Bright colored bounding boxes (Red/Green/Orange)
  - Size estimation (diameter, weight)
  - Defect classification
  - Confidence scores

---

## 🔧 **WHAT WAS INTEGRATED:**

### **Changes Made:**

1. **`onionsure/python/vision_service.py`** - UPDATED ✅
   - Replaced DEMO mode with real Roboflow model
   - Maps Roboflow classes to OnionSure 5-class model:
     - `onion` → `healthy`
     - `rotten`, `spoiled`, `unhealthy`, `black_smut` → `rotten`
     - `sprouted` → `sprouted`
     - `staining`, `double_split`, `damaged` → `damaged`
     - Size < 4cm → `undersized`
   - Returns vision score based on defect rate
   - Includes bounding boxes and confidence scores

2. **`onionsure/server/api.js`** - UPDATED ✅
   - Modified `/vision/analyze` endpoint
   - Saves uploaded images temporarily
   - Calls Python vision service with image path
   - Returns real Roboflow detection results

3. **`onioncheck/defect_detection.py`** - ENHANCED ✅
   - Brighter bounding box colors (RGB 255 values)
   - Thicker boxes (4px)
   - White text on black background
   - Better visibility for all defect types
   - Added "rotten" class

---

## 📊 **API ENDPOINTS:**

### **Vision Analysis:**
```
POST http://localhost:4001/api/vision/analyze
Content-Type: multipart/form-data
Authorization: Bearer <token>

Body:
  - image: file (required)
  - pixels_per_cm: number (optional, default: 20.0)

Response:
{
  "mode": "ROBOFLOW",
  "total": 10,
  "counts": {
    "healthy": 7,
    "damaged": 1,
    "rotten": 2,
    "sprouted": 0,
    "undersized": 0
  },
  "visionScore": 80,
  "confidence": 0.95,
  "detections": [...]
}
```

### **Other Available Endpoints:**
- `POST /api/auth/login` - User login
- `GET /api/lots` - List procurement lots
- `POST /api/inspection` - Create inspection session
- `POST /api/inspection/:id/analyze` - Full multimodal analysis
- `POST /api/iot/readings` - IoT sensor data
- `GET /api/certificates` - Quality certificates
- `POST /api/certificates/verify` - QR code verification

---

## 🚀 **SERVERS RUNNING:**

✅ **Frontend (Vite):** `http://localhost:3000/`  
✅ **Backend API (Express):** `http://localhost:4001/`  
✅ **Python AI Services:** Enabled via `USE_PYTHON=true`  
✅ **Roboflow Model:** Integrated and working  

---

## 🧪 **TESTING THE MODEL:**

### **Quick Test with Sample Images:**

```powershell
# Test images location:
cd "C:\Users\darak\Desktop\onion zip\onioncheck\test\images"

# You can upload any .jpg file from this folder in the web UI
```

### **Expected Results:**
- **Healthy onions:** Green boxes, high confidence
- **Rotten onions:** Red boxes, severity level 3
- **Damaged onions:** Orange/Yellow boxes, lower severity
- **Vision Score:** Calculated as 100 - defect_rate%
- **Detections:** Each onion with bbox, confidence, size, weight

---

## 💡 **KEY FEATURES:**

### **1. Real AI Detection**
- Real Roboflow YOLO model (not demo/mock)
- Trained on onion defect dataset
- Bright colored bounding boxes
- Confidence scores 0-1
- Size and weight estimation

### **2. Multimodal Fusion**
- Combines Vision + Gas + Environment scores
- Confidence-weighted fusion algorithm
- Early spoilage alert (healthy vision but high gas risk)
- Configurable weights and thresholds

### **3. Digital Certificates**
- Immutable quality certificates
- QR code generation
- Public verification system
- Blockchain-ready architecture

### **4. Beautiful UI**
- Modern React dashboard
- Real-time sensor streaming
- Interactive charts (Recharts)
- Responsive design (Tailwind CSS)
- Smooth animations (Framer Motion)

---

## 📝 **ONIONSURE vs FARMLINK:**

| Feature | OnionSure (Current) | FarmLink (Previous) |
|---------|---------------------|---------------------|
| **AI Model** | ✅ Roboflow YOLO (Real) | ✅ Roboflow YOLO (Real) |
| **Frontend** | ✅ React + TypeScript | ❌ Django Templates |
| **IoT Integration** | ✅ Gas sensors + Fusion | ❌ None |
| **Certificates** | ✅ Digital QR certificates | ❌ None |
| **Multimodal AI** | ✅ Vision + Gas + Env | ❌ Vision only |
| **Tech Stack** | Node.js + React | Django + DRF |
| **UI Quality** | ✅ Modern SPA | ⚠️ Basic HTML |

---

## 🎨 **BOUNDING BOX COLORS:**

- 🟢 **Bright Green (0, 255, 0):** Healthy onions
- 🔴 **Bright Red (0, 0, 255):** Rotten/Severe defects
- 🟠 **Bright Orange (0, 165, 255):** Moderate defects (sprouted, double split)
- 🟡 **Bright Yellow (0, 255, 255):** Minor defects (staining)
- 🟣 **Magenta (255, 0, 255):** Needs manual review

---

## 🔐 **AUTHENTICATION:**

OnionSure uses JWT tokens for authentication.

**Login Flow:**
1. POST `/api/auth/login` with `{ username, password }`
2. Receive `{ token, user }`
3. Include token in header: `Authorization: Bearer <token>`
4. Use token for all protected API calls

---

## 🛠️ **TROUBLESHOOTING:**

### **Port Already in Use:**
```powershell
# Change ports in terminal:
$env:PORT=4002; npm start  # Backend
# Frontend port set in vite.config.ts
```

### **Python not found:**
```powershell
# Check Python installation:
python --version

# Or specify Python path:
$env:PYTHON_BIN='python'; $env:USE_PYTHON='true'; npm start
```

### **Roboflow API Key:**
```
Location: C:\Users\darak\Desktop\onion zip\onioncheck\.env
File: ROBOFLOW_API_KEY=your_key_here
```

---

## 📦 **PROJECT STRUCTURE:**

```
onion zip/
├── onionsure/               # Main OnionSure project
│   ├── web/                 # React frontend (port 3000)
│   ├── server/              # Express backend (port 4001)
│   ├── python/              # AI services
│   │   ├── vision_service.py      # ✅ Roboflow integration
│   │   ├── gas_quality_detector.py
│   │   └── fusion_service.py
│   └── database/            # PostgreSQL schema
│
├── onioncheck/              # Roboflow detection module
│   ├── defect_detection.py  # ✅ Enhanced with bright boxes
│   ├── test/images/         # Sample onion images
│   └── .env                 # Roboflow API key
│
└── farmlink/                # Previous Django project (kept for reference)
```

---

## 🎯 **NEXT STEPS:**

1. **Open OnionSure:** `http://localhost:3000/`
2. **Login as officer1** (password: password123)
3. **Go to "AI Analysis"** section
4. **Upload an onion image**
5. **See real Roboflow detection with colored boxes!**

---

## 📞 **SUPPORT:**

- **Frontend logs:** Check browser console (F12)
- **Backend logs:** Check terminal running `npm start`
- **Python errors:** Check terminal output for Python tracebacks
- **API testing:** Use Postman or curl for direct API calls

---

## ✨ **SUCCESS!**

Your OnionSure Quality Intelligence system is now running with **REAL Roboflow YOLO AI detection**! 🎉

The model will show bright red and green boxes around onions, detect defects, estimate sizes, and provide comprehensive quality analysis.

**Enjoy your AI-powered onion quality assessment system!** 🧅✨
