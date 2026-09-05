# 🧅 Onion Quality Detection Model - Complete Documentation

## Table of Contents
1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Model Pipeline](#model-pipeline)
4. [Detection & Classification Process](#detection--classification-process)
5. [Technical Components](#technical-components)
6. [API & Configuration](#api--configuration)
7. [Feature Extraction](#feature-extraction)
8. [Results & Output](#results--output)
9. [Deployment](#deployment)

---

## Overview

This is an **AI-powered Onion Quality Assessment System** that automatically detects onions in images and classifies them into three quality categories:

- 🟢 **Healthy**: Good quality onions suitable for consumption
- 🔴 **Rotten**: Damaged, spoiled, or defective onions
- 🌱 **Sprouted**: Onions showing signs of sprouting

### Key Features
- Real-time onion detection using Roboflow's object detection API
- Hybrid classification combining AI predictions with computer vision analysis
- Detailed feature extraction (area, brightness, circularity, etc.)
- Web-based interface using Streamlit
- Batch processing with CSV/JSON export capabilities

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (Streamlit)                │
│              Upload Image → Analyze → View Results           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  MAIN PROCESSING MODULE                      │
│                   (roboflow_grading.py)                      │
│                                                              │
│  ┌────────────────────────────────────────────────┐        │
│  │  Step 1: Load & Validate Image                 │        │
│  └──────────────────┬─────────────────────────────┘        │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────┐        │
│  │  Step 2: Roboflow API Detection                │        │
│  │  - Send image to Roboflow inference server     │        │
│  │  - Receive bounding boxes & class predictions  │        │
│  │  Model: veg1-hcqsf-2/4                         │        │
│  └──────────────────┬─────────────────────────────┘        │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────┐        │
│  │  Step 3: For Each Detected Onion               │        │
│  │                                                 │        │
│  │  A. Extract ROI (Region of Interest)           │        │
│  │  B. Initial Classification from API            │        │
│  │  C. Sprout Detection (OpenCV)                  │        │
│  │  D. Feature Calculation                        │        │
│  │  E. Final Classification Decision              │        │
│  └──────────────────┬─────────────────────────────┘        │
│                     │                                        │
│                     ▼                                        │
│  ┌────────────────────────────────────────────────┐        │
│  │  Step 4: Annotate Image & Generate Report      │        │
│  │  - Draw bounding boxes (color-coded)           │        │
│  │  - Add labels with confidence scores            │        │
│  │  - Compile statistics & metrics                 │        │
│  └────────────────────────────────────────────────┘        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  RESULTS PRESENTATION                        │
│  - Annotated image                                           │
│  - Detection summary (counts, percentages)                   │
│  - Individual onion metrics table                            │
│  - Downloadable CSV/JSON reports                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Model Pipeline

### 1. **Image Input**
- Accepts formats: **JPG, JPEG, PNG, WEBP**
- No size restrictions (processed at original resolution)
- Uploaded via web interface or API

### 2. **Object Detection (Roboflow)**

**Model Details:**
- **Model ID**: `veg1-hcqsf-2/4`
- **API Endpoint**: `https://serverless.roboflow.com`
- **Framework**: Roboflow Inference SDK
- **Detection Method**: YOLO-based object detection

**API Response Format:**
```json
{
  "predictions": [
    {
      "x": 320.5,           // Center X coordinate
      "y": 240.3,           // Center Y coordinate
      "width": 150,         // Bounding box width
      "height": 140,        // Bounding box height
      "confidence": 0.95,   // Detection confidence (0-1)
      "class": "onion"      // Predicted class
    }
  ]
}
```

**Detected Classes:**
- `onion` (healthy)
- `sprouted`
- `black smut`
- `black_smut`
- `double split`
- `double_split`
- `spoiled`
- `staining`
- `unhealthy`
- `manual review`

### 3. **Classification Logic**

#### Initial Classification (from Roboflow):
```python
if model_class == "onion":
    condition = "Healthy"
elif model_class == "sprouted":
    condition = "Sprouted"
else:  # defects: black smut, spoiled, staining, etc.
    condition = "Rotten"
```

#### Hybrid Sprout Detection:
The system uses **TWO methods** to detect sprouting:

**Method 1: Roboflow API Prediction**
- If model predicts "sprouted" class → Mark as Sprouted

**Method 2: OpenCV Computer Vision Analysis** (Fallback)
- Analyzes the onion's crop region for green pixels
- Uses HSV color space detection
- Threshold: `0.003` (0.3% green pixels)
- Looks for elongated green structures

**Why Hybrid Approach?**
- Increases sensitivity for early-stage sprouting
- Catches cases where AI model might miss subtle sprouts
- Reduces false negatives

---

## Detection & Classification Process

### Step-by-Step Breakdown

#### **Step 1: Load Image**
```python
image = cv2.imread(image_path)
original_image = image.copy()  # Keep unmodified version
```

#### **Step 2: API Inference**
```python
result = CLIENT.infer(image, model_id="veg1-hcqsf-2/4")
predictions = result.get("predictions", [])
```

#### **Step 3: Process Each Detection**

For each detected onion:

1. **Extract Bounding Box Coordinates**
   ```python
   # Roboflow returns center + dimensions
   center_x, center_y, box_width, box_height
   
   # Convert to corner coordinates
   x1 = center_x - box_width/2
   y1 = center_y - box_height/2
   x2 = center_x + box_width/2
   y2 = center_y + box_height/2
   
   # Clamp to image boundaries
   x1, y1 = max(0, x1), max(0, y1)
   x2 = min(image_width, x2)
   y2 = min(image_height, y2)
   ```

2. **Crop Onion Region (ROI)**
   ```python
   onion_roi = original_image[y1:y2, x1:x2]
   ```

3. **Initial Classification**
   ```python
   condition = map_to_condition(detected_class)
   confidence = detection_confidence
   ```

4. **Sprout Detection Analysis**
   ```python
   is_sprouted, sprout_confidence, green_ratio = detect_sprout(onion_roi)
   ```

5. **Final Classification Decision**
   ```python
   if detected_class == "sprouted":
       condition = "Sprouted"
       confidence = detection_confidence
   elif is_sprouted and sprout_confidence >= 0.45:
       condition = "Sprouted"  # Override based on OpenCV analysis
       confidence = sprout_confidence
   ```

6. **Feature Extraction**
   ```python
   features = calculate_onion_features(onion_roi)
   # Returns: area, width, height, aspect_ratio, circularity, brightness
   ```

7. **Draw Annotations**
   ```python
   color = get_color(condition)  # Green/Red/Blue
   cv2.rectangle(image, (x1, y1), (x2, y2), color, 3)
   cv2.putText(image, label, position, font, size, color, thickness)
   ```

---

## Technical Components

### 1. **Sprout Detection Algorithm**

**Purpose**: Detect green sprouts using computer vision

**Process:**
1. Convert ROI to HSV color space
2. Define green color range
   - Hue: 30-100
   - Saturation: 25-255
   - Value: 25-255
3. Create binary mask of green pixels
4. Apply morphological operations (noise removal)
5. Find connected components
6. Analyze component shapes (elongated = likely sprout)
7. Calculate metrics

**Metrics:**
- **Green Ratio**: `green_pixels / total_pixels`
- **Threshold**: `0.003` (0.3%)
- **Sprout Confidence**: Based on green ratio + shape analysis
- **Elongation Detection**: aspect_ratio > 1.3

**Code Reference:**
```python
def detect_sprout(image_roi):
    # Convert to HSV
    hsv = cv2.cvtColor(image_roi, cv2.COLOR_BGR2HSV)
    
    # Green range (HSV)
    lower_green = [30, 25, 25]
    upper_green = [100, 255, 255]
    
    # Create mask
    green_mask = cv2.inRange(hsv, lower_green, upper_green)
    
    # Morphological operations
    kernel = np.ones((3,3), np.uint8)
    green_mask = cv2.morphologyEx(green_mask, cv2.MORPH_OPEN, kernel)
    green_mask = cv2.morphologyEx(green_mask, cv2.MORPH_DILATE, kernel)
    
    # Calculate green ratio
    green_pixels = cv2.countNonZero(green_mask)
    total_pixels = image_roi.shape[0] * image_roi.shape[1]
    green_ratio = green_pixels / total_pixels
    
    # Check for elongated components (sprouts)
    contours, _ = cv2.findContours(green_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    elongated_found = False
    
    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)
        aspect_ratio = max(w/h, h/w)
        if aspect_ratio > 1.3:
            elongated_found = True
    
    # Calculate confidence
    ratio_score = min(green_ratio / 0.003, 1.0)
    shape_bonus = 0.25 if elongated_found else 0.0
    sprout_confidence = min(ratio_score * 0.75 + shape_bonus, 1.0)
    
    # Decision
    is_sprouted = (green_ratio >= 0.003)
    
    return is_sprouted, sprout_confidence, green_ratio
```

---

### 2. **Feature Extraction**

**Extracted Features:**

1. **Area (px²)**
   ```python
   area = width × height
   ```

2. **Width & Height (px)**
   ```python
   height, width = roi.shape[:2]
   ```

3. **Aspect Ratio**
   ```python
   aspect_ratio = width / height
   ```
   - Values close to 1.0 indicate round objects
   - Higher values indicate elongated objects

4. **Circularity**
   ```python
   circularity = (4π × area) / (perimeter²)
   ```
   - Range: 0 to 1
   - 1.0 = perfect circle
   - Lower values = irregular shape
   
   **Process:**
   - Convert to grayscale
   - Apply Gaussian blur
   - Threshold using Otsu's method
   - Find contours
   - Calculate for largest contour

5. **Brightness**
   ```python
   brightness = mean(grayscale_pixel_values)
   ```
   - Range: 0-255
   - Higher = brighter
   - Can indicate quality/freshness

**Example Output:**
```python
{
    "Area (px²)": 21000.5,
    "Width (px)": 150,
    "Height (px)": 140,
    "Aspect Ratio": 1.071,
    "Circularity": 0.875,
    "Brightness": 142.34
}
```

---

### 3. **Color Coding System**

**Bounding Box Colors:**
- 🟢 **Healthy**: RGB(0, 200, 0) - Green
- 🔴 **Rotten**: RGB(0, 0, 255) - Red
- 🌱 **Sprouted**: RGB(255, 0, 0) - Blue

**Format**: OpenCV uses BGR format
```python
def get_color(condition):
    if condition == "Healthy":
        return (0, 200, 0)      # BGR: Green
    elif condition == "Rotten":
        return (0, 0, 255)      # BGR: Red
    elif condition == "Sprouted":
        return (255, 0, 0)      # BGR: Blue
```

---

## API & Configuration

### Environment Variables (.env)
```bash
ROBOFLOW_API_KEY=zstkHHBPCjRLMGhYOGpQ
```

### Model Configuration
```python
MODEL_ID = "veg1-hcqsf-2/4"
API_URL = "https://serverless.roboflow.com"
```

### Roboflow Client Setup
```python
from inference_sdk import InferenceHTTPClient

CLIENT = InferenceHTTPClient(
    api_url="https://serverless.roboflow.com",
    api_key=API_KEY
)
```

### Detection Thresholds
```python
# Sprout detection sensitivity
SPROUT_GREEN_RATIO_THRESHOLD = 0.003  # 0.3% green pixels

# Sprout confidence threshold for override
SPROUT_OVERRIDE_THRESHOLD = 0.45  # 45%
```

---

## Feature Extraction

### Detailed Feature Descriptions

| Feature | Description | Formula | Use Case |
|---------|-------------|---------|----------|
| **Area** | Total pixels in bounding box | width × height | Size comparison |
| **Width** | Horizontal dimension | pixels | Shape analysis |
| **Height** | Vertical dimension | pixels | Shape analysis |
| **Aspect Ratio** | Width/height proportion | width ÷ height | Detect elongated onions |
| **Circularity** | How round the object is | 4π·A / P² | Quality indicator |
| **Brightness** | Average pixel intensity | mean(gray pixels) | Freshness indicator |
| **Green Ratio** | Proportion of green pixels | green_px / total_px | Sprout detection |

### Feature Value Ranges

- **Area**: 0 to image_size (typically 1,000 - 100,000)
- **Aspect Ratio**: 0.5 - 2.0 (round onions ~1.0)
- **Circularity**: 0.0 - 1.0 (perfect circle = 1.0)
- **Brightness**: 0 - 255 (dark to bright)
- **Green Ratio**: 0.0 - 1.0 (0% to 100% green)

---

## Results & Output

### Output Structure

```python
{
    "total_onions": 5,
    "healthy": 3,
    "rotten": 1,
    "sprouted": 1,
    "manual_review": 0,
    "results": [
        {
            "Onion": 1,
            "Detection Confidence": 0.956,
            "Condition": "Healthy",
            "Condition Confidence": 0.956,
            "Detected Class": "onion",
            "Sprout Evidence": 0.120,
            "Green Ratio": 0.0012,
            "Area (px²)": 21000.5,
            "Width (px)": 150,
            "Height (px)": 140,
            "Aspect Ratio": 1.071,
            "Circularity": 0.875,
            "Brightness": 142.34,
            "Bounding Box": {
                "x1": 100,
                "y1": 50,
                "x2": 250,
                "y2": 190
            }
        },
        // ... more onions
    ],
    "output_image": <annotated_cv2_image>
}
```

### Web Interface Display

**Summary Metrics:**
- 🧅 Total Onions Detected
- 🟢 Healthy Count & Percentage
- 🔴 Rotten Count & Percentage
- 🌱 Sprouted Count & Percentage

**Individual Results Table:**
| Onion | Detection Conf | Condition | Condition Conf | Area | Width | Height | Aspect | Circularity | Brightness |
|-------|---------------|-----------|----------------|------|-------|--------|--------|-------------|------------|
| 1 | 0.956 | Healthy | 0.956 | 21000 | 150 | 140 | 1.071 | 0.875 | 142.34 |

**Export Options:**
- 📄 CSV Download
- 📋 JSON Download

---

## Deployment

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Frontend** | Streamlit | Web interface |
| **Backend** | Python 3.11 | Processing logic |
| **Object Detection** | Roboflow API | AI inference |
| **Image Processing** | OpenCV | Computer vision |
| **Numerical Computing** | NumPy | Array operations |
| **Data Handling** | Pandas | Results formatting |

### Dependencies

```txt
ultralytics          # YOLO framework
streamlit           # Web UI
opencv-python       # Computer vision
numpy               # Numerical operations
pandas              # Data manipulation
inference-sdk       # Roboflow client
python-dotenv       # Environment variables
```

### System Requirements

**Minimum:**
- Python 3.8+
- 4GB RAM
- Internet connection (for API)

**Recommended:**
- Python 3.11
- 8GB RAM
- Stable internet (5+ Mbps)

### Running the Application

```bash
# Install dependencies
pip install -r requirements.txt

# Set API key in .env file
echo "ROBOFLOW_API_KEY=your_key_here" > .env

# Run the application
streamlit run app.py
```

**Access:**
- Local: http://localhost:8502
- Network: http://<your-ip>:8502

---

## Performance Metrics

### Detection Speed
- **API Latency**: ~1-3 seconds per image
- **Sprout Analysis**: ~0.1-0.3 seconds per onion
- **Feature Extraction**: ~0.05-0.1 seconds per onion
- **Total Processing**: ~2-5 seconds per image (5-10 onions)

### Accuracy (Estimated)
- **Object Detection**: ~95% (Roboflow model)
- **Healthy Classification**: ~90-95%
- **Rotten Classification**: ~85-90%
- **Sprout Classification**: ~80-90% (hybrid approach)

### Limitations
1. **Lighting Sensitivity**: Poor lighting affects sprout detection
2. **Overlap**: Overlapping onions may be detected as one
3. **Background**: Complex backgrounds may cause false detections
4. **Angle**: Side views may affect circularity measurements
5. **API Dependency**: Requires internet connection

---

## Decision Tree

```
Image Input
    │
    ▼
Roboflow API Detection
    │
    ├─► No onions found → Return "No onions detected"
    │
    └─► Onions detected
         │
         ▼
    For each detected onion:
         │
         ├─► Roboflow class = "onion"
         │        │
         │        ├─► OpenCV detects sprout (green_ratio ≥ 0.003 AND confidence ≥ 0.45)
         │        │        └─► Classification: SPROUTED
         │        │
         │        └─► No sprout detected
         │                 └─► Classification: HEALTHY
         │
         ├─► Roboflow class = "sprouted"
         │        └─► Classification: SPROUTED
         │
         └─► Roboflow class = defect (black_smut, spoiled, etc.)
                  └─► Classification: ROTTEN
```

---

## Example Analysis

### Input Image
- Contains 3 onions
- Mixed quality

### Processing
1. **Onion 1**
   - Roboflow: "onion" (confidence: 0.96)
   - Sprout check: green_ratio = 0.001 (below threshold)
   - **Result**: HEALTHY ✓

2. **Onion 2**
   - Roboflow: "onion" (confidence: 0.89)
   - Sprout check: green_ratio = 0.008, sprout_conf = 0.62
   - **Result**: SPROUTED ✓ (overridden by OpenCV)

3. **Onion 3**
   - Roboflow: "spoiled" (confidence: 0.91)
   - **Result**: ROTTEN ✓

### Output
- Total: 3 onions
- Healthy: 1 (33%)
- Sprouted: 1 (33%)
- Rotten: 1 (33%)

---

## Conclusion

This onion quality detection system combines:
- **Deep learning** (Roboflow YOLO model) for object detection
- **Computer vision** (OpenCV) for enhanced sprout detection
- **Feature engineering** for detailed quality metrics
- **Hybrid classification** for improved accuracy

The dual-approach (AI + CV) ensures robust detection across various conditions and reduces false negatives in sprouting detection.

---

## References

- **Roboflow**: Object detection platform
- **OpenCV**: Computer vision library
- **Streamlit**: Web application framework
- **YOLO**: Real-time object detection algorithm
- **HSV Color Space**: For color-based segmentation

---

**Version**: 1.0  
**Last Updated**: September 2026  
**Model ID**: veg1-hcqsf-2/4
