#!/usr/bin/env python3
"""
OnionSure — Gas / Environmental Spoilage Classifier (DEMO MODE)

INPUT  (JSON string via argv[1] or stdin):
  {"ethane": 0.42, "methane": 0.18, "temperature": 25.0, "humidity": 63.0}

OUTPUT (JSON to stdout):
  {"mode":"DEMO","stage":"MEDIUM","gasScore":76,"confidence":0.86,
   "flags":{...},"readings":{...}}

This is an RF-STYLE THRESHOLD DEMO. No trained dataset is bundled.
To use a real Random-Forest model, train on labeled (ethane, methane, temp,
humidity -> spoilage_stage) data and replace `classify()` with a loaded
joblib/pickle pipeline. The I/O contract stays identical.

Run:  python3 gas_quality_detector.py '{"ethane":0.42,"methane":0.18,"temperature":25,"humidity":63}'
"""

import sys
import json

ETH_ELEV = 0.40      # ppm
MET_ELEV = 0.20      # ppm
TEMP_WARN = 27.0     # deg C
HUM_WARN = 70.0      # %

STAGE_BASE = {"LOW": 90, "MEDIUM": 76, "HIGH": 46}


def classify(ethane, methane, temperature, humidity):
    flags = {
        "ethaneHigh": ethane >= ETH_ELEV,
        "methaneHigh": methane >= MET_ELEV,
        "tempHigh": temperature >= TEMP_WARN,
        "humidityHigh": humidity >= HUM_WARN,
    }
    risk = (
        (0.35 if flags["ethaneHigh"] else 0)
        + (0.30 if flags["methaneHigh"] else 0)
        + (0.20 if flags["tempHigh"] else 0)
        + (0.15 if flags["humidityHigh"] else 0)
    )

    stage = "LOW"
    if risk >= 0.6:
        stage = "HIGH"
    elif risk >= 0.3:
        stage = "MEDIUM"

    # deterministic jitter so scores aren't perfectly static
    h = 0
    for ch in f"{ethane}{methane}{temperature}":
        h = (h * 31 + ord(ch)) & 0xFFFFFFFF
    jitter = (h % 7) - 3
    gas_score = max(0, min(100, STAGE_BASE[stage] + jitter))

    confidence = round(0.80 + (0.15 if stage == "LOW" else 0.10) + (h % 5) / 100, 2)

    return {
        "mode": "DEMO",
        "stage": stage,
        "gasScore": gas_score,
        "confidence": confidence,
        "flags": flags,
        "readings": {
            "ethane": ethane,
            "methane": methane,
            "temperature": temperature,
            "humidity": humidity,
        },
    }


def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    data = json.loads(raw)
    out = classify(
        float(data["ethane"]),
        float(data["methane"]),
        float(data["temperature"]),
        float(data["humidity"]),
    )
    print(json.dumps(out))


if __name__ == "__main__":
    main()
