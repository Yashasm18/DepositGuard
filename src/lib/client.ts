import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../amplify/data/resource';

export const client = generateClient<Schema>();

export type Property = Schema['Property']['type'];
export type Room = Schema['Room']['type'];
export type Photo = Schema['Photo']['type'];
export type Phase = NonNullable<Photo['phase']>;

export type FindingStatus = 'NEW_DAMAGE' | 'PRE_EXISTING' | 'WEAR_AND_TEAR' | 'NO_CHANGE' | 'UNCLEAR';

export interface Finding {
  item: string;
  location: string;
  status: FindingStatus;
  severity: 'none' | 'low' | 'medium' | 'high';
  description: string;
  moveInPhotos: number[];
  moveOutPhotos: number[];
  confidence: number;
}

export interface ComparisonReport {
  overall: 'NO_NEW_DAMAGE' | 'WEAR_AND_TEAR_ONLY' | 'NEW_DAMAGE_FOUND' | 'INSUFFICIENT_EVIDENCE';
  summary: string;
  findings: Finding[];
  photoQualityNotes: string[];
  evidence: {
    photoId: string;
    phase: Phase;
    label: string;
    capturedAt: string;
    sha256: string;
    verified: boolean;
  }[];
  model: string;
}

/** The comparison is stored as AWSJSON, which can arrive as a string. */
export function parseReport(value: Room['comparison']): ComparisonReport | null {
  if (!value) return null;
  try {
    return (typeof value === 'string' ? JSON.parse(value) : value) as ComparisonReport;
  } catch {
    return null;
  }
}
