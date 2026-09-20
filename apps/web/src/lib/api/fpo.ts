import { API_BASE_URL, getStoredToken } from '../api';

export interface FpoOrganization {
  id: string;
  name: string;
  registrationNumber: string;
  legalStructure: 'PRODUCER_COMPANY' | 'COOPERATIVE' | 'SECTION_8' | 'OTHER';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  registrationDate?: string | null;
  state: string;
  district: string;
  address: string;
  pincode: string;
  contactEmail: string;
  contactPhone: string;
  bankAccountNumber?: string | null;
  ifscCode?: string | null;
  bankName?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  adminId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
  activeListingsCount?: number;
  batchesCount?: number;
  totalListingsCount?: number;
  totalBatchesCount?: number;
  activeCommodities?: string[];
  admin?: {
    id: string;
    email: string;
    mobile?: string | null;
  };
}

export interface FpoMembership {
  id: string;
  fpoId: string;
  farmerId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'LEFT';
  shareCapital?: number | null;
  joinedAt?: string | null;
  approvedAt?: string | null;
  approvedBy?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  farmer?: {
    id: string;
    email: string;
    mobile?: string | null;
    sellerProfile?: {
      businessName?: string | null;
      farmLocation?: string | null;
    } | null;
  };
  fpo?: Partial<FpoOrganization>;
}

export interface FpoListing {
  id: string;
  fpoId: string;
  farmerId: string;
  commodity: string;
  quantityQuintals: number;
  qualityGrade?: string | null;
  expectedHarvestDate?: string | null;
  actualCollectedQty?: number | null;
  notes?: string | null;
  status: 'COMMITTED' | 'COLLECTED' | 'AGGREGATED' | 'SOLD' | 'CANCELLED';
  batchId?: string | null;
  createdAt: string;
  updatedAt: string;
  farmer?: {
    id: string;
    email: string;
    mobile?: string | null;
    sellerProfile?: {
      businessName?: string | null;
    } | null;
  };
  fpo?: {
    id: string;
    name: string;
    state?: string;
    district?: string;
  };
  batch?: {
    id: string;
    batchNumber: string;
    status: string;
    commodity?: string;
  } | null;
}

export interface FpoAggregationBatch {
  id: string;
  fpoId: string;
  batchNumber: string;
  commodity: string;
  totalQuantity: number;
  qualityGrade?: string | null;
  status: 'OPEN' | 'SEALED' | 'MATCHED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
  sealedAt?: string | null;
  buyRequestId?: string | null;
  orderId?: string | null;
  createdAt: string;
  updatedAt: string;
  listings?: FpoListing[];
  buyRequest?: FpoBuyRequest | null;
}

export interface FpoBuyRequest {
  id: string;
  buyerId: string;
  fpoId?: string | null;
  commodity: string;
  requiredQuantity: number;
  filledQuantity: number;
  targetPrice?: number | null;
  deliveryCity?: string | null;
  maxDistanceKm?: number | null;
  qualityRequirements?: string | null;
  notes?: string | null;
  status: 'OPEN' | 'PARTIALLY_MATCHED' | 'FULLY_MATCHED' | 'CLOSED' | 'EXPIRED';
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  buyer?: {
    id: string;
    email: string;
    mobile?: string | null;
    buyerProfile?: {
      businessName?: string | null;
    } | null;
  };
  fpo?: {
    id: string;
    name: string;
    state?: string;
    district?: string;
  } | null;
}

export interface FpoFarmerPayment {
  id: string;
  settlementId: string;
  farmerId: string;
  listingId: string;
  quantity: number;
  ratePerQuintal: number;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  status: 'PENDING' | 'PROCESSING' | 'DISTRIBUTED' | 'FAILED';
  paidAt?: string | null;
  transactionId?: string | null;
  createdAt: string;
  updatedAt: string;
  farmer?: {
    id: string;
    email: string;
    mobile?: string | null;
  };
}

export interface FpoSettlement {
  id: string;
  fpoId: string;
  adminId?: string | null;
  orderId: string;
  batchId: string;
  grossAmount: number;
  fpoCommission: number;
  transportCost: number;
  handlingCost: number;
  otherDeductions: number;
  netDistributable: number;
  status: 'PENDING' | 'PROCESSING' | 'DISTRIBUTED' | 'FAILED';
  distributedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  batch?: Partial<FpoAggregationBatch>;
  farmerPayments?: FpoFarmerPayment[];
}

export interface MatchedBatchResult {
  batch: FpoAggregationBatch;
  buyRequest: FpoBuyRequest;
  remainingQuantity: number;
  matchPercentage: number;
  canFulfillImmediately: boolean;
}

export interface FpoDashboardStats {
  fpo: FpoOrganization;
  stats: {
    activeMembers: number;
    pendingMembers: number;
    committedQuintals: number;
    openBatches: number;
    matchedOrders: number;
    totalDistributedAmount: number;
  };
}

function getAuthHeaders(token?: string): HeadersInit {
  const jwt = token || getStoredToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response, fallbackError: string): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const message = err?.error?.message || err?.message || fallbackError;
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  const json = await res.json();
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

// =============================================================================
// API FUNCTIONS
// =============================================================================

export async function fetchFpos(filters: {
  state?: string;
  district?: string;
  commodity?: string;
  search?: string;
  status?: string;
} = {}): Promise<FpoOrganization[]> {
  const params = new URLSearchParams();
  if (filters.state) params.set('state', filters.state);
  if (filters.district) params.set('district', filters.district);
  if (filters.commodity) params.set('commodity', filters.commodity);
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/fpo${query}`);
  return handleResponse<FpoOrganization[]>(res, 'Failed to fetch FPO directory');
}

export async function fetchFpoById(id: string): Promise<FpoOrganization> {
  const res = await fetch(`${API_BASE_URL}/fpo/${id}`);
  return handleResponse<FpoOrganization>(res, 'Failed to fetch FPO organization details');
}

export async function fetchMyOrganization(token?: string): Promise<FpoOrganization | null> {
  const res = await fetch(`${API_BASE_URL}/fpo/my-organization`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoOrganization | null>(res, 'Failed to fetch your FPO organization');
}

export async function registerFpo(
  payload: {
    name: string;
    registrationNumber: string;
    legalStructure: string;
    registrationDate?: string;
    state: string;
    district: string;
    address: string;
    pincode: string;
    contactEmail: string;
    contactPhone: string;
    bankAccountNumber?: string;
    ifscCode?: string;
    bankName?: string;
    description?: string;
  },
  token?: string,
): Promise<FpoOrganization> {
  const res = await fetch(`${API_BASE_URL}/fpo/register`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<FpoOrganization>(res, 'Failed to register FPO');
}

export async function requestFpoMembership(
  fpoId: string,
  shareCapital?: number,
  token?: string,
): Promise<FpoMembership> {
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/join`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ shareCapital }),
  });
  return handleResponse<FpoMembership>(res, 'Failed to submit membership application');
}

export async function fetchFarmerMemberships(token?: string): Promise<FpoMembership[]> {
  const res = await fetch(`${API_BASE_URL}/fpo/farmer/my-memberships`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoMembership[]>(res, 'Failed to fetch memberships');
}

export async function fetchFpoMembers(
  fpoId: string,
  status?: string,
  token?: string,
): Promise<FpoMembership[]> {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/members${query}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoMembership[]>(res, 'Failed to fetch FPO members');
}

export async function approveFpoMembership(
  membershipId: string,
  approve: boolean,
  reason?: string,
  token?: string,
): Promise<FpoMembership> {
  const res = await fetch(`${API_BASE_URL}/fpo/memberships/${membershipId}/approve`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ approve, reason }),
  });
  return handleResponse<FpoMembership>(res, 'Failed to update membership application');
}

export async function commitFarmerListing(
  fpoId: string,
  payload: {
    commodity: string;
    quantityQuintals: number;
    qualityGrade?: string;
    expectedHarvestDate?: string;
    notes?: string;
  },
  token?: string,
): Promise<FpoListing> {
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/listings`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<FpoListing>(res, 'Failed to commit harvest to FPO');
}

export async function fetchFarmerListings(token?: string): Promise<FpoListing[]> {
  const res = await fetch(`${API_BASE_URL}/fpo/farmer/my-listings`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoListing[]>(res, 'Failed to fetch your produce commitments');
}

export async function fetchFpoListings(
  fpoId: string,
  filters: { status?: string; commodity?: string } = {},
  token?: string,
): Promise<FpoListing[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.commodity) params.set('commodity', filters.commodity);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/listings${query}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoListing[]>(res, 'Failed to fetch FPO listings');
}

export async function createAggregationBatch(
  fpoId: string,
  payload: { listingIds: string[]; qualityGrade?: string },
  token?: string,
): Promise<FpoAggregationBatch> {
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/batches`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<FpoAggregationBatch>(res, 'Failed to create aggregation batch');
}

export async function sealAggregationBatch(
  batchId: string,
  token?: string,
): Promise<FpoAggregationBatch> {
  const res = await fetch(`${API_BASE_URL}/fpo/batches/${batchId}/seal`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoAggregationBatch>(res, 'Failed to seal aggregation batch');
}

export async function fetchFpoBatches(
  fpoId: string,
  status?: string,
  token?: string,
): Promise<FpoAggregationBatch[]> {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/batches${query}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoAggregationBatch[]>(res, 'Failed to fetch FPO batches');
}

export async function fetchMatchedBatches(
  fpoId: string,
  token?: string,
): Promise<MatchedBatchResult[]> {
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/matched-batches`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<MatchedBatchResult[]>(res, 'Failed to retrieve matched procurement requests');
}

export async function matchBatchToBuyRequest(
  batchId: string,
  buyRequestId: string,
  token?: string,
): Promise<{ batch: FpoAggregationBatch; order: any; buyRequest: FpoBuyRequest }> {
  const res = await fetch(`${API_BASE_URL}/fpo/batches/${batchId}/match`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ buyRequestId }),
  });
  return handleResponse<{ batch: FpoAggregationBatch; order: any; buyRequest: FpoBuyRequest }>(
    res,
    'Failed to execute batch match',
  );
}

export async function createFpoSettlement(
  batchId: string,
  payload: {
    commissionPercent?: number;
    fpoCommissionPercentage?: number;
    transportCost?: number;
    handlingCost?: number;
    otherDeductions?: number;
  },
  token?: string,
): Promise<FpoSettlement> {
  const res = await fetch(`${API_BASE_URL}/fpo/batches/${batchId}/settlement`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<FpoSettlement>(res, 'Failed to generate settlement statement');
}

export async function fetchFpoSettlements(
  fpoId: string,
  token?: string,
): Promise<FpoSettlement[]> {
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/settlements`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoSettlement[]>(res, 'Failed to fetch settlements');
}

export async function distributeFpoPayments(
  settlementId: string,
  token?: string,
): Promise<FpoSettlement> {
  const res = await fetch(`${API_BASE_URL}/fpo/settlements/${settlementId}/distribute`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoSettlement>(res, 'Failed to disburse farmer payments');
}

export async function postFpoBuyRequest(
  payload: {
    commodity: string;
    requiredQuantity: number;
    targetPrice?: number;
    deliveryCity?: string;
    maxDistanceKm?: number;
    qualityRequirements?: string;
    notes?: string;
  },
  token?: string,
): Promise<FpoBuyRequest> {
  const res = await fetch(`${API_BASE_URL}/fpo/buy-requests`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  return handleResponse<FpoBuyRequest>(res, 'Failed to submit bulk buy request');
}

export async function fetchFpoBuyRequests(filters: {
  commodity?: string;
  status?: string;
} = {}): Promise<FpoBuyRequest[]> {
  const params = new URLSearchParams();
  if (filters.commodity) params.set('commodity', filters.commodity);
  if (filters.status) params.set('status', filters.status);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/fpo/buy-requests/all${query}`);
  return handleResponse<FpoBuyRequest[]>(res, 'Failed to fetch bulk procurement requests');
}

export async function fetchFpoDashboardStats(
  fpoId: string,
  token?: string,
): Promise<FpoDashboardStats> {
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/dashboard`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoDashboardStats>(res, 'Failed to fetch FPO dashboard statistics');
}

export async function fetchAllFposForAdmin(
  status?: string,
  token?: string,
): Promise<FpoOrganization[]> {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE_URL}/fpo/admin/all${query}`, {
    headers: getAuthHeaders(token),
  });
  return handleResponse<FpoOrganization[]>(res, 'Failed to fetch FPO moderation queue');
}

export async function verifyFpoByAdmin(
  fpoId: string,
  status: string,
  reason?: string,
  token?: string,
): Promise<FpoOrganization> {
  const res = await fetch(`${API_BASE_URL}/fpo/${fpoId}/verify`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ status, reason }),
  });
  return handleResponse<FpoOrganization>(res, 'Failed to update FPO verification status');
}
