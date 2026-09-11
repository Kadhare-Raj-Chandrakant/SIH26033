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
  items: OrderItemSnapshot[];
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
