/**
 * Shared AI analysis contracts (spec §12 / §13).
 *
 * Both the Mock and Python analyzers return these shapes so the inspection
 * pipeline never depends on which provider is configured.
 */
import type { DefectType, RiskLevel, Severity } from '@prisma/client';

export interface DefectFinding {
  type: DefectType;
  count: number;
  severity: Severity;
  /** 0..1 model confidence for this defect class. */
  confidence: number;
}

export interface VisionResult {
  modelName: string;
  modelVersion: string;
  /** 0..100 surface quality score. */
  quality: number;
  /** 0..1 model confidence. */
  confidence: number;
  defects: DefectFinding[];
  processingTimeMs: number;
}

export interface GasResult {
  modelName: string;
  modelVersion: string;
  /** 0..100 gas/headspace quality score. */
  quality: number;
  /** 0..1 model confidence. */
  confidence: number;
  /** LOW | MEDIUM | HIGH spoilage risk from volatiles. */
  risk: RiskLevel;
  /** True when volatiles indicate hidden spoilage the camera can't see. */
  earlySpoilageRisk: boolean;
  environment: {
    /** 0..100 ambient quality (temperature/humidity within band). */
    quality: number;
    confidence: number;
    temperature?: number;
    humidity?: number;
  };
  readingsSummary?: Record<string, number>;
  processingTimeMs: number;
}

export interface VisionAnalysisInput {
  inspectionId: string;
  imageCount: number;
  imageKeys?: string[];
}

export interface GasAnalysisInput {
  inspectionId: string;
  readings?: Array<Record<string, number | null | undefined>>;
}

export interface VisionAnalyzer {
  analyze(input: VisionAnalysisInput): Promise<VisionResult>;
}

export interface GasAnalyzer {
  analyze(input: GasAnalysisInput): Promise<GasResult>;
}
