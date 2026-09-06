#!/usr/bin/env python3
"""
OnionSure — Multimodal Fusion Engine (confidence-weighted)

INPUT  (JSON string via argv[1] or stdin):
  {"vision":{visionScore,confidence}, "gas":{stage,gasScore,confidence},
   "environment":{environmentScore,confidence},
   "weights":{vision,gas,environment}, "grading":{gradeA,urs}}

OUTPUT (JSON to stdout):
  {finalScore, confidence, grade, riskLevel, earlySpoilageAlert, explanation, ...}

Implements the spec's confidence-weighted fusion:
  final = sum(w_k * conf_k * quality_k) / sum(w_k * conf_k)

Core innovation: if vision looks healthy (>=78) but gas risk is MEDIUM/HIGH,
flag EARLY SPOILAGE and force riskLevel=HIGH instead of trusting the camera.

Run:  python3 fusion_service.py '<json>'
"""

import sys
import json


def clamp(v, lo=0, hi=100):
    return max(lo, min(hi, v))


def fuse(vision, gas, environment, weights=None, grading=None):
    weights = weights or {"vision": 0.45, "gas": 0.35, "environment": 0.20}
    grading = grading or {"gradeA": 85, "urs": 65}

    vQ = vision["visionScore"]
    gQ = gas["gasScore"]
    eQ = environment["environmentScore"]
    vC = vision.get("confidence", 1)
    gC = gas.get("confidence", 1)
    eC = environment.get("confidence", 1)

    w_sum = weights["vision"] + weights["gas"] + weights["environment"] or 1
    num = (weights["vision"] * vC * vQ + weights["gas"] * gC * gQ + weights["environment"] * eC * eQ)
    den = (weights["vision"] * vC + weights["gas"] * gC + weights["environment"] * eC) or 1
    final_score = int(round(clamp(num / den)))
    confidence = round((weights["vision"] * vC + weights["gas"] * gC + weights["environment"] * eC) / w_sum, 2)

    grade = "REJECTED"
    if final_score >= grading["gradeA"]:
        grade = "GRADE A"
    elif final_score >= grading["urs"]:
        grade = "URS"

    early = vQ >= 78 and gas["stage"] in ("HIGH", "MEDIUM")
    risk = "LOW"
    if early:
        risk = "HIGH"
    elif gas["stage"] == "HIGH":
        risk = "HIGH"
    elif gas["stage"] == "MEDIUM":
        risk = "MEDIUM"

    explanation = f"Vision {vQ}, gas({gas['stage']}) {gQ}, environment {eQ} fused to {final_score}."
    if early:
        explanation = ("Most onions appear visually healthy, but the gas signature indicates possible "
                       "early-stage spoilage. Multimodal fusion overrides camera-only result to flag hidden risk.")

    return {
        "visionScore": vQ,
        "gasScore": gQ,
        "environmentalScore": eQ,
        "visionConfidence": round(vC, 2),
        "gasConfidence": round(gC, 2),
        "environmentalConfidence": round(eC, 2),
        "weights": weights,
        "finalScore": final_score,
        "confidence": confidence,
        "grade": grade,
        "riskLevel": risk,
        "earlySpoilageAlert": early,
        "explanation": explanation,
    }


def main():
    raw = sys.argv[1] if len(sys.argv) > 1 else sys.stdin.read()
    data = json.loads(raw)
    out = fuse(data["vision"], data["gas"], data["environment"], data.get("weights"), data.get("grading"))
    print(json.dumps(out))


if __name__ == "__main__":
    main()
