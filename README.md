# 🧅 OnionSure - AI-Powered Onion Quality Assessment System

**AI + IoT + Computer Vision Quality Assessment Platform**

A comprehensive Smart India Hackathon 2026 solution for transparent onion procurement using multimodal AI fusion (Vision + Gas + Environment) to detect both visible defects and early-stage internal spoilage.

---

## 🌟 Features

### Core Capabilities
- 🔍 **Real-time AI Vision Detection** - Roboflow YOLO-based defect detection with colored bounding boxes
- 🌡️ **IoT Gas Sensing** - ESP32 sensor pod for ethane/methane monitoring
- 🔬 **Multimodal Fusion** - Confidence-weighted fusion of Vision + Gas + Environment
- 🎯 **Early Spoilage Detection** - Detects hidden internal rot invisible to cameras
- 📜 **Digital Certificates** - QR-verifiable quality certificates with blockchain-ready design
- 📊 **Real-time Dashboards** - Beautiful React dashboards for all stakeholders

### Technology Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Framer Motion, Recharts
- **Backend:** Node.js, Express, JWT auth, JSON store (PostgreSQL-ready)
- **AI/Vision:** Python, OpenCV, Roboflow YOLO
- **IoT:** ESP32 simulation + real sensor integration
- **Database:** JSON file store (schema.sql provided for PostgreSQL)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/samarthdarak24-cpu/onion-spoilage.git
cd onion-spoilage
```

2. **Install Backend Dependencies**
```bash
cd onionsure/server
npm install
```

3. **Install Frontend Dependencies**
```bash
cd ../web
npm install
```

4. **Install Python Dependencies**
```bash
cd ../python
pip install opencv-python inference-sdk python-dotenv
```

5. **Set up Roboflow API Key**
```bash
cd ../../onioncheck
echo "ROBOFLOW_API_KEY=your_key_here" > .env
```

Get your API key from: https://roboflow.com/

### Running the Application

1. **Start Backend Server**
```bash
cd onionsure/server
PORT=4001 USE_PYTHON=true npm start
```
Backend runs on: `http://localhost:4001`

2. **Start Frontend (in new terminal)**
```bash
cd onionsure/web
npm run dev
```
Frontend runs on: `http://localhost:3000`

3. **Access the Application**
```
http://localhost:3000/
```

### Demo Login Credentials

| Role | Username | Password |
|------|----------|----------|
| Procurement Officer | `officer1` | `password123` |
| FPO Representative | `fpo1` | `password123` |
| Farmer | `farmer1` | `password123` |
| Buyer | `buyer1` | `password123` |
| Admin | `admin` | `password123` |

---

## 📖 Documentation

### Project Structure

```
onion-spoilage/
├── onioncheck/                    # Roboflow YOLO AI Module
│   ├── defect_detection.py       # Core detection with bounding boxes
│   ├── models/                   # YOLO model weights
│   └── .env                      # API keys
│
├── onionsure/                     # Main Application
│   ├── server/                   # Node.js Backend (Port 4001)
│   │   ├── api.js                # 34 REST API endpoints
│   │   ├── auth.js               # JWT authentication
│   │   ├── ai.js                 # AI processing logic
│   │   └── db.js                 # Database layer
│   │
│   ├── web/                      # React Frontend (Port 3000)
│   │   └── src/
│   │       ├── pages/            # Screen components
│   │       ├── components/       # Reusable UI components
│   │       └── lib/              # API client
│   │
│   ├── python/                   # Python AI Services
│   │   ├── vision_service.py    # Vision analysis
│   │   ├── gas_quality_detector.py
│   │   └── fusion_service.py
│   │
│   └── database/                 # PostgreSQL schema
│       └── schema.sql
│
├── FRONTEND_BACKEND_CONTRACT.md  # Complete API documentation
└── README.md                     # This file
```

### API Documentation

See [FRONTEND_BACKEND_CONTRACT.md](./FRONTEND_BACKEND_CONTRACT.md) for complete API documentation including:
- 34 REST endpoints
- Authentication & authorization
- Request/response formats
- Error handling
- WebSocket events
- Data models

---

## 🎯 Key Features Explained

### 1. Multimodal AI Fusion

Combines three data sources for accurate quality assessment:

```
Vision (45%) + Gas (35%) + Environment (20%) → Final Score
```

**Early Spoilage Detection:**
- If vision shows healthy (≥78%) BUT gas shows high risk → Alert! 🚨
- Catches internal rot that cameras can't see

### 2. Defect Detection

**Classes Detected:**
- ✅ Healthy (Green boxes)
- 🟡 Minor: Staining (Yellow boxes)
- 🟠 Moderate: Sprouted, Double Split (Orange boxes)
- 🔴 Severe: Black Smut, Rotten, Spoiled (Red boxes)

**Bounding Boxes:**
- Bright colors for visibility
- Confidence scores
- Size estimation (diameter, weight)
- Severity levels (0-3)

### 3. Quality Grading

| Grade | Score Range | Description |
|-------|-------------|-------------|
| **GRADE A** | ≥ 85 | Premium quality |
| **URS** | 65-84 | Uniform regulated standard |
| **REJECTED** | < 65 | Below standards |

### 4. Digital Certificates

- Unique certificate numbers
- QR code generation
- Public verification (no auth required)
- GPS location tagging
- Immutable record

---

## 🖥️ User Interfaces

### Procurement Officer Dashboard
- AI Vision Detection with image upload
- Live IoT sensor monitoring
- Fusion intelligence calculator
- Certificate generation
- Inspection history
- Quality analytics

### Farmer Portal
- View inspection results
- Download certificates
- Track lot status

### FPO Dashboard
- Monitor all member farmers
- Quality trends
- Procurement center stats

### Admin Panel
- System configuration
- Fusion weight tuning
- User management

---

## 🔧 Configuration

### Backend Configuration

Edit `onionsure/server/config.js`:

```javascript
{
  port: 4001,
  jwtSecret: 'your-secret',
  jwtExpiresIn: '12h',
  usePython: true,
  fusion: {
    weights: {
      vision: 0.45,
      gas: 0.35,
      environment: 0.20
    }
  },
  grading: {
    gradeA: 85,
    urs: 65
  }
}
```

### Environment Variables

```bash
# Backend
PORT=4001
JWT_SECRET=your-secret-key
USE_PYTHON=true
PYTHON_BIN=python3
ONIONCHECK_URL=http://localhost:5000

# Frontend (in web/.env)
VITE_API_URL=http://localhost:4001
```

---

## 🧪 Testing

### Run Demo Mode

```bash
# In browser after login
POST http://localhost:4001/api/demo/run
{
  "scenario": "standard"
}
```

Or click **"Run Demo Scan"** in AI Analysis page.

### Test Image Upload

```bash
curl -X POST http://localhost:4001/api/vision/analyze \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@path/to/onion.jpg"
```

---

## 📊 API Endpoints Summary

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register user (admin only)

### Lots Management
- `GET /api/lots` - List lots
- `POST /api/lots` - Create lot
- `GET /api/lots/:id` - Get lot details

### Inspection Workflow
- `POST /api/inspection/start` - Start inspection
- `POST /api/inspection/:id/analyze` - Run AI analysis
- `GET /api/inspection/:id` - Get full results

### AI Analysis
- `POST /api/vision/analyze` - Image upload + detection
- `POST /api/iot/readings` - Sensor data
- `POST /api/fusion/calculate` - Manual fusion

### Certificates
- `POST /api/certificates/generate` - Generate certificate
- `GET /api/certificates` - List certificates
- `GET /api/verify/:id` - Public verification (no auth)

### Analytics
- `GET /api/analytics/dashboard` - Dashboard stats
- `GET /api/analytics/quality` - Quality trends
- `GET /api/analytics/defects` - Defect distribution

**Total:** 34 endpoints

See [FRONTEND_BACKEND_CONTRACT.md](./FRONTEND_BACKEND_CONTRACT.md) for complete details.

---

## 🎨 Screenshots

### Procurement Officer Dashboard
![Dashboard](docs/screenshots/dashboard.png)

### AI Vision Detection
![AI Analysis](docs/screenshots/ai-analysis.png)

### Quality Certificate
![Certificate](docs/screenshots/certificate.png)

---

## 🚧 Known Issues

1. **OnionCheck Service Dependency** - External Flask service expected at `localhost:5000`. Falls back to DEMO mode if unavailable.
2. **Image Storage** - Images not persisted (metadata only). Binary storage needs implementation.
3. **Pagination** - Not implemented for large datasets.

See [FRONTEND_BACKEND_CONTRACT.md](./FRONTEND_BACKEND_CONTRACT.md) section "Backend Contract Issues" for complete list.

---

## 🔐 Security

- JWT-based authentication
- Role-based access control (RBAC)
- bcrypt password hashing
- CORS configured
- Input validation
- SQL injection protection (prepared statements)

**Production Checklist:**
- [ ] Change JWT secret
- [ ] Enable HTTPS
- [ ] Set secure cookie flags
- [ ] Add rate limiting
- [ ] Enable audit logging
- [ ] Configure CORS whitelist

---

## 📈 Performance

### Current Metrics
- API response time: < 100ms (without AI)
- Vision analysis: ~2-3 seconds
- Fusion calculation: < 50ms
- Certificate generation: < 100ms

### Optimization Tips
- Enable PostgreSQL for production
- Add Redis for caching
- Implement pagination
- Use CDN for static assets
- Add image compression

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📝 License

This project was developed for Smart India Hackathon 2026.

---

## 👥 Team

- **Samarth Darak** - Project Lead & AI Integration
- [Add team members]

---

## 🙏 Acknowledgments

- Roboflow for YOLO model infrastructure
- Smart India Hackathon 2026
- Open source community

---

## 📞 Support

- **Issues:** https://github.com/samarthdarak24-cpu/onion-spoilage/issues
- **Documentation:** See [FRONTEND_BACKEND_CONTRACT.md](./FRONTEND_BACKEND_CONTRACT.md)
- **Email:** [Your email]

---

## 🗺️ Roadmap

### Phase 1 (Current)
- [x] Core AI vision detection
- [x] IoT sensor simulation
- [x] Multimodal fusion
- [x] Certificate generation
- [x] Web dashboard

### Phase 2 (Planned)
- [ ] Real ESP32 hardware integration
- [ ] Mobile app (React Native)
- [ ] Blockchain integration
- [ ] Batch processing
- [ ] Advanced analytics

### Phase 3 (Future)
- [ ] Multi-crop support
- [ ] ML model retraining pipeline
- [ ] API marketplace
- [ ] International expansion

---

**Built with ❤️ for Smart India Hackathon 2026**

🧅 **OnionSure** - Making onion procurement transparent, one scan at a time.
