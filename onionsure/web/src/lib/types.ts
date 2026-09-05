export type Role = 'procurement_officer' | 'fpo' | 'farmer' | 'buyer' | 'admin';

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
  email?: string;
  centerId?: string | null;
  fpoId?: string | null;
  farmerId?: string | null;
  buyerId?: string | null;
}

export interface Center {
  id: string;
  name: string;
  location?: string;
  latitude?: number;
  longitude?: number;
}

export interface Fpo {
  id: string;
  name: string;
  centerId?: string;
  registeredFarmers?: number;
}

export interface Farmer {
  id: string;
  name: string;
  fpoId?: string;
  location?: string;
  qualityGradeA?: number;
  totalLots?: number;
}

export interface Lot {
  id: string;
  lotNumber: string;
  farmerId?: string;
  fpoId?: string;
  crop?: string;
  variety?: string;
  quantityKg?: number;
  procurementCenterId?: string;
  inspectorId?: string;
  status?: string;
  createdAt: string;
}

export interface VisionResult {
  mode: string;
  total: number;
  counts: Record<string, number>;
  percentages: Record<string, number>;
  visionScore: number;
  confidence: number;
  detections: Detection[];
}

export interface Detection {
  id: string;
  class: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  size: number;
}

export interface GasResult {
  mode: string;
  stage: 'LOW' | 'MEDIUM' | 'HIGH';
  gasScore: number;
  confidence: number;
  flags: Record<string, boolean>;
  readings: { ethane: number; methane: number; temperature: number; humidity: number };
}

export interface EnvResult {
  environmentScore: number;
  confidence: number;
  temperature: number;
  humidity: number;
}

export interface FusionResult {
  visionScore: number;
  gasScore: number;
  environmentalScore: number;
  visionConfidence: number;
  gasConfidence: number;
  environmentalConfidence: number;
  finalScore: number;
  confidence: number;
  grade: 'GRADE A' | 'URS' | 'REJECTED';
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  earlySpoilageAlert: boolean;
  explanation: string;
  weights?: Record<string, number>;
}

export interface Certificate {
  id: string;
  inspectionId: string;
  certificateNumber: string;
  grade: string;
  qualityScore: number;
  grade_a_percentage: number;
  urs_percentage: number;
  rejected_percentage: number;
  qrToken: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
}

export interface DashboardStats {
  todayInspections: number;
  pendingInspections: number;
  gradeALots: number;
  ursLots: number;
  rejectedLots: number;
  totalLots: number;
  totalInspections: number;
  totalFarmers: number;
  totalFPOs: number;
  totalBuyers: number;
  averageQualityScore: number;
}

export interface SensorReading {
  id?: string;
  inspectionId?: string;
  ethane: number;
  methane: number;
  temperature: number;
  humidity: number;
  timestamp?: string;
}
