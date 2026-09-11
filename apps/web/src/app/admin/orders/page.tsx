'use client';

import React, { useState } from 'react';
import {
  ShoppingCart,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  Package,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { fetchAdminOrders, fetchAdminOrder, AdminOrder } from '@/lib/api';

export default function AdminOrdersPage() {
  const { token, user: currentAdmin } = useAuth();
  const mounted = useIsMounted();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Order detail inspection modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-orders', page, activeSearch, status],
    queryFn: () =>
      fetchAdminOrders(
        {
          page,
          limit: 10,
          search: activeSearch || undefined,
          status: status || undefined,
        },
        token || undefined,
      ),
    enabled: mounted && !!token && currentAdmin?.role === 'ADMIN',
  });

  const orders = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleInspectOrder = async (orderId: string) => {
    if (!token) return;
    setIsLoadingDetail(true);
    try {
      const detail = await fetchAdminOrder(orderId, token);
      setSelectedOrder(detail);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to fetch order details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            Order Oversight & Fulfillment
          </h1>
          <p className="text-xs text-slate-400">Inspect full marketplace purchase cycles, items, payments, and shipments</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order number (e.g. ORD-1726000000-1234)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Order Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="RETURNED">RETURNED</option>
            <option value="SETTLED">SETTLED</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading orders...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-red-400">
            {error instanceof Error ? error.message : 'Failed to load orders'}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No orders found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Order Number</th>
                  <th className="py-3.5 px-4">Buyer</th>
                  <th className="py-3.5 px-4">Seller</th>
                  <th className="py-3.5 px-4">Amount</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Placed Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{o.orderNumber}</div>
                      <div className="text-[10px] text-slate-500">
                        {o.items?.length || 0} item(s)
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200">{o.buyer?.businessName || o.buyer?.user?.email || 'Buyer'}</div>
                      <span className="text-[10px] text-slate-500 block">{o.buyer?.buyerType}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-200">{o.seller?.businessName || o.seller?.user?.email || 'Seller'}</div>
                      <span className="text-[10px] text-slate-500 block">{o.seller?.sellerType}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-100">
                      ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          o.status === 'DELIVERED' || o.status === 'SETTLED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : o.status === 'SHIPPED' || o.status === 'PROCESSING'
                              ? 'bg-blue-500/10 text-blue-400'
                              : o.status === 'CONFIRMED'
                                ? 'bg-indigo-500/10 text-indigo-400'
                                : o.status === 'CANCELLED'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-amber-500/10 text-amber-400'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(o.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleInspectOrder(o.id)}
                        disabled={isLoadingDetail}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3 h-3 text-emerald-400" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{orders.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{meta.total}</span> orders
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-slate-300">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  Order #{selectedOrder.orderNumber}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5 text-xs text-slate-300">
              {/* Status & Amount summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                <div>
                  <span className="text-slate-500 block text-[11px]">Order Status</span>
                  <span className="font-bold text-slate-200">{selectedOrder.status}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Total Amount</span>
                  <span className="font-bold text-emerald-400">
                    ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Payment</span>
                  <span className="font-bold text-purple-400">
                    {selectedOrder.payment?.status || 'PENDING'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Shipment</span>
                  <span className="font-bold text-blue-400">
                    {selectedOrder.shipment?.status || 'NOT_CREATED'}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 className="font-semibold text-slate-200 mb-2 uppercase text-[11px] tracking-wider">
                  Purchased Items
                </h3>
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between bg-slate-950/40">
                      <div>
                        <span className="font-semibold text-slate-100">{item.product.name}</span>
                        <span className="text-slate-500 block text-[11px]">
                          {Number(item.quantity)} {item.product.unit} @ ₹{Number(item.unitPrice)} / {item.product.unit}
                        </span>
                      </div>
                      <span className="font-bold text-slate-200">
                        ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="font-semibold text-slate-200 block mb-1">Buyer Information</span>
                  <p className="text-slate-400">{selectedOrder.buyer?.businessName || 'Direct Buyer'}</p>
                  <p className="text-slate-500 text-[11px]">{selectedOrder.buyer?.user?.email}</p>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="font-semibold text-slate-200 block mb-1">Seller Information</span>
                  <p className="text-slate-400">{selectedOrder.seller?.businessName || 'Farmer/FPO'}</p>
                  <p className="text-slate-500 text-[11px]">
                    {selectedOrder.seller?.sellerType} • {selectedOrder.seller?.user?.email}
                  </p>
                </div>
              </div>

              {/* Logistics & Tracking */}
              {selectedOrder.shipment && (
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <span className="font-semibold text-slate-200 block mb-1">Logistics Reference</span>
                  <p className="text-slate-400">
                    Carrier: <span className="text-slate-200 font-medium">{selectedOrder.shipment.provider}</span> • Tracking:{' '}
                    <span className="text-emerald-400 font-mono">
                      {selectedOrder.shipment.trackingNumber || 'Pending'}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
