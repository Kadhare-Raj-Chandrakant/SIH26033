'use client';

import React, { useState } from 'react';
import {
  Package,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Archive,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Store,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { fetchAdminProducts, moderateAdminProduct, AdminProduct } from '@/lib/api';

export default function AdminProductsPage() {
  const { token, user: currentAdmin } = useAuth();
  const mounted = useIsMounted();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Moderation modal state
  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED' | 'REJECTED'>('ACTIVE');
  const [reason, setReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-products', page, activeSearch, status],
    queryFn: () =>
      fetchAdminProducts(
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

  const products = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleOpenModerateModal = (p: AdminProduct) => {
    setSelectedProduct(p);
    if (p.status === 'REJECTED') {
      setNewStatus('ACTIVE');
    } else if (p.status === 'ACTIVE') {
      setNewStatus('REJECTED');
    } else {
      setNewStatus('ACTIVE');
    }
    setReason('');
    setUpdateError(null);
  };

  const handleModerateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !token) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await moderateAdminProduct(selectedProduct.id, { status: newStatus, reason }, token);
      setSelectedProduct(null);
      refetch();
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to moderate product');
    } finally {
      setIsUpdating(false);
    }
  };

  const getAvailableTransitions = (currentStatus: string) => {
    switch (currentStatus) {
      case 'ACTIVE':
        return [
          { value: 'OUT_OF_STOCK', label: 'OUT OF STOCK' },
          { value: 'ARCHIVED', label: 'ARCHIVED' },
          { value: 'REJECTED', label: 'REJECTED' },
        ];
      case 'OUT_OF_STOCK':
        return [
          { value: 'ACTIVE', label: 'ACTIVE' },
          { value: 'ARCHIVED', label: 'ARCHIVED' },
          { value: 'REJECTED', label: 'REJECTED' },
        ];
      case 'ARCHIVED':
        return [
          { value: 'ACTIVE', label: 'ACTIVE' },
          { value: 'REJECTED', label: 'REJECTED' },
        ];
      case 'REJECTED':
        return [
          { value: 'ACTIVE', label: 'ACTIVE (Re-approve Listing)' },
          { value: 'ARCHIVED', label: 'ARCHIVED' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B] flex items-center gap-2">
            <Package className="w-5 h-5 text-[#233D22]" />
            <span>Produce Listing Moderation</span>
          </h1>
          <p className="text-xs text-[#5D6352] mt-0.5">Audit quality specifications, pricing authenticity, and crop grade compliance</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5D6352] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product title or crop variety..."
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
            <option value="">All Listing Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="OUT_OF_STOCK">OUT OF STOCK</option>
            <option value="ARCHIVED">ARCHIVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">Loading marketplace catalog...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#9A3412]">
            {error instanceof Error ? error.message : 'Failed to load products'}
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">No produce listings match filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F0E6] border-b border-[#DFD8CB] text-[10px] text-[#5D6352] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Commodity / Lot</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price & Available Stock</th>
                  <th className="py-3 px-4">Producer</th>
                  <th className="py-3 px-4">Catalog Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFD8CB] text-[#1E221B]">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F4F0E6]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#1E221B]">{p.name}</div>
                      <div className="text-[11px] text-[#5D6352] line-clamp-1">{p.description}</div>
                    </td>
                    <td className="py-3 px-4 text-[#5D6352] text-[11px]">
                      {p.category?.name || 'Uncategorized'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#1E221B]">
                        ₹{Number(p.price).toFixed(2)} / {p.unit}
                      </div>
                      <div className="text-[11px] text-[#5D6352]">
                        Available: {Number(p.inventory?.availableQuantity || 0)} {p.unit}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-[#1E221B]">
                        <Store className="w-3 h-3 text-[#233D22]" />
                        <span className="font-semibold">{p.seller?.businessName || 'Seller'}</span>
                      </div>
                      <span className="text-[10px] text-[#5D6352] block">
                        {p.seller?.sellerType} • {p.seller?.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          p.status === 'ACTIVE'
                            ? 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                            : p.status === 'OUT_OF_STOCK'
                            ? 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                            : p.status === 'ARCHIVED'
                            ? 'bg-[#F4F0E6] text-[#5D6352] border-[#DFD8CB]'
                            : 'bg-[#9A3412]/10 text-[#9A3412] border-[#9A3412]/20'
                        }`}
                      >
                        {p.status === 'ACTIVE' && <CheckCircle className="w-2.5 h-2.5" />}
                        {p.status === 'OUT_OF_STOCK' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {p.status === 'ARCHIVED' && <Archive className="w-2.5 h-2.5" />}
                        {p.status === 'REJECTED' && <XCircle className="w-2.5 h-2.5" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenModerateModal(p)}
                        className="px-2.5 py-1 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-[11px] font-semibold rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3 h-3 text-[#BD8728]" />
                        <span>Moderate</span>
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
            Showing <span className="font-bold text-[#1E221B]">{products.length}</span> of{' '}
            <span className="font-bold text-[#1E221B]">{meta.total}</span> listings
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

      {/* Product Moderation Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md p-6 max-w-md w-full">
            <h2 className="text-base font-serif font-bold text-[#1E221B] mb-1">Moderate Produce Listing</h2>
            <p className="text-xs text-[#5D6352] mb-4">
              Lot: <span className="text-[#1E221B] font-semibold">{selectedProduct.name}</span>
              <span className="block text-[11px] text-[#5D6352] mt-0.5">
                Current Status: <span className="text-[#BD8728] font-bold">{selectedProduct.status}</span>
              </span>
            </p>

            {updateError && (
              <div className="mb-4 p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 rounded text-xs text-[#9A3412]">
                {updateError}
              </div>
            )}

            <form onSubmit={handleModerateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E221B] mb-1">Action / Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED' | 'REJECTED')}
                  className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                >
                  {getAvailableTransitions(selectedProduct.status).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E221B] mb-1">
                  Moderation Rationale / Assaying Audit Notes <span className="text-[#9A3412]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State clear reasons for rejection, quality dispute resolution, or compliance notes..."
                  className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] placeholder-[#8A8E82] focus:outline-none focus:border-[#233D22]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DFD8CB]">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-3.5 py-1.5 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-xs font-semibold rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 bg-[#233D22] hover:bg-[#1E331D] disabled:opacity-50 text-[#F7F5EE] text-xs font-semibold rounded transition-colors"
                >
                  {isUpdating ? 'Recording Decision...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
