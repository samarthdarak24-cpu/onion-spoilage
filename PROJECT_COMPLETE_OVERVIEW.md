# 📦 COMPLETE PROJECT OVERVIEW - FarmLink + AI Defect Detection

## 🗂️ Project Structure

```
C:\Users\darak\Desktop\onion zip\
│
├── 📁 farmlink/                    # Main Django Backend Platform
│   ├── 📁 buyers/                  # Buyer/Procurement Officer Module
│   │   ├── models.py              # Buyer profiles
│   │   ├── views.py               # Buyer CRUD operations
│   │   ├── quality_analysis.py    # ✨ NEW: AI Quality Analysis Integration
│   │   └── urls.py                # Includes quality/* endpoints
│   │
│   ├── 📁 farmers/                 # Farmer Management Module
│   │   ├── models.py              # Farmer profiles, FarmProduct
│   │   ├── views.py               # Farmer CRUD operations
│   │   └── urls.py
│   │
│   ├── 📁 products/                # Product Aggregation Module
│   │   ├── models.py              # AggregatedProductPool
│   │   ├── views.py               # Pool management
│   │   └── urls.py
│   │
│   ├── 📁 orders/                  # Order Management Module
│   │   ├── models.py              # Order, OrderDispute
│   │   ├── views.py               # Order lifecycle
│   │   └── urls.py
│   │
│   ├── 📁 smartcontracts/         # Blockchain Escrow Module
│   │   ├── models.py              # SmartContract, ContractEvent
│   │   ├── views.py               # Contract management
│   │   └── urls.py
│   │
│   ├── 📁 quality_inspection/     # ✨ NEW: Full Quality Module
│   │   ├── models.py              # QualityInspection, DefectDetection
│   │   ├── views.py               # Inspection API endpoints
│   │   ├── serializers.py         # API serializers
│   │   ├── admin.py               # Admin interface
│   │   └── urls.py                # /api/quality/ endpoints
│   │
│   ├── 📁 farmlink/               # Django Core Settings
│   │   ├── settings.py            # Configuration
│   │   ├── urls.py                # Main URL routing
│   │   └── views.py               # Root views
│   │
│   ├── manage.py                  # Django management
│   ├── settings.py                # Duplicate settings
│   ├── requirements.txt           # Python dependencies
│   └── 📄 Various docs (.md)      # Documentation files
│
├── 📁 onioncheck/                  # AI Defect Detection System
│   ├── defect_detection.py        # ✨ Main AI Detection Engine
│   ├── defect_detection_app.py    # Streamlit Dashboard
│   ├── defect_api.py              # Standalone Flask API
│   ├── roboflow_grading.py        # Original grading system
│   ├── app.py                     # Original Streamlit app
│   ├── data.yaml                  # YOLO dataset config
│   ├── requirements.txt           # AI dependencies
│   ├── .env                       # Roboflow API key
│   │
│   ├── 📁 models/                  # YOLO model weights
│   ├── 📁 test/                    # Test images
│   ├── 📁 train/                   # Training images
│   ├── 📁 valid/                   # Validation images
│   │
│   └── 📄 Documentation:
│       ├── README_DEFECT_DETECTION.md
│       ├── DEFECT_DETECTION_GUIDE.md
│       ├── SYSTEM_OVERVIEW.md
│       └── GET_STARTED.md
│
└── 📁 onionsure/                   # (Additional folder, not currently integrated)
```

---

## 🎯 Core Business Problem & Solution

### Problem:
**"Scale Mismatch Kills Small Farmers"**
- Factories need 10 tonnes/day
- Small farmers produce only 500kg
- Can't sign 20 separate contracts
- Trust issues (payment vs delivery)

### Solution:
**FarmLink Platform = Aggregation + Blockchain + AI Quality**

```
┌─────────────────────────────────────────────────────────┐
│                    FarmLink Solution                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. AGGREGATION ENGINE                                  │
│     - Combines multiple small farmers                   │
│     - Single order, single contract                     │
│     - 10 farmers × 500kg = 5 tonnes order              │
│                                                         │
│  2. SMART CONTRACT ESCROW                              │
│     - Blockchain-based payment lock                    │
│     - Released only after delivery                     │
│     - Protects both buyer and farmers                  │
│                                                         │
│  3. AI QUALITY CONTROL  ✨ NEW                         │
│     - Pre-shipment inspection                          │
│     - Defect detection                                 │
│     - Automated grading (A-F)                          │
│     - Price adjustment recommendations                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔗 Integration Points

### How AI Detection Connects to Django:

```
┌──────────────────────────────────────────────────────────┐
│  ONIONCHECK (AI System)          FARMLINK (Django)      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  defect_detection.py  ───────→  quality_inspection/     │
│  (Python module)                 views.py                │
│                                  (imports & uses AI)     │
│                                                          │
│  YOLO Model           ───────→  API Endpoints            │
│  (Roboflow)                      /api/quality/           │
│                                                          │
│  Results:             ───────→  Database Models          │
│  - Defect rate                   QualityInspection      │
│  - Size estimation                DefectDetection       │
│  - Quality grade                                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📊 Data Models Overview

### Core Database Tables:

```
┌─────────────────────────────────────────────────────────────┐
│ USER MANAGEMENT                                             │
├─────────────────────────────────────────────────────────────┤
│ • User (Django built-in)                                    │
│ • Farmer (Profile) ─────→ FarmProduct (1-to-many)          │
│ • Buyer (Profile)                                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ PRODUCT AGGREGATION                                         │
├─────────────────────────────────────────────────────────────┤
│ • FarmProduct (Individual farmer's produce)                 │
│ • AggregatedProductPool (Combined from multiple farmers)    │
│   ├─ Contains: Multiple FarmProducts                        │
│   └─ Used by: Orders                                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ORDER & PAYMENT FLOW                                        │
├─────────────────────────────────────────────────────────────┤
│ • Order                                                     │
│   ├─ buyer: Buyer                                          │
│   ├─ product_pool: AggregatedProductPool                   │
│   ├─ smart_contract: SmartContract                         │
│   └─ status: pending → escrow_locked → shipped → completed │
│                                                             │
│ • SmartContract (Blockchain escrow)                        │
│   ├─ contract_address (immutable)                          │
│   ├─ escrow_amount                                         │
│   ├─ buyer_wallet / seller_wallets                         │
│   └─ status: deployed → active → completed                 │
│                                                             │
│ • ContractEvent (Blockchain transaction logs)              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ AI QUALITY INSPECTION ✨ NEW                               │
├─────────────────────────────────────────────────────────────┤
│ • QualityInspection                                         │
│   ├─ farm_product: FarmProduct                             │
│   ├─ image, annotated_image                                │
│   ├─ total_detected, defect_rate, quality_grade           │
│   ├─ severity breakdown (healthy/minor/moderate/severe)    │
│   └─ detailed_results (JSON with full AI output)          │
│                                                             │
│ • DefectDetection (Individual onion analysis)              │
│   ├─ inspection: QualityInspection                         │
│   ├─ defect_class, severity, confidence                    │
│   ├─ diameter_cm, estimated_weight_g                       │
│   ├─ bounding_box coordinates                              │
│   └─ visual_features, defect_metrics (JSON)               │
│                                                             │
│ • InspectionBatch (Batch processing)                       │
│   └─ InspectionBatchItem (links to inspections)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### Complete API Structure:

```
http://localhost:8000/api/

├── farmers/                         # Farmer Module
│   ├── GET/POST /                   # List/Create farmers
│   ├── GET /me/                     # Current farmer profile
│   ├── GET /verified/               # Verified farmers only
│   └── GET /search_by_product/      # Search farmers by product
│
├── buyers/                          # Buyer/Procurement Module
│   ├── GET/POST /                   # List/Create buyers
│   ├── GET /me/                     # Current buyer profile
│   │
│   └── quality/  ✨ NEW             # AI Quality Analysis
│       ├── POST /ai-analysis/       # Full AI inspection
│       ├── POST /quick-check/       # Fast pass/fail
│       ├── POST /batch-analysis/    # Multiple images
│       └── GET  /info/              # System capabilities
│
├── products/                        # Product Aggregation
│   └── pools/
│       ├── GET/POST /               # List/Create pools
│       ├── POST /create_aggregation/ # Create pool (admin)
│       ├── GET /{id}/               # Pool details
│       └── GET /search_by_quantity/ # Search pools
│
├── orders/                          # Order Management
│   ├── POST /create_order/          # Create new order
│   ├── GET /                        # List orders
│   ├── POST /{id}/initiate_payment/ # Lock funds in escrow
│   ├── POST /{id}/mark_shipped/     # Mark as shipped
│   ├── POST /{id}/confirm_delivery/ # Release funds
│   └── POST /{id}/raise_dispute/    # Raise dispute
│
├── smartcontracts/                  # Blockchain Escrow
│   └── contracts/
│       ├── POST /create_escrow/     # Create contract
│       ├── POST /{id}/activate/     # Activate escrow
│       ├── POST /{id}/release_funds/ # Release payment
│       ├── POST /{id}/file_dispute/ # File dispute
│       └── GET  /{id}/status/       # Contract status
│
└── quality/  ✨ NEW                 # Full Quality Module
    └── inspections/
        ├── GET/POST /               # List/Create inspections
        ├── POST /run_inspection/    # Run AI inspection
        ├── GET /{id}/               # Inspection details
        ├── GET /{id}/download_report/ # Download CSV
        ├── GET /{id}/download_annotated_image/
        └── GET /statistics/         # Overall stats
```

---

## 🚀 Complete Workflow Example

### Scenario: Factory Orders 10 Tonnes of Onions

```
STEP 1: BUYER QUALITY CHECK (Pre-Order) ✨ NEW
─────────────────────────────────────────────────────
Procurement Officer uploads sample image
↓
POST /api/buyers/quality/ai-analysis/
↓
AI analyzes image:
- Total onions: 15
- Defect rate: 12%
- Quality grade: B
- Recommendation: ACCEPT with 6% price discount
↓
Decision: Proceed with order


STEP 2: AGGREGATION (Platform Backend)
─────────────────────────────────────────────────────
Platform finds eligible farmers:
- 10 farmers with verified onion products
- Combined capacity: 12 tonnes/week
↓
POST /api/products/pools/create_aggregation/
↓
Creates AggregatedProductPool:
- Product: "Premium Red Onions"
- Total capacity: 12,000 kg
- Price: ₹45/kg
- Farmers: 10 participants


STEP 3: ORDER CREATION (Buyer)
─────────────────────────────────────────────────────
POST /api/orders/create_order/
Body: {
  "product_pool_id": 123,
  "quantity_kg": 10000,
  "shipping_address": "Factory XYZ"
}
↓
Order created:
- ID: 456
- Amount: ₹450,000 + 2% fee = ₹459,000
- Status: PENDING


STEP 4: SMART CONTRACT DEPLOYMENT (Platform)
─────────────────────────────────────────────────────
POST /api/smartcontracts/contracts/create_escrow/
↓
Blockchain contract deployed:
- Contract address: 0xabcd...
- Escrow amount: ₹459,000
- Buyer wallet: 0x123...
- Seller wallets: [0xfarmer1..., 0xfarmer2..., ...]
- Status: DEPLOYED


STEP 5: PAYMENT LOCKING (Buyer)
─────────────────────────────────────────────────────
POST /api/orders/456/initiate_payment/
↓
Buyer transfers ₹459,000 to contract
↓
Smart contract locks funds
↓
Order status: ESCROW_LOCKED
Contract status: ACTIVE


STEP 6: FULFILLMENT & QUALITY CHECK (Farmers + AI)
─────────────────────────────────────────────────────
Each farmer ships their portion:
- Farmer 1: 1000 kg
- Farmer 2: 1200 kg
- ... (10 farmers total)
↓
At consolidation center:
↓
POST /api/quality/inspections/run_inspection/
Body: {
  "farm_product_id": each_product,
  "image": shipment_photo
}
↓
AI inspects each batch:
- Quality grades: A, B, A, B, C, A, B, A, B, A
- Average defect rate: 8.5%
- Overall quality: ACCEPTABLE
↓
POST /api/orders/456/mark_shipped/
Status: SHIPPED


STEP 7: DELIVERY & RELEASE (Buyer)
─────────────────────────────────────────────────────
Factory receives 10 tonnes of onions
↓
Buyer confirms:
POST /api/orders/456/confirm_delivery/
↓
Smart contract executes:
- Farmer 1: ₹45,000 → wallet
- Farmer 2: ₹54,000 → wallet
- ... (proportional distribution)
- Platform: ₹9,000 fee → wallet
↓
Order status: COMPLETED
Contract status: COMPLETED
All participants rated and reviewed


STEP 8: QUALITY RECORDS (Archive)
─────────────────────────────────────────────────────
GET /api/quality/inspections/
↓
Historical data available:
- All inspections with grades
- Farmer quality trends
- Buyer acceptance rates
- Price vs quality correlation
```

---

## 💡 Key Features Summary

### 1. **Farmer Management**
- Profile with capacity, certifications
- Product listings
- Performance metrics
- Blockchain wallet integration

### 2. **Buyer/Procurement Portal**
- Company profiles
- Product search & filtering
- AI Quality Analysis ✨
- Order management

### 3. **Product Aggregation**
- Automatic farmer matching
- Capacity calculations
- Pool management
- Transparent pricing

### 4. **Smart Contract Escrow**
- AWS Managed Blockchain
- Automatic fund locking
- Multi-farmer settlement
- Dispute resolution

### 5. **AI Quality Inspection** ✨ NEW
- YOLO-based defect detection
- 7+ defect classes
- Size & weight estimation
- Automated grading (A-F)
- Batch processing
- Severity classification (0-3)

---

## 🛠️ Technology Stack

### Backend (farmlink/)
- **Framework**: Django 4.2+
- **API**: Django REST Framework
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Authentication**: Token-based
- **Blockchain**: AWS Managed Blockchain integration

### AI System (onioncheck/)
- **Detection**: YOLO (via Roboflow API)
- **Computer Vision**: OpenCV
- **Processing**: NumPy, Pandas
- **Dashboard**: Streamlit
- **API**: Flask (standalone)

### Frontend
- **UI folder**: React/Vue components (if exists)
- **Templates**: Django templates (if exists)

---

## 📁 Important Files

### Configuration Files:
```
farmlink/
├── settings.py              # Django settings
├── .env                     # Environment variables
├── requirements.txt         # Python dependencies
└── manage.py                # Django CLI

onioncheck/
├── .env                     # Roboflow API key
├── requirements.txt         # AI dependencies
└── defect_detection.py      # Core AI module
```

### Documentation Files:
```
farmlink/
├── README.md                # Project overview
├── ARCHITECTURE.md          # System architecture
├── API_DOCUMENTATION.md     # API reference
├── PROCUREMENT_AI_QUICK_START.md  ✨ NEW
└── BASIC_WORKFLOW.md        # Workflow guide

onioncheck/
├── README_DEFECT_DETECTION.md    # User guide
├── DEFECT_DETECTION_GUIDE.md     # Integration guide
├── SYSTEM_OVERVIEW.md            # Architecture
└── GET_STARTED.md                # Quick start
```

---

## 🎯 Current Integration Status

### ✅ COMPLETED:
1. **Quality Inspection Module** created in Django
   - Models: QualityInspection, DefectDetection, InspectionBatch
   - Views: Full CRUD with AI integration
   - Serializers: Complete API serialization
   - Admin: Professional admin interface
   - URLs: /api/quality/* endpoints

2. **Buyer Quality Analysis** integrated
   - `/api/buyers/quality/ai-analysis/` - Full report
   - `/api/buyers/quality/quick-check/` - Fast decision
   - `/api/buyers/quality/batch-analysis/` - Multiple images
   - `/api/buyers/quality/info/` - System info

3. **AI Detection Module** ready
   - defect_detection.py - Main engine
   - defect_detection_app.py - Streamlit dashboard
   - defect_api.py - Standalone Flask API
   - Comprehensive documentation

### 📋 TODO (Optional Enhancements):
- [ ] Frontend integration (React/Vue components)
- [ ] Email notifications for quality alerts
- [ ] Real-time dashboard for quality trends
- [ ] Mobile app integration
- [ ] Advanced analytics & reporting
- [ ] Multi-language support

---

## 🚀 How to Run

### 1. Start Django Backend:
```bash
cd "C:\Users\darak\Desktop\onion zip\farmlink"
python manage.py runserver
# Access: http://localhost:8000
```

### 2. Start AI Dashboard (Optional):
```bash
cd "C:\Users\darak\Desktop\onion zip\onioncheck"
streamlit run defect_detection_app.py --server.port 8502
# Access: http://localhost:8502
```

### 3. Start AI API (Optional):
```bash
cd "C:\Users\darak\Desktop\onion zip\onioncheck"
python defect_api.py
# Access: http://localhost:5000
```

---

## 📞 Quick Reference

### Django Admin:
- URL: http://localhost:8000/admin/
- Manage: Users, Farmers, Buyers, Orders, Quality Inspections

### API Root:
- URL: http://localhost:8000/api/
- Browse all available endpoints

### Test AI Quality:
```bash
curl -X POST http://localhost:8000/api/buyers/quality/quick-check/ \
  -F "image=@test_onion.jpg"
```

---

**Project Status**: ✅ Fully Integrated & Ready to Use

**Version**: 2.0 (with AI Quality Integration)

**Last Updated**: September 3, 2026
