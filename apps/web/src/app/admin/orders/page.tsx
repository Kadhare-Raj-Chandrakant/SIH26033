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
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B] flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-[#233D22]" />
            <span>Order Oversight & Settlement Release</span>
          </h1>
          <p className="text-xs text-[#5D6352] mt-0.5">Inspect full trade lifecycles, contracted lots, weighbridge receipts, and escrow status</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5D6352] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order number (e.g. ORD-1726000000-1234)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] placeholder-[#8A8E82] focus:outline-none focus:border-[#233D22]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] text-xs font-semibold rounded transition-colors shrink-0"
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
            className="px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
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
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">Loading trade orders...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#9A3412]">
            {error instanceof Error ? error.message : 'Failed to load orders'}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">No orders match the specified filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F0E6] border-b border-[#DFD8CB] text-[10px] text-[#5D6352] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Order Number</th>
                  <th className="py-3 px-4">Buyer Entity</th>
                  <th className="py-3 px-4">Producer / Collective</th>
                  <th className="py-3 px-4">Gross Trade Amount</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4">Contract Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFD8CB] text-[#1E221B]">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-[#F4F0E6]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#1E221B] font-mono">{o.orderNumber}</div>
                      <div className="text-[10px] text-[#5D6352]">
                        {o.items?.length || 0} contracted lot(s)
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#1E221B]">{o.buyer?.businessName || o.buyer?.user?.email || 'Buyer'}</div>
                      <span className="text-[10px] text-[#5D6352] block">{o.buyer?.buyerType}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-[#1E221B]">{o.seller?.businessName || o.seller?.user?.email || 'Seller'}</div>
                      <span className="text-[10px] text-[#5D6352] block">{o.seller?.sellerType}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#1E221B]">
                      ₹{Number(o.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          o.status === 'DELIVERED' || o.status === 'SETTLED'
                            ? 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                            : o.status === 'SHIPPED' || o.status === 'PROCESSING'
                            ? 'bg-[#F4F0E6] text-[#233D22] border-[#DFD8CB]'
                            : o.status === 'CONFIRMED'
                            ? 'bg-[#F4F0E6] text-[#1E221B] border-[#DFD8CB]'
                            : o.status === 'CANCELLED'
                            ? 'bg-[#9A3412]/10 text-[#9A3412] border-[#9A3412]/20'
                            : 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5D6352] text-[11px] font-mono">
                      {new Date(o.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspectOrder(o.id)}
                        disabled={isLoadingDetail}
                        className="px-2.5 py-1 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-[11px] font-semibold rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3 h-3 text-[#233D22]" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-3.5 border-t border-[#DFD8CB] bg-[#F4F0E6]/50 flex items-center justify-between text-xs text-[#5D6352]">
          <div>
            Showing <span className="font-bold text-[#1E221B]">{orders.length}</span> of{' '}
            <span className="font-bold text-[#1E221B]">{meta.total}</span> orders
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 bg-[#FCFAF6] hover:bg-[#EFE9DC] border border-[#DFD8CB] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E221B] rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-[#1E221B] text-xs">
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="p-1 bg-[#FCFAF6] hover:bg-[#EFE9DC] border border-[#DFD8CB] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E221B] rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD8CB] mb-4">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1E221B] flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#233D22]" />
                  <span>Order Inspection: {selectedOrder.orderNumber}</span>
                </h2>
                <p className="text-xs text-[#5D6352] mt-0.5">
                  Contract recorded on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 hover:bg-[#F4F0E6] rounded text-[#5D6352] hover:text-[#1E221B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#1E221B]">
              {/* Status & Amount summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 bg-[#F4F0E6] rounded border border-[#DFD8CB]">
                <div>
                  <span className="text-[#5D6352] block text-[10px] uppercase font-bold tracking-wider">Order Status</span>
                  <span className="font-bold text-[#1E221B]">{selectedOrder.status}</span>
                </div>
                <div>
                  <span className="text-[#5D6352] block text-[10px] uppercase font-bold tracking-wider">Trade Amount</span>
                  <span className="font-bold text-[#233D22]">
                    ₹{Number(selectedOrder.totalAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[#5D6352] block text-[10px] uppercase font-bold tracking-wider">Escrow Settlement</span>
                  <span className="font-bold text-[#BD8728]">
                    {selectedOrder.payment?.status || 'PENDING'}
                  </span>
                </div>
                <div>
                  <span className="text-[#5D6352] block text-[10px] uppercase font-bold tracking-wider">Consignment</span>
                  <span className="font-bold text-[#1E221B]">
                    {selectedOrder.shipment?.status || 'UNASSIGNED'}
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div>
                <h3 className="font-bold text-[#1E221B] mb-2 uppercase text-[10px] tracking-wider">
                  Contracted Produce Batches
                </h3>
                <div className="divide-y divide-[#DFD8CB] border border-[#DFD8CB] rounded overflow-hidden">
                  {selectedOrder.items?.map((item) => (
                    <div key={item.id} className="p-2.5 flex items-center justify-between bg-[#FCFAF6]">
                      <div>
                        <span className="font-semibold text-[#1E221B]">{item.product.name}</span>
                        <span className="text-[#5D6352] block text-[11px]">
                          {Number(item.quantity)} {item.product.unit} @ ₹{Number(item.unitPrice)} / {item.product.unit}
                        </span>
                      </div>
                      <span className="font-bold text-[#1E221B]">
                        ₹{Number(item.totalPrice).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-[#F4F0E6] rounded border border-[#DFD8CB]">
                  <span className="font-bold text-[#1E221B] block mb-0.5">Procuring Buyer</span>
                  <p className="text-[#1E221B]">{selectedOrder.buyer?.businessName || 'Direct Institutional Buyer'}</p>
                  <p className="text-[#5D6352] text-[11px]">{selectedOrder.buyer?.user?.email}</p>
                </div>
                <div className="p-3 bg-[#F4F0E6] rounded border border-[#DFD8CB]">
                  <span className="font-bold text-[#1E221B] block mb-0.5">Fulfilling Producer</span>
                  <p className="text-[#1E221B]">{selectedOrder.seller?.businessName || 'Accredited Farmer/FPO'}</p>
                  <p className="text-[#5D6352] text-[11px]">
                    {selectedOrder.seller?.sellerType} • {selectedOrder.seller?.user?.email}
                  </p>
                </div>
              </div>

              {/* Logistics & Tracking */}
              {selectedOrder.shipment && (
                <div className="p-3 bg-[#F4F0E6] rounded border border-[#DFD8CB]">
                  <span className="font-bold text-[#1E221B] block mb-0.5">Logistics & Telematics Reference</span>
                  <p className="text-[#5D6352]">
                    Carrier: <span className="text-[#1E221B] font-semibold">{selectedOrder.shipment.provider}</span> • Tracking:{' '}
                    <span className="text-[#233D22] font-mono font-bold">
                      {selectedOrder.shipment.trackingNumber || 'Pending'}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#DFD8CB] flex justify-end">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-1.5 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-xs font-semibold rounded transition-colors"
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
