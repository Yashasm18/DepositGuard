/** Client for the local DepositGuard server (server/app.py). */

export type Phase = 'MOVE_IN' | 'MOVE_OUT';
export type RoomStatus = 'NOT_STARTED' | 'PROCESSING' | 'DONE' | 'FAILED';
export type FindingStatus = 'NEW_DAMAGE' | 'PRE_EXISTING' | 'WEAR_AND_TEAR' | 'NOT_DAMAGE' | 'NO_CHANGE' | 'UNCLEAR';
export type Overall = 'NO_NEW_DAMAGE' | 'WEAR_AND_TEAR_ONLY' | 'NEW_DAMAGE_FOUND' | 'INSUFFICIENT_EVIDENCE';
export type Verdict = 'AGREE' | 'DISPUTE';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface PropertySummary {
  id: string;
  name: string;
  address: string | null;
  ownerName: string | null;
  moveInDate: string | null;
  depositAmount: number | null;
  roomCount: number;
}

export interface Photo {
  id: string;
  phase: Phase;
  sha256: string;
  width: number;
  height: number;
  capturedAt: string;
  uploadedAt: string;
  note: string | null;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Finding {
  id: string;
  item: string;
  location: string;
  status: FindingStatus;
  severity: 'none' | 'low' | 'medium' | 'high';
  description: string;
  confidence: number;
  moveInPhotoId: string;
  moveOutPhotoId: string;
  box: Box | null;
  source: 'ai' | 'change-detection';
}

export interface Report {
  overall: Overall;
  summary: string;
  findings: Finding[];
  photoQualityNotes: string[];
  evidence: {
    photoId: string;
    phase: Phase;
    label: string;
    capturedAt: string;
    uploadedAt: string;
    sha256: string;
    verified: boolean;
  }[];
  model: string;
  analysedAt: string;
}

export interface OwnerResponse {
  verdict: Verdict;
  comment: string | null;
  respondedAt: string;
}

export interface Room {
  id: string;
  name: string;
  status: RoomStatus;
  error: string | null;
  comparedAt: string | null;
  report: Report | null;
  photos: Photo[];
  responses: Record<string, OwnerResponse>;
}

export interface Property extends Omit<PropertySummary, 'roomCount'> {
  createdAt: string;
  rooms: Room[];
  expiresAt?: number;
}

export interface PropertyInput {
  name: string;
  address?: string | null;
  ownerName?: string | null;
  moveInDate?: string | null;
  depositAmount?: number | null;
}

export interface ShareLink {
  id: string;
  expiresAt: number;
  revoked: boolean;
  createdAt: string;
  token?: string;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'X-DepositGuard': '1' };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  let res: Response;
  try {
    res = await fetch(`/api${path}`, { method, headers, body: payload, credentials: 'same-origin' });
  } catch {
    throw new ApiError('Could not reach the DepositGuard server. Is it running?', 0);
  }
  // A dead backend behind the dev proxy comes back as a 502/503/504, which
  // means fetch RESOLVES rather than throwing, so the unreachable-server
  // branch above never runs and the user gets "Something went wrong" while
  // the real answer is that server/app.py is not running.
  if (res.status === 502 || res.status === 503 || res.status === 504) {
    throw new ApiError('Could not reach the DepositGuard server. Is it running?', res.status);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? 'Please check the form.' : 'Something went wrong.';
    throw new ApiError(message, res.status);
  }
  return data as T;
}

export const api = {
  me: () => request<User>('GET', '/me'),
  signUp: (email: string, name: string, password: string) => request<User>('POST', '/auth/signup', { email, name, password }),
  signIn: (email: string, password: string) => request<User>('POST', '/auth/signin', { email, password }),
  signOut: () => request<{ ok: true }>('POST', '/auth/signout'),

  properties: () => request<PropertySummary[]>('GET', '/properties'),
  property: (id: string) => request<Property>('GET', `/properties/${id}`),
  createProperty: (input: PropertyInput) => request<{ id: string }>('POST', '/properties', input),
  updateProperty: (id: string, input: PropertyInput) => request<{ ok: true }>('PATCH', `/properties/${id}`, input),

  createRoom: (propertyId: string, name: string) => request<{ id: string }>('POST', `/properties/${propertyId}/rooms`, { name }),
  deleteRoom: (roomId: string) => request<{ ok: true }>('DELETE', `/rooms/${roomId}`),

  uploadPhoto: (roomId: string, phase: Phase, file: Blob, capturedAt: string) => {
    const form = new FormData();
    form.append('file', file, 'photo.jpg');
    form.append('phase', phase);
    form.append('capturedAt', capturedAt);
    return request<Photo>('POST', `/rooms/${roomId}/photos`, form);
  },
  deletePhoto: (photoId: string) => request<{ ok: true }>('DELETE', `/photos/${photoId}`),
  compare: (roomId: string) => request<{ status: RoomStatus }>('POST', `/rooms/${roomId}/compare`),

  createShare: (propertyId: string) => request<ShareLink>('POST', `/properties/${propertyId}/shares`),
  shares: (propertyId: string) => request<ShareLink[]>('GET', `/properties/${propertyId}/shares`),
  revokeShare: (shareId: string) => request<{ ok: true }>('POST', `/shares/${shareId}/revoke`),

  shared: (token: string) => request<Property>('GET', `/share/${token}`),
  respond: (token: string, roomId: string, findingId: string, verdict: Verdict, comment?: string) =>
    request<{ ok: true }>('PUT', `/share/${token}/rooms/${roomId}/findings/${findingId}`, { verdict, comment }),
};

/** Where to load a photo from: the tenant's session, or an owner's share link. */
export type PhotoSource = { kind: 'tenant' } | { kind: 'share'; token: string };

export function photoUrl(source: PhotoSource, photoId: string): string {
  return source.kind === 'share' ? `/api/share/${source.token}/photos/${photoId}` : `/api/photos/${photoId}/file`;
}
