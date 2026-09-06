# OnionSure End-to-End Testing Guide

## Test Environment
- **Backend**: http://localhost:4000
- **Frontend**: http://localhost:3000
- **Test User**: officer1 / password123

---

## Test Scenario 1: Complete New Farmer Registration → Lot Creation → Full Assessment → Certificate

### Step 1: Login as Officer
1. Navigate to http://localhost:3000/login
2. Username: `officer1`
3. Password: `password123`
4. Click "Sign In"
5. ✅ **Expected**: Redirect to `/quality/dashboard`

### Step 2: Navigate to New Inspection
1. Click "Quality Assessment" in sidebar
2. Or navigate directly to http://localhost:3000/quality/new-inspection
3. ✅ **Expected**: See "Register a lot and start a standardized quality assessment" page

### Step 3: Register New Farmer (if needed)
1. Click on "Select or Register Farmer" dropdown
2. Type a search term that doesn't exist (e.g., "TestFarmer")
3. Click "Register New Farmer" button
4. Fill the registration form:
   - **Full Name**: TestFarmer Kumar
   - **Mobile**: 9876543210
   - **Village**: TestVillage
   - **Farm Name** (optional): Test Farm
5. Click "Register Farmer"
6. ✅ **Expected**: 
   - Modal closes
   - Farmer auto-selected
   - Farmer ID generated (FRM-XXXXXX format)
   - Farmer card displays with all details

### Step 4: Search Existing Farmer (Alternative)
1. Click on "Select or Register Farmer" dropdown
2. Type: "Ramesh" (one of the seed farmers)
3. ✅ **Expected**: See "Ramesh Patil" in dropdown with:
   - Farmer ID: FRM-000001
   - Mobile: 9876543210
   - Village: Nashik Rural
   - Farm: Patil Farms
4. Click to select
5. ✅ **Expected**: Farmer card displays below with full details

### Step 5: Fill Lot Details
1. **Farmer**: (Already selected from Step 3 or 4)
2. **FPO** (Optional): Select "Maharashtra Onion Growers FPO"
3. **Crop**: Onion
4. **Variety**: Nashik Red
5. **Quantity (KG)**: 1500
6. **Procurement Center**: Select "Nashik Primary Center"
7. **Origin/Village**: TestVillage or farmer's village
8. **Central Lot ID** (Optional): Leave blank for auto-generation OR enter: ON-2026-12345
9. **Date**: Today's date (auto-filled)
10. Click "Start Quality Assessment"

### Step 6: Verify Lot Creation & Redirect
1. ✅ **Expected**: 
   - Success message
   - Redirect to `/quality/assessment/:inspectionId`
   - Breadcrumb shows: Quality → Assessment → LOT-ID
   - Progress stepper shows 6 steps
   - Currently on Step 1: "Lot Details"

### Step 7: Review Lot Details (Step 1)
1. ✅ **Expected**: See read-only lot information:
   - Central Lot ID (ON-YYYY-XXXXX format)
   - Farmer details with FRM-XXXXXX
   - Crop, Variety, Quantity
   - Center name
   - FPO (if selected)
2. Click "Next: Connect IoT Pod →"

### Step 8: Connect IoT Pod (Step 2)
1. ✅ **Expected**: 
   - Step 2 active
   - Breadcrumb updates: Quality → Assessment → LOT-ID → Connect IoT Pod
   - See "Scan QR code on the IoT Pod"
2. Enter Pod ID: `POD-1` or `POD-2`
3. Click "Connect Pod"
4. ✅ **Expected**: 
   - Success message
   - Pod details display
   - Real-time sensor readings start appearing:
     * Temperature (°C)
     * Humidity (%)
     * CO2 (ppm)
     * Ethylene (ppm)
     * H2S (ppm)
     * NH3 (ppm)
     * VOC (ppb)
     * O2 (%)
   - Charts update in real-time
5. Click "Next: Stabilize Environment →"

### Step 9: Stabilize Environment (Step 3)
1. ✅ **Expected**:
   - Step 3 active
   - Breadcrumb: Quality → Assessment → LOT-ID → Stabilize
   - See 60-second countdown timer
   - Live temperature chart
2. Wait for 60 seconds OR click "Skip Stabilization" for testing
3. ✅ **Expected**: 
   - Countdown completes
   - "Stabilization Complete" message
   - Green checkmark appears
4. Click "Next: Capture Images →"

### Step 10: Capture Sample Images (Step 4)
1. ✅ **Expected**:
   - Step 4 active
   - Breadcrumb: Quality → Assessment → LOT-ID → Capture
   - See 4 camera angles: Top, Front, Side, Close-up
2. For each angle:
   - Click "Capture" or upload image
   - ✅ **Expected**: Preview appears, timestamp shown
3. After all 4 images captured, click "Next: Run AI Analysis →"

### Step 11: AI Analysis (Step 5)
1. ✅ **Expected**:
   - Step 5 active
   - Breadcrumb: Quality → Assessment → LOT-ID → AI Analysis
   - See "Analyzing..." spinner
2. Click "Run Analysis"
3. ✅ **Expected**: 
   - Analysis runs (demo mode: instant)
   - See three analysis cards:
     * **Vision Analysis**: Defects, Color, Size (Score: X/100)
     * **Gas Analysis**: Ethylene, H2S, VOC levels (Score: Y/100)
     * **Environment**: Temp, Humidity, O2 (Score: Z/100)
4. Click "Next: View Results →"

### Step 12: Fusion Results & Grading (Step 6)
1. ✅ **Expected**:
   - Step 6 active
   - Breadcrumb: Quality → Assessment → LOT-ID → Result
   - See final grade badge (A+/A/B/C/Reject)
   - Final score: XX/100
   - "Why This Grade?" evidence section with:
     * Vision: Defects found, color quality
     * Gas: Ethylene levels, spoilage indicators
     * Environment: Storage conditions
2. Review the grading

### Step 13: Override Grade (Optional)
1. In "Override Assessment" section:
   - Select different grade (e.g., change A to B)
   - Enter reason: "Testing override functionality"
   - Click "Submit Override"
2. ✅ **Expected**:
   - Override recorded
   - Audit trail shows:
     * Original Grade: A (Score: 85)
     * New Grade: B
     * Reason: Testing override functionality
     * Officer: officer1
     * Timestamp

### Step 14: Generate Certificate
1. Click "Generate Quality Certificate"
2. ✅ **Expected**:
   - Certificate generated
   - View certificate page opens
   - Certificate shows:
     * Central Lot ID
     * Farmer name and Farmer ID
     * Grade badge
     * Score
     * QR code for verification
     * Procurement center
     * Officer signature
     * Issue date
3. ✅ **Test QR Code**: Download and scan - should link to verification page

### Step 15: View Certificate in Dashboard
1. Navigate to "Quality Certificates" from sidebar
2. ✅ **Expected**: 
   - See generated certificate in list
   - Filter by farmer, grade, date works
   - Click certificate to view details

---

## Test Scenario 2: Central Lot ID Lookup with Cross-Center Detection

### Setup: Create lot with specific Central Lot ID
1. Go to New Inspection
2. Select farmer "Ramesh Patil"
3. Fill lot details
4. **Central Lot ID**: Enter `ON-2026-00421` (known lot with variation)
5. ✅ **Expected**: 
   - Warning alert: "⚠ This Central Lot ID was previously inspected at another center"
   - Shows previous inspection details
   - Shows variation warning if grades differ

### View Lot Details Page
1. After creating inspection, note the Central Lot ID
2. Navigate to: http://localhost:3000/quality/lots/ON-2026-00421
3. ✅ **Expected**:
   - Lot overview with all details
   - Farmer and Center cards
   - **Inspection Timeline** showing ALL inspections for this lot
   - If variation exists:
     * Yellow alert banner: "⚠ RESULT VARIATION DETECTED ACROSS CENTERS"
     * Variation details explaining differences
   - Statistics sidebar:
     * Total Inspections: 2+
     * Centers Visited: 2+
     * Highest/Lowest scores
4. Click "Start Reassessment"
5. ✅ **Expected**: Start new inspection with mode: REASSESSMENT

---

## Test Scenario 3: Existing Farmer Search

### Test Search by Name
1. Go to New Inspection
2. Type in farmer search: "Ramesh"
3. ✅ **Expected**: See "Ramesh Patil" result

### Test Search by Mobile
1. Clear search
2. Type: "9876"
3. ✅ **Expected**: See farmer with matching mobile

### Test Search by Farmer ID
1. Clear search
2. Type: "FRM-000001"
3. ✅ **Expected**: See "Ramesh Patil" (FRM-000001)

### Test Search by Village
1. Clear search
2. Type: "Nashik"
3. ✅ **Expected**: See farmers from Nashik villages

---

## Test Scenario 4: Verify Workflow State Persistence

### Test Page Refresh During Assessment
1. Start an inspection and reach Step 3 (Stabilize)
2. Refresh the page (F5)
3. ✅ **Expected**:
   - Page reloads
   - Auto-detects current step based on `workflowState`
   - Continues from Step 3
   - No data loss

### Test Navigation Back/Forward
1. During assessment, click "← Back" button
2. ✅ **Expected**: Move to previous step
3. Click "Next →"
4. ✅ **Expected**: Move forward, data preserved

---

## Test Scenario 5: Dashboard Navigation & Workflow

### Test Sidebar Navigation
1. ✅ **Verify sidebar shows**:
   - Dashboard
   - Quality Assessment (unified workflow entry)
   - Quality Certificates
2. ✅ **Verify REMOVED items** (should NOT appear):
   - Live Sensor (standalone)
   - AI Analysis (standalone)
   - Live Camera (standalone)
   - Fusion Intelligence (standalone)
   - Inspection History (standalone)

### Test Dashboard Overview
1. Navigate to Dashboard
2. ✅ **Expected**:
   - Today's inspections count
   - Grade distribution
   - Recent inspections list
   - Quick action: "Start New Inspection"

---

## Backend API Tests (Optional - Developer Testing)

### Test Farmer Search API
```bash
curl http://localhost:4000/farmers/search?q=Ramesh
```
✅ **Expected**: JSON array with matching farmers

### Test Farmer Registration API
```bash
curl -X POST http://localhost:4000/farmers \
  -H "Content-Type: application/json" \
  -d '{"fullName":"Test Farmer","mobile":"9999999999","village":"TestVillage"}'
```
✅ **Expected**: New farmer with auto-generated FRM-XXXXXX

### Test Central Lot Lookup API
```bash
curl http://localhost:4000/lots/lookup/ON-2026-00421
```
✅ **Expected**: Lot details, inspections array, variation detection

### Test Inspection Workflow State API
```bash
curl http://localhost:4000/inspection/{inspectionId}
```
✅ **Expected**: Inspection with `workflowState` field

---

## Known Test Data

### Seed Farmers (Available for Testing)
1. **Ramesh Patil** (FRM-000001)
   - Mobile: 9876543210
   - Village: Nashik Rural
   - Farm: Patil Farms

2. **Sunita Jadhav** (FRM-000002)
   - Mobile: 9876543211
   - Village: Lasalgaon
   - Farm: Jadhav Organics

3. **Arjun Deshmukh** (FRM-000003)
   - Mobile: 9876543212
   - Village: Pimpalgaon
   - Farm: Deshmukh Family Farm

4. **Lakshmi Bhosale** (FRM-000004)
   - Mobile: 9876543213
   - Village: Yeola
   - (No farm name)

### Seed FPOs
- Maharashtra Onion Growers FPO
- Nashik Kisan Producer Co
- Lasalgaon Farmers Union

### Seed Centers
- Nashik Primary Center
- Lasalgaon Regional Hub
- Pimpalgaon Collection Point

### Test Central Lot IDs
- `ON-2026-00421`: Known lot with cross-center variation
- Leave blank for auto-generation: Creates ON-YYYY-XXXXX format

---

## Success Criteria

### ✅ Task #14 Complete When:
1. Officer can login successfully
2. Officer can search OR register new farmer
3. Officer can create new lot with Central Lot ID
4. Officer navigated to unified SmartAssessment page
5. Officer completes all 6 steps:
   - Step 1: Lot Details (read-only review)
   - Step 2: IoT Pod connection with real-time sensors
   - Step 3: 60s stabilization with live chart
   - Step 4: Image capture (4 angles)
   - Step 5: AI Analysis (Vision + Gas + Environment)
   - Step 6: Fusion result with grade, evidence, override, certificate
6. Certificate generated with QR code
7. Certificate appears in dashboard
8. Page refresh maintains workflow progress
9. Back/Forward navigation works correctly
10. Sidebar navigation consolidated (no redundant items)

### ✅ Task #15 Complete When:
1. Central Lot ID lookup works correctly
2. Cross-center variation detection triggers warnings
3. LotDetail page shows all inspections for a lot
4. Reassessment functionality works
5. Farmer connection persists across inspections
6. Statistics calculated correctly (highest/lowest scores, center count)

---

## Troubleshooting

### Issue: Farmer search returns no results
**Solution**: Restart backend to ensure seed data loaded
```bash
cd onionsure/server
npm start
```

### Issue: Images not capturing
**Solution**: Check browser console for errors. In demo mode, mock images should work.

### Issue: Workflow state not persisting
**Solution**: Check backend `/inspection/:id` endpoint returns `workflowState` field

### Issue: Certificate not generating
**Solution**: Ensure all 6 steps completed. Check backend logs for errors.

### Issue: Cross-center detection not working
**Solution**: Use test lot ID `ON-2026-00421` or create same lot at two different centers

---

## Manual Testing Checklist

- [ ] Login as officer1
- [ ] Search existing farmer (Ramesh)
- [ ] Register new farmer
- [ ] Create new lot with auto-generated Central Lot ID
- [ ] Create lot with specific Central Lot ID (ON-2026-99999)
- [ ] Complete all 6 assessment steps
- [ ] Override grade with reason
- [ ] Generate certificate
- [ ] View certificate details
- [ ] Verify certificate in Certificates page
- [ ] Refresh page during assessment (verify state persists)
- [ ] Navigate back/forward during assessment
- [ ] View Lot Detail page for Central Lot ID
- [ ] Test cross-center detection with ON-2026-00421
- [ ] Start reassessment from Lot Detail page
- [ ] Verify sidebar has only 3 items (Dashboard, Quality Assessment, Certificates)
- [ ] Verify no redundant items in sidebar (Live Sensor, AI Analysis, etc.)

---

**Testing Status**: Ready for manual testing  
**Last Updated**: 2026-09-06  
**Tester**: Quality Officer Team  
