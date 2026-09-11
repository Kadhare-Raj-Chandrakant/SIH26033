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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Product Listing Moderation
          </h1>
          <p className="text-xs text-slate-400">Review, approve, reject, or archive marketplace listings</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product title or description..."
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
            <option value="">All Listing Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="OUT_OF_STOCK">OUT OF STOCK</option>
            <option value="ARCHIVED">ARCHIVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading marketplace listings...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-red-400">
            {error instanceof Error ? error.message : 'Failed to load products'}
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No listings found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Commodity / Product</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price & Stock</th>
                  <th className="py-3.5 px-4">Seller</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{p.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{p.description}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {p.category?.name || 'Uncategorized'}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">
                        ₹{Number(p.price).toFixed(2)} / {p.unit}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Stock: {Number(p.inventory?.availableQuantity || 0)} {p.unit}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Store className="w-3 h-3 text-slate-500" />
                        <span className="font-medium">{p.seller?.businessName || 'Seller'}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block">
                        {p.seller?.sellerType} • {p.seller?.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : p.status === 'OUT_OF_STOCK'
                              ? 'bg-amber-500/10 text-amber-400'
                              : p.status === 'ARCHIVED'
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {p.status === 'ACTIVE' && <CheckCircle className="w-2.5 h-2.5" />}
                        {p.status === 'OUT_OF_STOCK' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {p.status === 'ARCHIVED' && <Archive className="w-2.5 h-2.5" />}
                        {p.status === 'REJECTED' && <XCircle className="w-2.5 h-2.5" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenModerateModal(p)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        Moderate
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
            Showing <span className="font-semibold text-slate-200">{products.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{meta.total}</span> listings
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

      {/* Product Moderation Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-base font-bold text-slate-100 mb-1">Moderate Listing</h2>
            <p className="text-xs text-slate-400 mb-4">
              Target Product: <span className="text-slate-200 font-medium">{selectedProduct.name}</span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Current Status: <span className="text-amber-400 font-semibold">{selectedProduct.status}</span>
              </span>
            </p>

            {updateError && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-800/50 rounded-lg text-xs text-red-300">
                {updateError}
              </div>
            )}

            <form onSubmit={handleModerateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Action / Target Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED' | 'REJECTED')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  {getAvailableTransitions(selectedProduct.status).map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Moderation Rationale / Mandi Inspection Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State clear reasons for rejection, quality dispute resolution, or compliance notes..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {isUpdating ? 'Recording Moderation...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
