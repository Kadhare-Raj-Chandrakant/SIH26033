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
  primaryImage?: string | null;
  images: ProductImage[];

  seller: SellerInfo;
  farmerName?: string | null;
  farmName?: string | null;
  state?: string | null;
  district?: string | null;
  marketMandi?: string | null;
  varietyType?: string | null;
  sellingUnit?: string | null;
  officialMandiModalPriceInr?: number | null;
  illustrativeFarmerListingReferenceInr?: number | null;
  officialPriceDate?: string | null;
  notes?: string | null;
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

export interface FilterOptionsData {
  states: string[];
  districtsByState: Record<string, string[]>;
  allDistricts: string[];
}

export interface FilterOptionsResponse {
  success: boolean;
  data: FilterOptionsData;
}

export interface MarketplaceQueryParams {
  search?: string;
  categoryId?: string;
  location?: string;
  state?: string;
  district?: string;
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
  district?: string | null;
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

export const SHIPMENT_PROGRESS: Record<ShipmentStatus, number> = {
  CREATED: 0.05,
  PICKUP_PENDING: 0.15,
  PICKED_UP: 0.3,
  IN_TRANSIT: 0.6,
  OUT_FOR_DELIVERY: 0.85,
  DELIVERED: 1.0,
  FAILED: 0.6,
  CANCELLED: 0.0,
};

export interface RouteGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [lon, lat]
}

export interface RouteData {
  geometry: RouteGeometry;
  distanceKm: number;
  durationHours: number;
  source: 'osrm' | 'cached' | 'fallback';
}

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

export const API_BASE_URL =
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

export function parseApiError(res: Response, errorData: any, fallbackMessage: string): string {
  if (res.status === 429) {
    return 'Too many rapid requests. Please pause for a moment and try again.';
  }
  const rawMsg = errorData?.error?.message || errorData?.message;
  if (typeof rawMsg === 'string' && (rawMsg.includes('ThrottlerException') || rawMsg.includes('Too Many Requests'))) {
    return 'Too many rapid requests. Please pause for a moment and try again.';
  }
  return rawMsg || fallbackMessage;
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
  if (params.state?.trim()) url.searchParams.set('state', params.state.trim());
  if (params.district?.trim()) url.searchParams.set('district', params.district.trim());
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

export async function fetchMarketplaceFilterOptions(): Promise<FilterOptionsResponse> {
  const res = await fetch(`${API_BASE_URL}/marketplace/products/filter-options`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(parseApiError(res, errorData, 'Failed to fetch filter options'));
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
    throw new Error(parseApiError(res, errorData, 'Failed to fetch cart'));
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
    throw new Error(parseApiError(res, errorData, 'Failed to add item to cart'));
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
    throw new Error(parseApiError(res, errorData, 'Failed to update cart quantity'));
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
    throw new Error(parseApiError(res, errorData, 'Failed to remove item from cart'));
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
    throw new Error(parseApiError(res, errorData, 'Failed to clear cart'));
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
    throw new Error(errorData?.error?.message || errorData?.message || 'Failed to fetch addresses');
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
    throw new Error(errorData?.error?.message || errorData?.message || 'Failed to create address');
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
    throw new Error(errorData?.error?.message || errorData?.message || 'Failed to create order');
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
    throw new Error(errorData?.error?.message || errorData?.message || 'Failed to fetch orders');
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

export async function fetchRoute(params: {
  originLat?: number;
  originLon?: number;
  destLat?: number;
  destLon?: number;
  originDistrict?: string;
  destDistrict?: string;
}): Promise<RouteData> {
  const url = new URL(`${API_BASE_URL}/logistics/route`);
  if (params.originLat != null) url.searchParams.set('originLat', String(params.originLat));
  if (params.originLon != null) url.searchParams.set('originLon', String(params.originLon));
  if (params.destLat != null) url.searchParams.set('destLat', String(params.destLat));
  if (params.destLon != null) url.searchParams.set('destLon', String(params.destLon));
  if (params.originDistrict) url.searchParams.set('originDistrict', params.originDistrict);
  if (params.destDistrict) url.searchParams.set('destDistrict', params.destDistrict);

  const res = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch transit route');
  }
  const json = await res.json();
  return json.data || json;
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to calculate net realization breakdown');
  }
  return json?.data ?? json;
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to evaluate best time to sell');
  }
  return json?.data ?? json;
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to calculate smart allocation');
  }
  return json?.data ?? json;
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to find matched buyers');
  }
  return json?.data ?? json;
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to find matched seller products');
  }
  return json?.data ?? json;
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

// ---------------------------------------------------------------------------
// Admin & Moderation APIs (M11)
// ---------------------------------------------------------------------------

export interface AdminDashboardData {
  users: {
    total: number;
    farmers: number;
    fpos: number;
    buyers: number;
    admins: number;
    active: number;
    suspended: number;
    deactivated: number;
  };
  marketplace: {
    totalProducts: number;
    active: number;
    outOfStock: number;
    archived: number;
    rejected: number;
    categories: number;
    totalSellers: number;
    verifiedSellers: number;
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
    totalVolume: number;
  };
  payments: {
    total: number;
    byStatus: Record<string, number>;
    totalSettledAmount: number;
  };
  logistics: {
    totalShipments: number;
    byStatus: Record<string, number>;
  };
  moderation: {
    pendingReports: number;
    openReports: number;
    underReviewReports: number;
    resolvedReports: number;
    dismissedReports: number;
    rejectedProducts: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    actorUserId?: string;
    actor?: { id: string; email: string; role: string };
  }>;
}

export interface AdminUser {
  id: string;
  email: string;
  mobile: string | null;
  role: 'FARMER' | 'FPO' | 'BUYER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  createdAt: string;
  updatedAt: string;
  sellerProfile?: {
    id: string;
    sellerType: string;
    businessName: string | null;
    verificationStatus: string;
    farmLocation: string | null;
  } | null;
  buyerProfile?: {
    id: string;
    buyerType: string;
    businessName: string | null;
    verificationStatus: string;
  } | null;
}

export interface AdminSeller {
  id: string;
  sellerType: 'FARMER' | 'FPO';
  businessName: string | null;
  farmLocation: string | null;
  verificationStatus: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    mobile: string | null;
    status: string;
    createdAt: string;
  };
  _count?: {
    products: number;
    ordersReceived: number;
  };
}

export interface AdminProduct {
  id: string;
  name: string;
  description: string;
  price: number | string;
  unit: string;
  status: 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED' | 'REJECTED';
  location: string | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string };
  inventory?: { availableQuantity: number | string; reservedQuantity: number | string } | null;
  images?: Array<{ id: string; url: string; isPrimary: boolean }>;
  seller?: {
    id: string;
    sellerType: string;
    businessName: string | null;
    verificationStatus: string;
    farmLocation: string | null;
    user?: { id: string; email: string; mobile: string | null };
  };
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number | string;
  createdAt: string;
  buyer?: {
    id: string;
    buyerType: string;
    businessName: string | null;
    user?: { id: string; email: string; mobile: string | null };
  };
  seller?: {
    id: string;
    sellerType: string;
    businessName: string | null;
    user?: { id: string; email: string; mobile: string | null };
  };
  payment?: {
    id: string;
    amount: number | string;
    status: string;
    providerReference: string | null;
  } | null;
  shipment?: {
    id: string;
    status: string;
    provider: string;
    trackingNumber: string | null;
  } | null;
  items?: Array<{
    id: string;
    quantity: number | string;
    unitPrice: number | string;
    totalPrice: number | string;
    product: { id: string; name: string; unit: string };
  }>;
}

export interface AdminPayment {
  id: string;
  orderId: string;
  amount: number | string;
  status: string;
  providerReference: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
    totalAmount: number | string;
  };
}

export interface AdminShipment {
  id: string;
  provider: string;
  trackingNumber: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  order?: {
    id: string;
    orderNumber: string;
  };
  events?: Array<{
    id: string;
    status: string;
    location: string | null;
    message: string;
    occurredAt: string;
  }>;
}

export interface AdminReport {
  id: string;
  targetType: 'USER' | 'PRODUCT' | 'ORDER' | 'SELLER';
  targetId: string;
  reason: string;
  description: string | null;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';
  resolutionNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reporter?: { id: string; email: string; role: string };
  reviewedBy?: { id: string; email: string; role: string } | null;
}

export interface AdminAuditLog {
  id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
  actor?: { id: string; email: string; role: string };
}

export interface PaginatedAdminResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export async function fetchAdminDashboard(token?: string): Promise<AdminDashboardData> {
  const res = await fetch(`${API_BASE_URL}/admin/dashboard`, {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch admin dashboard');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminUsers(
  params: { page?: number; limit?: number; search?: string; role?: string; status?: string } = {},
  token?: string,
): Promise<PaginatedAdminResponse<AdminUser>> {
  const url = new URL(`${API_BASE_URL}/admin/users`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.search?.trim()) url.searchParams.set('search', params.search.trim());
  if (params.role) url.searchParams.set('role', params.role);
  if (params.status) url.searchParams.set('status', params.status);

  const res = await fetch(url.toString(), { headers: getAuthHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch users');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function updateAdminUserStatus(
  id: string,
  payload: { status: string; reason?: string },
  token?: string,
): Promise<AdminUser> {
  const res = await fetch(`${API_BASE_URL}/admin/users/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to update user status');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminSellers(
  params: { page?: number; limit?: number; search?: string; sellerType?: string; verificationStatus?: string } = {},
  token?: string,
): Promise<PaginatedAdminResponse<AdminSeller>> {
  const url = new URL(`${API_BASE_URL}/admin/sellers`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.search?.trim()) url.searchParams.set('search', params.search.trim());
  if (params.sellerType) url.searchParams.set('sellerType', params.sellerType);
  if (params.verificationStatus) url.searchParams.set('verificationStatus', params.verificationStatus);

  const res = await fetch(url.toString(), { headers: getAuthHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch sellers');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function verifyAdminSeller(
  id: string,
  payload: { verificationStatus: string; reason?: string },
  token?: string,
): Promise<AdminSeller> {
  const res = await fetch(`${API_BASE_URL}/admin/sellers/${id}/verify`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to verify seller');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminProducts(
  params: { page?: number; limit?: number; search?: string; status?: string; categoryId?: string } = {},
  token?: string,
): Promise<PaginatedAdminResponse<AdminProduct>> {
  const url = new URL(`${API_BASE_URL}/admin/products`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.search?.trim()) url.searchParams.set('search', params.search.trim());
  if (params.status) url.searchParams.set('status', params.status);
  if (params.categoryId) url.searchParams.set('categoryId', params.categoryId);

  const res = await fetch(url.toString(), { headers: getAuthHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch products');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function moderateAdminProduct(
  id: string,
  payload: { status: string; reason?: string },
  token?: string,
): Promise<AdminProduct> {
  const res = await fetch(`${API_BASE_URL}/admin/products/${id}/moderate`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to moderate product');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminOrders(
  params: { page?: number; limit?: number; search?: string; status?: string } = {},
  token?: string,
): Promise<PaginatedAdminResponse<AdminOrder>> {
  const url = new URL(`${API_BASE_URL}/admin/orders`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.search?.trim()) url.searchParams.set('search', params.search.trim());
  if (params.status) url.searchParams.set('status', params.status);

  const res = await fetch(url.toString(), { headers: getAuthHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch orders');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminOrder(id: string, token?: string): Promise<AdminOrder> {
  const res = await fetch(`${API_BASE_URL}/admin/orders/${id}`, {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch order details');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminPayments(
  params: { page?: number; limit?: number; status?: string; search?: string } = {},
  token?: string,
): Promise<PaginatedAdminResponse<AdminPayment>> {
  const url = new URL(`${API_BASE_URL}/admin/payments`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.status) url.searchParams.set('status', params.status);
  if (params.search?.trim()) url.searchParams.set('search', params.search.trim());

  const res = await fetch(url.toString(), { headers: getAuthHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch payments');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminShipments(
  params: { page?: number; limit?: number; status?: string; search?: string; provider?: string } = {},
  token?: string,
): Promise<PaginatedAdminResponse<AdminShipment>> {
  const url = new URL(`${API_BASE_URL}/admin/shipments`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.status) url.searchParams.set('status', params.status);
  if (params.provider) url.searchParams.set('provider', params.provider);
  if (params.search?.trim()) url.searchParams.set('search', params.search.trim());

  const res = await fetch(url.toString(), { headers: getAuthHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch shipments');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminShipment(id: string, token?: string): Promise<AdminShipment> {
  const res = await fetch(`${API_BASE_URL}/admin/shipments/${id}`, {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch shipment details');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminReports(
  params: { page?: number; limit?: number; status?: string; targetType?: string; search?: string } = {},
  token?: string,
): Promise<PaginatedAdminResponse<AdminReport>> {
  const url = new URL(`${API_BASE_URL}/admin/reports`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.status) url.searchParams.set('status', params.status);
  if (params.targetType) url.searchParams.set('targetType', params.targetType);
  if (params.search?.trim()) url.searchParams.set('search', params.search.trim());

  const res = await fetch(url.toString(), { headers: getAuthHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch reports');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function reviewAdminReport(
  id: string,
  payload: { status: string; resolutionNotes?: string },
  token?: string,
): Promise<AdminReport> {
  const res = await fetch(`${API_BASE_URL}/admin/reports/${id}`, {
    method: 'PATCH',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to review report');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function createModerationReport(
  payload: { targetType: string; targetId: string; reason: string; description?: string },
  token?: string,
): Promise<AdminReport> {
  const res = await fetch(`${API_BASE_URL}/reports`, {
    method: 'POST',
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to submit report');
  }
  const json = await res.json();
  return json?.data ?? json;
}

export async function fetchAdminAuditLogs(
  params: { page?: number; limit?: number; action?: string; entityType?: string; entityId?: string } = {},
  token?: string,
): Promise<PaginatedAdminResponse<AdminAuditLog>> {
  const url = new URL(`${API_BASE_URL}/admin/audit-logs`);
  if (params.page) url.searchParams.set('page', params.page.toString());
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  if (params.action) url.searchParams.set('action', params.action);
  if (params.entityType) url.searchParams.set('entityType', params.entityType);
  if (params.entityId) url.searchParams.set('entityId', params.entityId);

  const res = await fetch(url.toString(), { headers: getAuthHeaders(token) });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message || 'Failed to fetch audit logs');
  }
  const json = await res.json();
  return json?.data ?? json;
}

// ---------------------------------------------------------------------------
// Direct Authentication APIs
// ---------------------------------------------------------------------------

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: 'FARMER' | 'FPO' | 'BUYER';
  mobile?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    status?: string;
    name?: string;
  };
}

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Invalid email or password');
  }
  const token = json.data?.accessToken || json.accessToken;
  const user = json.data?.user || json.user;
  if (!token) {
    throw new Error('No authentication token received from server');
  }
  return { token, user };
}

export async function registerUser(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Registration failed');
  }
  // Automatically sign in upon registration to obtain session JWT
  return loginUser({ email: payload.email, password: payload.password });
}

export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
  resetUrl?: string;
}

export async function requestPasswordReset(email: string): Promise<ForgotPasswordResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to request password reset');
  }
  return json?.data ?? json;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to reset password');
  }
  return json?.data ?? json;
}

// ---------------------------------------------------------------------------
// Farmer / Seller Products Management
// ---------------------------------------------------------------------------

export interface SellerProductItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  unit: string;
  status: string;
  varietyType?: string | null;
  notes?: string | null;
  farmerName?: string | null;
  farmName?: string | null;
  state?: string | null;
  district?: string | null;
  location?: string | null;
  sellingUnit?: string | null;
  illustrativeFarmerListingReferenceInr?: number | null;
  primaryImage?: string | null;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  inventory?: {
    availableQuantity: number;
    reservedQuantity: number;
    totalQuantity?: number;
  } | null;
  images?: Array<{
    id: string;
    url: string;
    isPrimary: boolean;
  }>;
}

export interface CreateProductInput {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  unit: 'KG' | 'GRAM' | 'QUINTAL' | 'TONNE' | 'LITER' | 'MILLILITER' | 'PIECE' | 'DOZEN' | 'BOX';
  initialQuantity: number;
  varietyType?: string;
  notes?: string;
  primaryImage?: string;
  location?: string;
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  unit?: 'KG' | 'GRAM' | 'QUINTAL' | 'TONNE' | 'LITER' | 'MILLILITER' | 'PIECE' | 'DOZEN' | 'BOX';
  varietyType?: string;
  notes?: string;
  primaryImage?: string;
  location?: string;
  status?: 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';
}

export async function fetchSellerProducts(
  token?: string,
): Promise<{ success: boolean; data: SellerProductItem[] }> {
  const res = await fetch(`${API_BASE_URL}/seller/products`, {
    headers: getAuthHeaders(token),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.message || 'Failed to fetch seller products');
  }
  return res.json();
}

export async function createProduct(
  data: CreateProductInput,
  token?: string,
): Promise<{ success: boolean; data: SellerProductItem }> {
  const res = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = Array.isArray(json?.message)
      ? json.message.join(', ')
      : json?.message || 'Failed to create product';
    throw new Error(errorMsg);
  }
  return { success: true, data: json?.data ?? json };
}

export async function updateProduct(
  id: string,
  data: UpdateProductInput,
  token?: string,
): Promise<{ success: boolean; data: SellerProductItem }> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = Array.isArray(json?.message)
      ? json.message.join(', ')
      : json?.message || 'Failed to update product';
    throw new Error(errorMsg);
  }
  return { success: true, data: json?.data ?? json };
}

export async function deleteProduct(
  id: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to delete product');
  }
  return { success: true };
}

export async function updateProductInventory(
  id: string,
  data: { availableQuantity?: number; reservedQuantity?: number },
  token?: string,
): Promise<{ success: boolean; data: any }> {
  const res = await fetch(`${API_BASE_URL}/products/${id}/inventory`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify(data),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to update inventory');
  }
  return { success: true, data: json?.data ?? json };
}

export async function uploadProductImage(
  productId: string,
  file: File,
  token?: string,
): Promise<{ success: boolean; data: any }> {
  const formData = new FormData();
  formData.append('file', file);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/products/${productId}/images`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to upload product image');
  }
  return { success: true, data: json?.data ?? json };
}

export async function deleteProductImage(
  productId: string,
  imageId: string,
  token?: string,
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE_URL}/products/${productId}/images/${imageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to delete product image');
  }
  return { success: true };
}
// ---------------------------------------------------------------------------
// Unified Market Intelligence Decision Support APIs (Modules A, B, C)
// ---------------------------------------------------------------------------

export interface LocalMandiCandidate {
  mandiId: string;
  marketOption: 'A' | 'B' | 'C' | string;
  marketName: string;
  state: string;
  district: string;
  commodity: string;
  category: string;
  variety: string;
  minPrice: number;
  modalPrice: number;
  maxPrice: number;
  priceDate: string;
  marketArrivalsTonnes: number;
  roadDistanceKm: number;
  freightPerQuintal: number;
  handlingPerQuintal: number;
  loadingPerQuintal: number;
  totalDeductionsPerQuintal: number;
  estimatedNetRealizationPerQuintal: number;
  totalNetRealization: number;
  transitDays: number;
  rank: number;
  isRecommended: boolean;
  economicTradeoff: string;
}

export interface FarmerMandiIntelligenceResult {
  farmerOrigin: {
    state: string;
    district: string;
    addressLine?: string;
    source: 'REGISTERED_ADDRESS' | 'FARM_LOCATION' | 'EXPLICIT_QUERY' | 'DEFAULT_DEMO';
  };
  commodity: string;
  quantityQuintals: number;
  candidates: LocalMandiCandidate[];
  recommendedMandi: LocalMandiCandidate | null;
  recommendationRationale: string;
  calculationFormula: string;
  generatedAt: string;
}

export async function getFarmerMandiIntelligence(
  params: {
    commodity: string;
    quantityQuintals?: number;
    state?: string;
    district?: string;
  },
  token?: string,
): Promise<FarmerMandiIntelligenceResult> {
  const q = new URLSearchParams();
  if (params.commodity) q.set('commodity', params.commodity);
  if (params.quantityQuintals) q.set('quantityQuintals', String(params.quantityQuintals));
  if (params.state) q.set('state', params.state);
  if (params.district) q.set('district', params.district);

  const res = await fetch(`${API_BASE_URL}/ai/mandi-intelligence?${q.toString()}`, {
    headers: getAuthHeaders(token),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to fetch local mandi intelligence');
  }
  return json?.data ?? json;
}

export interface EvaluatedBulkRfq {
  rfqId: string;
  scenario: 'A' | 'B' | 'C' | 'D' | string;
  buyerName: string;
  buyerType: string;
  buyerEmail?: string;
  commodity: string;
  requiredQuantity: number;
  fpoAvailableCapacity: number;
  capacityStatus: 'FULLY_FULFILLABLE' | 'PARTIALLY_FULFILLABLE' | 'NOT_FEASIBLE';
  targetPriceInrPerQuintal: number;
  deliveryCity: string;
  deliveryState: string;
  maxDistanceKm: number;
  roadDistanceKm: number;
  isDistanceFeasible: boolean;
  freightInrPerQuintal: number;
  fixedLaneChargeInr: number;
  fixedChargePerQuintal: number;
  loadingInrPerQuintal: number;
  handlingInrPerQuintal: number;
  insuranceInrPerQuintal: number;
  estimatedLogisticsCostPerQuintal: number;
  estimatedNetPerQuintal: number;
  totalPotentialNetRevenue: number;
  totalEstimatedNetRealization?: number;
  qualityRequirements: string;
  notes: string;
  rank: number;
  isEconomicallyRecommended: boolean;
  tradeoffExplanation: string;
}

export interface FpoBulkIntelligenceResult {
  fpo: {
    id: string;
    name: string;
    state: string;
    district: string;
  };
  commodity: string;
  fpoCapacityQuintals: number;
  rfqs: EvaluatedBulkRfq[];
  recommendedRfq: EvaluatedBulkRfq | null;
  sideBySideComparisonSummary: string;
  tradeoffs: string[];
  generatedAt: string;
}

export async function getFpoBulkIntelligence(
  fpoId: string,
  commodity?: string,
  token?: string,
): Promise<FpoBulkIntelligenceResult> {
  const q = new URLSearchParams();
  if (commodity) q.set('commodity', commodity);

  const res = await fetch(
    `${API_BASE_URL}/ai/fpo-bulk-intelligence/${encodeURIComponent(fpoId)}${q.toString() ? `?${q.toString()}` : ''}`,
    {
      headers: getAuthHeaders(token),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to fetch FPO bulk buyer intelligence');
  }
  return json?.data ?? json;
}

export interface LandedCostBreakdown {
  freightPerQuintal: number;
  fixedChargePerQuintal: number;
  handlingPerQuintal: number;
  loadingPerQuintal: number;
  insurancePerQuintal: number;
}

export interface ProductLandedCostItem {
  productId: string;
  productName: string;
  category: string;
  varietyType?: string;
  farmerName: string;
  farmName?: string;
  sellerBusinessName?: string;
  primaryImage?: string;
  originState: string;
  originDistrict: string;
  originLocationDisplay: string;
  availableQuantity: number;
  unit: string;
  roadDistanceKm: number;
  productPricePerQuintal: number;
  logisticsCostPerQuintal: number;
  totalLandedCostPerQuintal: number;
  totalLandedOrderCost: number;
  costBreakdown: LandedCostBreakdown;
  rankByLandedCost: number;
  rankByListPrice: number;
  isEconomicallyRecommended: boolean;
  economicNote: string;
  laneType: 'LOCAL' | 'INTRA_STATE' | 'INTER_STATE' | 'FALLBACK_RATE_CARD';
  matchType: 'EXACT' | 'CARRIER_RATE_CARD';
}

export interface MarketplaceLandedCostResult {
  buyerDestination: {
    state: string;
    city: string;
    district: string;
    source: string;
  };
  orderQuantityQuintals: number;
  products: ProductLandedCostItem[];
  recommendedProduct: ProductLandedCostItem | null;
  calculationFormula: string;
  summaryExplanation: string;
  generatedAt: string;
}

export async function getMarketplaceLandedCost(
  payload: {
    destinationCity?: string;
    destinationState?: string;
    commodity?: string;
    quantityQuintals?: number;
  },
  token?: string,
): Promise<MarketplaceLandedCostResult> {
  const res = await fetch(`${API_BASE_URL}/ai/marketplace-landed-cost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(token),
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'Failed to evaluate marketplace landed cost');
  }
  return json?.data ?? json;
}
