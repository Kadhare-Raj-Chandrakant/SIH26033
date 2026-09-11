export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface SellerInfo {
  id: string;
  sellerType: 'FARMER' | 'FPO';
  businessName: string | null;
  farmLocation: string | null;
  verificationStatus: string;
}

export interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

export interface MarketplaceProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  unit: string;
  location: string | null;
  status: string;
  availableQuantity: number;
  category: Category;
  images: ProductImage[];
  seller: SellerInfo;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MarketplaceProductsResponse {
  success: boolean;
  data: MarketplaceProduct[];
  meta: PaginationMeta;
}

export interface MarketplaceProductDetailResponse {
  success: boolean;
  data: MarketplaceProduct;
}

export interface MarketplaceQueryParams {
  search?: string;
  categoryId?: string;
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc' | 'name_desc';
  page?: number;
  limit?: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  isAvailable: boolean;
  productStatus: string;
  image: string | null;
  seller: SellerInfo;
}

export interface CartData {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

export interface CartResponse {
  success: boolean;
  data: CartData;
}

export interface Address {
  id: string;
  userId: string;
  type: 'HOME' | 'BUSINESS' | 'FARM' | 'WAREHOUSE' | 'OTHER';
  name: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
}

export interface OrderItemSnapshot {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string | null;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  shippingAddressSnapshot: {
    name: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  createdAt: string;
  updatedAt: string;
  itemCount?: number;
  seller: SellerInfo;
  shipment?: ShipmentInfo | null;
  items: OrderItemSnapshot[];
}

export type ShipmentStatus =
  | 'CREATED'
  | 'PICKUP_PENDING'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED';

export interface ShipmentTrackingEvent {
  id: string;
  status: ShipmentStatus;
  location?: string;
  message: string;
  occurredAt: string;
}

export interface ShipmentInfo {
  id: string;
  provider: string;
  providerShipmentId?: string;
  trackingNumber: string;
  status: ShipmentStatus;
  estimatedDeliveryAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  events?: ShipmentTrackingEvent[];
}

export interface OrderTrackingData {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  shipment: ShipmentInfo | null;
}

export interface OrdersResponse {
  success: boolean;
  data: {
    orders: OrderDetail[];
    meta: PaginationMeta;
  };
}

export interface CreateOrderResponse {
  success: boolean;
  data: {
    orders: OrderDetail[];
    order: OrderDetail;
    count: number;
    totalAmount: number;
  };
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// Token Management
export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sih_auth_token');
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('sih_auth_token', token);
  }
}

export function clearStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sih_auth_token');
  }
}

function getAuthHeaders(customToken?: string): HeadersInit {
  const token = customToken || getStoredToken();
  const headers: HeadersInit = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// ---------------------------------------------------------------------------
// Marketplace APIs
// ---------------------------------------------------------------------------

export async function fetchMarketplaceProducts(
  params: MarketplaceQueryParams = {}
): Promise<MarketplaceProductsResponse> {
  const url = new URL(`${API_BASE_URL}/marketplace/products`);

  if (params.search?.trim()) url.searchParams.set('search', params.search.trim());
  if (params.categoryId) url.searchParams.set('categoryId', params.categoryId);
  if (params.location?.trim()) url.searchParams.set('location', params.location.trim());
  if (params.minPrice !== undefined && !isNaN(params.minPrice))
    url.searchParams.set('minPrice', params.minPrice.toString());
  if (params.maxPrice !== undefined && !isNaN(params.maxPrice))
    url.searchParams.set('maxPrice', params.maxPrice.toString());
  if (params.sort) url.searchParams.set('sort', params.sort);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || errorData?.message || 'Failed to fetch marketplace products');
  }

  return res.json();
}

export async function fetchMarketplaceProductById(
  id: string
): Promise<MarketplaceProductDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/marketplace/products/${id}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || errorData?.message || 'Product not found or unavailable');
  }

  return res.json();
}

export async function fetchCategories(): Promise<{ success: boolean; data: Category[] }> {
  const res = await fetch(`${API_BASE_URL}/categories`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch categories');
  }

  const json = await res.json();
  if (Array.isArray(json)) {
    return { success: true, data: json };
  }
  return json;
}

// ---------------------------------------------------------------------------
// Cart APIs
// ---------------------------------------------------------------------------

export async function fetchCart(token?: string): Promise<CartResponse> {
  const res = await fetch(`${API_BASE_URL}/cart`, {
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch cart');
  }

  return res.json();
}

export async function addToCart(
  productId: string,
  quantity: number,
  token?: string
): Promise<{ success: boolean; data: { id: string; productId: string; quantity: number; updatedAt: string } }> {
  const res = await fetch(`${API_BASE_URL}/cart/items`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ productId, quantity }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to add item to cart');
  }

  return res.json();
}

export async function updateCartItemQuantity(
  productId: string,
  quantity: number,
  token?: string
): Promise<{ success: boolean; data: { id: string; productId: string; quantity: number; updatedAt: string } }> {
  const res = await fetch(`${API_BASE_URL}/cart/items/${productId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ quantity }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to update cart quantity');
  }

  return res.json();
}

export async function removeCartItem(
  productId: string,
  token?: string
): Promise<{ success: boolean; data: { message: string } }> {
  const res = await fetch(`${API_BASE_URL}/cart/items/${productId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to remove item from cart');
  }

  return res.json();
}

export async function clearCart(token?: string): Promise<{ success: boolean; data: { message: string } }> {
  const res = await fetch(`${API_BASE_URL}/cart`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to clear cart');
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Addresses APIs
// ---------------------------------------------------------------------------

export async function fetchAddresses(token?: string): Promise<{ success: boolean; data: Address[] }> {
  const res = await fetch(`${API_BASE_URL}/addresses`, {
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch addresses');
  }

  return res.json();
}

export async function createAddress(
  addressData: {
    name: string;
    phone: string;
    addressLine: string;
    city: string;
    state: string;
    pincode: string;
    type?: string;
    country?: string;
    isDefault?: boolean;
  },
  token?: string
): Promise<{ success: boolean; data: Address }> {
  const res = await fetch(`${API_BASE_URL}/addresses`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(addressData),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to create address');
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Orders APIs
// ---------------------------------------------------------------------------

export async function createOrder(
  addressId: string,
  token?: string
): Promise<CreateOrderResponse> {
  const res = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify({ addressId }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to create order');
  }

  return res.json();
}

export async function fetchBuyerOrders(
  params: { page?: number; limit?: number } = {},
  token?: string
): Promise<OrdersResponse> {
  const url = new URL(`${API_BASE_URL}/orders`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch orders');
  }

  return res.json();
}

export async function fetchBuyerOrderById(
  id: string,
  token?: string
): Promise<{ success: boolean; data: OrderDetail }> {
  const res = await fetch(`${API_BASE_URL}/orders/${id}`, {
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch order details');
  }

  return res.json();
}

export async function cancelBuyerOrder(
  id: string,
  token?: string
): Promise<{ success: boolean; data: { message: string; orderId: string; status: string } }> {
  const res = await fetch(`${API_BASE_URL}/orders/${id}/cancel`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to cancel order');
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Demo Buyer Login Helper
// ---------------------------------------------------------------------------

export async function demoLoginBuyer(): Promise<{
  token: string;
  user: { id: string; email: string; role: string };
}> {
  // Attempt login with demo buyer credentials
  const email = 'demobuyer@sih26033.org';
  const password = 'Password@123';

  let loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    // If not found, register demo buyer first
    const regRes = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: 'Demo Verified Buyer',
        mobile: '9898000001',
        role: 'BUYER',
      }),
    });

    if (!regRes.ok) {
      const err = await regRes.json().catch(() => ({}));
      // If conflict, try logging in again
      if (regRes.status !== 409) {
        throw new Error(err?.message || 'Failed to setup demo buyer');
      }
    }

    loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  }

  const json = await loginRes.json();
  const token = json.data?.accessToken || json.accessToken;
  const user = json.data?.user || json.user;

  if (!token) {
    throw new Error('Failed to retrieve authentication token');
  }

  setStoredToken(token);
  return { token, user };
}

// ---------------------------------------------------------------------------
// Logistics, Fulfillment & Tracking API Functions
// ---------------------------------------------------------------------------

export async function fetchOrderTracking(
  orderId: string,
  token?: string,
): Promise<{ success: boolean; data: OrderTrackingData }> {
  const res = await fetch(`${API_BASE_URL}/orders/${orderId}/tracking`, {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch tracking details');
  }
  return res.json();
}

export async function fetchSellerOrders(
  params: { page?: number; limit?: number } = {},
  token?: string,
): Promise<OrdersResponse> {
  const url = new URL(`${API_BASE_URL}/seller/orders`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch seller orders');
  }
  return res.json();
}

export async function fetchSellerOrderById(
  orderId: string,
  token?: string,
): Promise<{ success: boolean; data: OrderDetail }> {
  const res = await fetch(`${API_BASE_URL}/seller/orders/${orderId}`, {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch seller order details');
  }
  return res.json();
}

export async function confirmSellerOrder(
  orderId: string,
  token?: string,
): Promise<{ success: boolean; data: { message: string; orderId: string; status: string } }> {
  const res = await fetch(`${API_BASE_URL}/seller/orders/${orderId}/confirm`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to confirm order');
  }
  return res.json();
}

export async function processSellerOrder(
  orderId: string,
  token?: string,
): Promise<{ success: boolean; data: { message: string; orderId: string; status: string } }> {
  const res = await fetch(`${API_BASE_URL}/seller/orders/${orderId}/processing`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to start processing order');
  }
  return res.json();
}

export async function readySellerOrder(
  orderId: string,
  token?: string,
): Promise<{ success: boolean; data: { message: string; orderId: string; status: string } }> {
  const res = await fetch(`${API_BASE_URL}/seller/orders/${orderId}/ready-for-shipment`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to mark order ready for shipment');
  }
  return res.json();
}

export async function shipSellerOrder(
  orderId: string,
  payload?: { simulateFailure?: boolean; carrierNotes?: string },
  token?: string,
): Promise<{
  success: boolean;
  data: {
    message: string;
    orderId: string;
    status: string;
    shipment: ShipmentInfo;
  };
}> {
  const res = await fetch(`${API_BASE_URL}/seller/orders/${orderId}/ship`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to dispatch shipment');
  }
  return res.json();
}

export async function syncSellerOrderShipment(
  orderId: string,
  token?: string,
): Promise<{
  success: boolean;
  data: {
    message: string;
    orderId: string;
    orderStatus: string;
    shipment: ShipmentInfo;
  };
}> {
  const res = await fetch(`${API_BASE_URL}/seller/orders/${orderId}/sync-shipment`, {
    method: 'POST',
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to sync shipment status');
  }
  return res.json();
}

export async function demoLoginSeller(sellerType: 'FARMER' | 'FPO' = 'FARMER'): Promise<{
  token: string;
  user: { id: string; email: string; role: string };
}> {
  const email = sellerType === 'FARMER' ? 'farmer1_demo@sih26033.org' : 'fpo_demo@sih26033.org';
  const password = 'Password@123';

  let loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    // Register demo seller
    await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: sellerType === 'FARMER' ? 'Ramesh Farmer (Demo)' : 'Maharashtra Agro FPO (Demo)',
        mobile: sellerType === 'FARMER' ? '9898000002' : '9898000003',
        role: sellerType,
      }),
    });

    loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  }

  const json = await loginRes.json();
  const token = json.data?.accessToken || json.accessToken;
  const user = json.data?.user || json.user;

  if (!token) {
    throw new Error('Failed to retrieve seller authentication token');
  }

  setStoredToken(token);
  return { token, user };
}

// -----------------------------------------------------------------------------
// MILESTONE 10 — AI RECOMMENDATIONS, PRICING & MARKET INTELLIGENCE
// -----------------------------------------------------------------------------

export interface MarketObservation {
  market: string;
  district: string;
  state: string;
  minPrice: number;
  maxPrice: number;
  modalPrice: number;
  arrivals: number;
  tempMean: number | null;
  rainfall: number | null;
  humidity: number | null;
  predictedPrice: number | null;
  distanceKm?: number;
  estimatedLogisticsCostPerUnit?: number;
  estimatedNetAfterLogistics?: number;
}

export interface CommodityMarketIntelligence {
  commodity: string;
  reportingDate: string;
  totalMarketsReporting: number;
  overallStats: {
    minModalPrice: number;
    maxModalPrice: number;
    avgModalPrice: number;
    totalArrivalsTonnes: number;
    topPayingMarket: string;
    lowestPayingMarket: string;
  };
  markets: MarketObservation[];
  platformMarket: {
    activeListingsCount: number;
    minListingPrice: number | null;
    maxListingPrice: number | null;
    avgListingPrice: number | null;
    totalAvailableStock: number;
    unit: string;
  };
  historicalTrend: Array<{ date: string; modal_price: number; arrivals: number }>;
  forwardOutlook: {
    current_modal_price: number;
    projected_7d_price: number | null;
    projected_14d_price: number | null;
    projected_change_percent: number | null;
    price_trend_direction: 'RISING' | 'FALLING' | 'STABLE';
    demand_absorption_band: 'LOW' | 'MODERATE' | 'HIGH';
    supporting_factors: string[];
  } | null;
  dataSourceDisclosures: {
    apmcMandi: string;
    platformMarketplace: string;
    wholesaleAbsorptionNotice: string;
  };
  limitations: string[];
  generatedAt: string;
}

export interface PriceIntelligence {
  commodity: string;
  market: string;
  currentPrice: number;
  predictedPrice: number;
  lowerBound: number;
  upperBound: number;
  trend: 'RISING' | 'FALLING' | 'STABLE';
  factors: Array<{ feature: string; weight: number; interpretation: string }>;
  modelVersion: string;
  modelAvailable: boolean;
  marketComparison: MarketObservation[];
  dataFreshnessNotice: string;
  limitations: string[];
  generatedAt: string;
}

export interface DeductionItem {
  name: string;
  category: 'LOGISTICS' | 'HANDLING' | 'STORAGE' | 'FEES' | 'TAX';
  amount: number;
  perUnit: number;
  status: 'ACTUAL' | 'CALCULATED' | 'ESTIMATED' | 'USER_PROVIDED' | 'UNAVAILABLE' | 'NOT_APPLICABLE';
  source: string;
  notes: string;
}

export interface NetRealizationResult {
  grossSellingValue: number;
  grossPricePerUnit: number;
  quantity: number;
  unit: string;
  deductions: DeductionItem[];
  totalDeductions: number;
  estimatedNetRealization: number;
  perUnitNetRealization: number;
  assumptions: string[];
  calculationType: 'ESTIMATED_PRE_SALE';
  settlementDistinctionNotice: string;
  generatedAt: string;
}

export interface BestTimeToSellResult {
  commodity: string;
  market: string;
  currentPrice: number;
  recommendation: 'Sell now' | 'Consider selling soon' | 'Consider waiting' | 'Insufficient evidence';
  recommendationSummary: string;
  supportingFactors: string[];
  forwardProjections: {
    horizon7DaysPrice: number | null;
    horizon14DaysPrice: number | null;
    expectedChangePercent: number | null;
  };
  marketActivityProxy: string;
  perishabilityRiskAssessment: string;
  limitations: string[];
  generatedAt: string;
}

export interface AllocationOption {
  rank: number;
  channelType: 'MANDI' | 'DIRECT_BUYER' | 'PLATFORM_LISTING';
  channelName: string;
  destinationLocation: string;
  distanceKm: number;
  expectedGrossPricePerUnit: number;
  grossSellingValue: number;
  logisticsCost: number;
  handlingCost: number;
  platformOrMandiFee: number;
  totalDeductions: number;
  estimatedNetRealization: number;
  perUnitNetRealization: number;
  marketActivityProxy: string;
  settlementTimeline: string;
  advantages: string[];
  disadvantages: string[];
}

export interface SmartAllocationResult {
  commodity: string;
  quantity: number;
  unit: string;
  sellerOrigin: string;
  rankedOptions: AllocationOption[];
  recommendedOption: AllocationOption;
  recommendationRationale: string;
  eliminatedCandidates: Array<{ candidateName: string; channelType: string; reason: string }>;
  settlementDistinctionNotice: string;
  generatedAt: string;
}

export interface BuyerMatchItem {
  requirementId: string;
  buyerId: string;
  buyerName: string;
  businessName: string | null;
  buyerType: string;
  commodity: string;
  requiredQuantity: number;
  unit: string;
  targetPrice: number | null;
  deliveryLocation: string | null;
  distanceKm: number;
  matchScore: number;
  scoreBreakdown: {
    commodityCompatibility: number;
    quantityCompatibility: number;
    locationDistance: number;
    priceCompatibility: number;
    fulfillmentFeasibility: number;
  };
  reasons: string[];
}

export interface SellerMatchItem {
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  businessName: string | null;
  sellerType: string;
  verificationStatus: string;
  availableQuantity: number;
  unit: string;
  unitPrice: number;
  location: string | null;
  distanceKm: number;
  matchScore: number;
  scoreBreakdown: {
    quantityFulfillment: number;
    priceCompetitiveness: number;
    distanceLogistics: number;
    sellerReliability: number;
  };
  reasons: string[];
  imageUrl: string | null;
}

export interface BuyerRequirement {
  id: string;
  buyerId: string;
  commodity: string;
  variety?: string | null;
  requiredQuantity: number;
  unit: string;
  targetPrice?: number | null;
  deliveryLocation?: string | null;
  maxDistanceKm?: number | null;
  status: string;
  notes?: string | null;
  createdAt: string;
  buyer?: {
    id: string;
    businessName: string | null;
    buyerType: string;
    verificationStatus: string;
  };
}

export async function getMarketIntelligence(
  commodity: string,
  location?: { city?: string; state?: string; latitude?: number; longitude?: number },
): Promise<CommodityMarketIntelligence> {
  const params = new URLSearchParams();
  if (location?.city) params.set('city', location.city);
  if (location?.state) params.set('state', location.state);
  if (location?.latitude) params.set('latitude', String(location.latitude));
  if (location?.longitude) params.set('longitude', String(location.longitude));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/ai/market-intelligence/${encodeURIComponent(commodity)}${queryStr}`);
  if (!res.ok) {
    throw new Error('Failed to retrieve commodity market intelligence');
  }
  return res.json();
}

export async function getPriceIntelligence(payload: {
  commodity: string;
  market?: string;
  recentPrice?: number;
  targetDate?: string;
}): Promise<PriceIntelligence> {
  const res = await fetch(`${API_BASE_URL}/ai/price-intelligence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to infer price intelligence');
  }
  return res.json();
}

export async function calculateNetRealization(payload: {
  quantity: number;
  unit?: string;
  grossPricePerUnit: number;
  destinationName?: string;
  distanceKm?: number;
  logisticsCost?: number;
  storageDays?: number;
  storageRatePerUnitDay?: number;
  packagingCostPerUnit?: number;
  handlingCostPerUnit?: number;
  platformFeeRatePercent?: number;
  mandiCessPercent?: number;
}): Promise<NetRealizationResult> {
  const res = await fetch(`${API_BASE_URL}/ai/net-realization`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to calculate net realization breakdown');
  }
  return res.json();
}

export async function getBestTimeToSell(payload: {
  commodity: string;
  market?: string;
  currentPrice?: number;
  isHighlyPerishable?: boolean;
}): Promise<BestTimeToSellResult> {
  const res = await fetch(`${API_BASE_URL}/ai/best-time-to-sell`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Failed to evaluate best time to sell');
  }
  return res.json();
}

export async function getSmartAllocation(
  payload: {
    commodity: string;
    quantity: number;
    unit?: string;
    sellerLocation: { city?: string; state?: string; pincode?: string; latitude?: number; longitude?: number };
    minAcceptablePrice?: number;
    maxTransitDistanceKm?: number;
    includeMandis?: boolean;
    includeDirectBuyers?: boolean;
    includePlatformListing?: boolean;
  },
  token?: string,
): Promise<SmartAllocationResult> {
  const res = await fetch(`${API_BASE_URL}/ai/smart-allocation`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to calculate smart allocation');
  }
  return res.json();
}

export async function matchBuyersForFarmer(
  payload: {
    commodity: string;
    quantity: number;
    askingPrice?: number;
    location: { city?: string; state?: string; latitude?: number; longitude?: number };
    maxDistanceKm?: number;
    limit?: number;
  },
  token?: string,
): Promise<BuyerMatchItem[]> {
  const res = await fetch(`${API_BASE_URL}/ai/matching/buyers`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to find matched buyers');
  }
  return res.json();
}

export async function matchSellersForBuyer(
  payload: {
    commodity: string;
    requiredQuantity: number;
    maxBudgetPerUnit?: number;
    deliveryLocation: { city?: string; state?: string; latitude?: number; longitude?: number };
    maxDistanceKm?: number;
    limit?: number;
  },
  token?: string,
): Promise<SellerMatchItem[]> {
  const res = await fetch(`${API_BASE_URL}/ai/matching/sellers`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to find matched seller products');
  }
  return res.json();
}

export async function createBuyerRequirement(
  payload: {
    commodity: string;
    variety?: string;
    requiredQuantity: number;
    unit?: string;
    targetPrice?: number;
    deliveryLocation?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    maxDistanceKm?: number;
    notes?: string;
  },
  token?: string,
): Promise<BuyerRequirement> {
  const res = await fetch(`${API_BASE_URL}/buyer/requirements`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to post sourcing requirement');
  }
  return res.json();
}

export async function getOpenBuyerRequirements(commodity?: string): Promise<BuyerRequirement[]> {
  const query = commodity ? `?commodity=${encodeURIComponent(commodity)}` : '';
  const res = await fetch(`${API_BASE_URL}/marketplace/buyer-requirements${query}`);
  if (!res.ok) {
    return [];
  }
  return res.json();
}
