"""
Defect Detection Dashboard - Streamlit Application
===================================================

Professional dashboard for YOLO-based defect detection with:
- Real-time defect classification
- Size estimation and weight approximation
- Severity analysis and grading
- Batch processing capabilities
- Export functionality (CSV, JSON, PDF reports)

"""

import os
import json
import tempfile
from pathlib import Path
from datetime import datetime

import pandas as pd
import streamlit as st
from PIL import Image
import cv2
import numpy as np

from defect_detection import (
    detect_defects_with_sizing,
    calibrate_size_detection,
    DEFECT_CLASSES,
    SIZE_CATEGORIES
)


# ==========================================================================
# PAGE CONFIGURATION
# ==========================================================================

st.set_page_config(
    page_title="Onion Defect Detection System",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded"
)


# ==========================================================================
# CUSTOM CSS
# ==========================================================================

st.markdown("""
<style>
    .main {
        background-color: #0e1117;
    }
    
    .title-text {
        font-size: 48px;
        font-weight: bold;
        text-align: center;
        margin-bottom: 10px;
        background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
    
    .subtitle-text {
        font-size: 20px;
        text-align: center;
        color: #9ca3af;
        margin-bottom: 30px;
    }
    
    .metric-card {
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        background: linear-gradient(135deg, #1c2330 0%, #2d3748 100%);
        border: 1px solid #4a5568;
    }
    
    .severity-badge {
        padding: 5px 10px;
        border-radius: 5px;
        font-weight: bold;
        font-size: 14px;
    }
    
    .severity-0 { background-color: #10b981; color: white; }
    .severity-1 { background-color: #f59e0b; color: white; }
    .severity-2 { background-color: #f97316; color: white; }
    .severity-3 { background-color: #ef4444; color: white; }
</style>
""", unsafe_allow_html=True)


# ==========================================================================
# SESSION STATE
# ==========================================================================

if 'calibration_factor' not in st.session_state:
    st.session_state.calibration_factor = 20.0  # Default pixels/cm

if 'detection_results' not in st.session_state:
    st.session_state.detection_results = None


# ==========================================================================
# SIDEBAR - CONFIGURATION
# ==========================================================================

with st.sidebar:
    st.title("⚙️ Configuration")
    
    st.markdown("### Detection Settings")
    
    confidence_threshold = st.slider(
        "Confidence Threshold",
        min_value=0.1,
        max_value=1.0,
        value=0.4,
        step=0.05,
        help="Minimum confidence score for detection"
    )
    
    st.markdown("### Size Calibration")
    
    pixels_per_cm = st.number_input(
        "Pixels per CM",
        min_value=1.0,
        max_value=100.0,
        value=st.session_state.calibration_factor,
        step=0.5,
        help="Calibration factor for size estimation"
    )
    
    st.session_state.calibration_factor = pixels_per_cm
    
    with st.expander("📏 Calibration Tool"):
        st.markdown("""
        **How to calibrate:**
        1. Upload an image with a known onion size
        2. Enter the actual diameter
        3. Click 'Calibrate' to calculate pixels/cm
        """)
        
        calibration_file = st.file_uploader(
            "Upload Calibration Image",
            type=["jpg", "jpeg", "png"],
            key="calibration"
        )
        
        known_diameter = st.number_input(
            "Known Diameter (cm)",
            min_value=1.0,
            max_value=20.0,
            value=7.0,
            step=0.1
        )
        
        if st.button("🎯 Calibrate") and calibration_file:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                tmp.write(calibration_file.getbuffer())
                tmp_path = tmp.name
            
            try:
                with st.spinner("Calibrating..."):
                    new_factor = calibrate_size_detection(tmp_path, known_diameter)
                    st.session_state.calibration_factor = new_factor
                    st.success(f"✅ Calibrated! New factor: {new_factor:.2f} px/cm")
                    st.rerun()
            except Exception as e:
                st.error(f"Calibration failed: {e}")
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
    
    st.markdown("---")
    
    st.markdown("### Defect Categories")
    
    st.markdown("**Severity Levels:**")
    st.markdown("🟢 **0** - Healthy")
    st.markdown("🟡 **1** - Minor (Cosmetic)")
    st.markdown("🟠 **2** - Moderate")
    st.markdown("🔴 **3** - Severe")
    
    st.markdown("---")
    
    st.markdown("### Export Options")
    
    export_format = st.selectbox(
        "Report Format",
        ["CSV", "JSON", "Both"],
        index=0
    )
    
    st.markdown("---")
    
    st.caption("🔍 AI-Powered Defect Detection v2.0")


# ==========================================================================
# MAIN HEADER
# ==========================================================================

st.markdown(
    '<div class="title-text">🔍 Onion Defect Detection System</div>',
    unsafe_allow_html=True
)

st.markdown(
    '<div class="subtitle-text">'
    'YOLO-Based Detection with Size Estimation & Severity Classification'
    '</div>',
    unsafe_allow_html=True
)


# ==========================================================================
# TABS
# ==========================================================================

tab1, tab2, tab3 = st.tabs(["📸 Single Image Analysis", "📁 Batch Processing", "📊 Analytics"])


# ==========================================================================
# TAB 1: SINGLE IMAGE ANALYSIS
# ==========================================================================

with tab1:
    
    uploaded_file = st.file_uploader(
        "📤 Upload Onion Image for Defect Detection",
        type=["jpg", "jpeg", "png", "webp"],
        key="single_image"
    )
    
    if uploaded_file is not None:
        
        # Save temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
            tmp.write(uploaded_file.getbuffer())
            temp_path = tmp.name
        
        # Display original image
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("📷 Original Image")
            original_img = Image.open(uploaded_file)
            st.image(original_img, use_container_width=True)
        
        with col2:
            st.subheader("🔍 Detection Result")
            st.info("Click 'Analyze' to detect defects")
        
        # Analyze button
        if st.button("🔍 Analyze Defects", type="primary", use_container_width=True):
            
            try:
                with st.spinner("Running AI defect detection..."):
                    results = detect_defects_with_sizing(
                        temp_path,
                        pixels_per_cm=pixels_per_cm,
                        confidence_threshold=confidence_threshold
                    )
                    st.session_state.detection_results = results
                
                st.success("✅ Analysis complete!")
                
                # Display annotated image
                with col2:
                    annotated_img = cv2.cvtColor(
                        results["annotated_image"],
                        cv2.COLOR_BGR2RGB
                    )
                    st.image(annotated_img, use_container_width=True)
                
                st.markdown("---")
                
                # Summary metrics
                st.subheader("📊 Detection Summary")
                
                stats = results["statistics"]
                severity_summary = results["severity_summary"]
                
                metric_cols = st.columns(5)
                
                with metric_cols[0]:
                    st.metric("🧅 Total Detected", results["total_detected"])
                
                with metric_cols[1]:
                    st.metric("🟢 Healthy", severity_summary["healthy"])
                
                with metric_cols[2]:
                    st.metric("🔴 Defective", stats["defective_count"])
                
                with metric_cols[3]:
                    st.metric("📉 Defect Rate", f"{stats['defect_rate']}%")
                
                with metric_cols[4]:
                    st.metric("⚖️ Total Weight", f"~{stats['total_estimated_weight_g']}g")
                
                # Severity breakdown
                st.markdown("### 📈 Severity Distribution")
                
                sev_cols = st.columns(4)
                
                with sev_cols[0]:
                    st.metric("🟢 Healthy (0)", severity_summary["healthy"])
                
                with sev_cols[1]:
                    st.metric("🟡 Minor (1)", severity_summary["minor"])
                
                with sev_cols[2]:
                    st.metric("🟠 Moderate (2)", severity_summary["moderate"])
                
                with sev_cols[3]:
                    st.metric("🔴 Severe (3)", severity_summary["severe"])
                
                st.markdown("---")
                
                # Detailed results table
                st.subheader("📋 Detailed Detection Results")
                
                if results["detections"]:
                    
                    table_data = []
                    
                    for det in results["detections"]:
                        table_data.append({
                            "ID": det["id"],
                            "Class": det["class"],
                            "Category": det["category"],
                            "Severity": det["severity"],
                            "Confidence": f"{det['confidence']:.3f}",
                            "Diameter (cm)": det["size_estimation"]["diameter_cm"],
                            "Weight (g)": det["size_estimation"]["estimated_weight_g"],
                            "Size Category": det["size_estimation"]["size_category"],
                            "Circularity": det["visual_features"].get("circularity", "N/A"),
                            "Description": det["description"]
                        })
                    
                    df = pd.DataFrame(table_data)
                    
                    st.dataframe(
                        df,
                        use_container_width=True,
                        hide_index=True
                    )
                    
                    # Export buttons
                    st.markdown("### 📥 Export Results")
                    
                    export_cols = st.columns(3)
                    
                    # CSV Export
                    with export_cols[0]:
                        csv_data = df.to_csv(index=False).encode('utf-8')
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        st.download_button(
                            label="⬇️ Download CSV",
                            data=csv_data,
                            file_name=f"defect_report_{timestamp}.csv",
                            mime="text/csv"
                        )
                    
                    # JSON Export
                    with export_cols[1]:
                        json_data = json.dumps(results["detections"], indent=2)
                        st.download_button(
                            label="⬇️ Download JSON",
                            data=json_data,
                            file_name=f"defect_report_{timestamp}.json",
                            mime="application/json"
                        )
                    
                    # Annotated Image Export
                    with export_cols[2]:
                        _, buffer = cv2.imencode('.jpg', results["annotated_image"])
                        st.download_button(
                            label="⬇️ Download Image",
                            data=buffer.tobytes(),
                            file_name=f"annotated_{timestamp}.jpg",
                            mime="image/jpeg"
                        )
                
                else:
                    st.warning("No detections found in this image.")
                
            except Exception as e:
                st.error(f"❌ Analysis failed: {e}")
                st.exception(e)
            
            finally:
                if os.path.exists(temp_path):
                    os.remove(temp_path)


# ==========================================================================
# TAB 2: BATCH PROCESSING
# ==========================================================================

with tab2:
    
    st.subheader("📁 Batch Image Processing")
    
    uploaded_files = st.file_uploader(
        "Upload Multiple Images",
        type=["jpg", "jpeg", "png", "webp"],
        accept_multiple_files=True,
        key="batch_images"
    )
    
    if uploaded_files:
        
        st.info(f"📊 {len(uploaded_files)} images uploaded")
        
        if st.button("🔍 Process Batch", type="primary"):
            
            batch_results = []
            progress_bar = st.progress(0)
            status_text = st.empty()
            
            for idx, file in enumerate(uploaded_files):
                
                status_text.text(f"Processing {idx+1}/{len(uploaded_files)}: {file.name}")
                
                try:
                    # Save temp file
                    with tempfile.NamedTemporaryFile(delete=False, suffix='.jpg') as tmp:
                        tmp.write(file.getbuffer())
                        temp_path = tmp.name
                    
                    # Analyze
                    result = detect_defects_with_sizing(
                        temp_path,
                        pixels_per_cm=pixels_per_cm,
                        confidence_threshold=confidence_threshold
                    )
                    
                    batch_results.append({
                        "filename": file.name,
                        "result": result
                    })
                    
                except Exception as e:
                    st.error(f"Failed to process {file.name}: {e}")
                
                finally:
                    if os.path.exists(temp_path):
                        os.remove(temp_path)
                
                progress_bar.progress((idx + 1) / len(uploaded_files))
            
            status_text.text("✅ Batch processing complete!")
            
            # Aggregate statistics
            st.markdown("---")
            st.subheader("📊 Batch Summary")
            
            total_onions = sum(r["result"]["total_detected"] for r in batch_results)
            total_healthy = sum(r["result"]["severity_summary"]["healthy"] for r in batch_results)
            total_defective = total_onions - total_healthy
            
            avg_defect_rate = np.mean([
                r["result"]["statistics"]["defect_rate"] for r in batch_results
            ])
            
            summary_cols = st.columns(4)
            
            with summary_cols[0]:
                st.metric("📁 Images Processed", len(batch_results))
            
            with summary_cols[1]:
                st.metric("🧅 Total Onions", total_onions)
            
            with summary_cols[2]:
                st.metric("🟢 Healthy", total_healthy)
            
            with summary_cols[3]:
                st.metric("📉 Avg Defect Rate", f"{avg_defect_rate:.2f}%")
            
            # Detailed batch table
            st.markdown("### 📋 Per-Image Results")
            
            batch_table = []
            
            for item in batch_results:
                batch_table.append({
                    "Filename": item["filename"],
                    "Total Detected": item["result"]["total_detected"],
                    "Healthy": item["result"]["severity_summary"]["healthy"],
                    "Defective": item["result"]["statistics"]["defective_count"],
                    "Defect Rate (%)": item["result"]["statistics"]["defect_rate"],
                    "Avg Size (cm)": item["result"]["statistics"]["average_size_cm"],
                    "Total Weight (g)": item["result"]["statistics"]["total_estimated_weight_g"]
                })
            
            batch_df = pd.DataFrame(batch_table)
            st.dataframe(batch_df, use_container_width=True, hide_index=True)
            
            # Export batch results
            csv_batch = batch_df.to_csv(index=False).encode('utf-8')
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            st.download_button(
                label="⬇️ Download Batch Report (CSV)",
                data=csv_batch,
                file_name=f"batch_report_{timestamp}.csv",
                mime="text/csv"
            )


# ==========================================================================
# TAB 3: ANALYTICS
# ==========================================================================

with tab3:
    
    st.subheader("📊 System Analytics & Information")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 🏷️ Defect Classes")
        
        defect_info_table = []
        
        for class_name, info in DEFECT_CLASSES.items():
            defect_info_table.append({
                "Class": class_name,
                "Category": info["category"],
                "Severity": info["severity"],
                "Description": info["description"]
            })
        
        defect_df = pd.DataFrame(defect_info_table)
        st.dataframe(defect_df, use_container_width=True, hide_index=True)
    
    with col2:
        st.markdown("### 📏 Size Categories")
        
        size_info_table = []
        
        for category, (min_size, max_size) in SIZE_CATEGORIES.items():
            size_info_table.append({
                "Category": category,
                "Diameter Range (cm)": f"{min_size} - {max_size}"
            })
        
        size_df = pd.DataFrame(size_info_table)
        st.dataframe(size_df, use_container_width=True, hide_index=True)
    
    st.markdown("---")
    
    st.markdown("### 🔧 Current Configuration")
    
    config_cols = st.columns(3)
    
    with config_cols[0]:
        st.metric("Pixels per CM", f"{pixels_per_cm:.2f}")
    
    with config_cols[1]:
        st.metric("Confidence Threshold", f"{confidence_threshold:.2f}")
    
    with config_cols[2]:
        st.metric("Detection Model", "Roboflow YOLO")
    
    st.markdown("---")
    
    st.markdown("### 📖 About This System")
    
    st.markdown("""
    **Features:**
    - ✅ Real-time YOLO-based defect detection
    - ✅ Multi-class defect classification
    - ✅ Automated size estimation
    - ✅ Weight approximation
    - ✅ Severity-based grading
    - ✅ Batch processing capabilities
    - ✅ Comprehensive reporting (CSV, JSON)
    - ✅ Calibration tools for accurate sizing
    
    **Technology Stack:**
    - Computer Vision: OpenCV
    - AI Detection: Roboflow API (YOLO)
    - Web Interface: Streamlit
    - Data Processing: NumPy, Pandas
    
    **Use Cases:**
    - Quality control in agricultural supply chains
    - Automated grading for farmers
    - Pre-shipment quality verification
    - Market price optimization based on quality
    """)


# ==========================================================================
# FOOTER
# ==========================================================================

st.markdown("---")

st.caption(
    "🔍 Onion Defect Detection System v2.0 | "
    "AI-Powered Quality Assessment with Size Estimation"
)
