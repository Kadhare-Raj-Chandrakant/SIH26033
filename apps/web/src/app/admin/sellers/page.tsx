'use client';

import React, { useState } from 'react';
import {
  Store,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  MapPin,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { fetchAdminSellers, verifyAdminSeller, AdminSeller } from '@/lib/api';

export default function AdminSellersPage() {
  const { token, user: currentAdmin } = useAuth();
  const mounted = useIsMounted();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sellerType, setSellerType] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [page, setPage] = useState(1);

  // Verification modal state
  const [selectedSeller, setSelectedSeller] = useState<AdminSeller | null>(null);
  const [newStatus, setNewStatus] = useState<'VERIFIED' | 'REJECTED' | 'PENDING'>('VERIFIED');
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
    queryKey: ['admin-sellers', page, activeSearch, sellerType, verificationStatus],
    queryFn: () =>
      fetchAdminSellers(
        {
          page,
          limit: 10,
          search: activeSearch || undefined,
          sellerType: sellerType || undefined,
          verificationStatus: verificationStatus || undefined,
        },
        token || undefined,
      ),
    enabled: mounted && !!token && currentAdmin?.role === 'ADMIN',
  });

  const sellers = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleOpenVerifyModal = (s: AdminSeller) => {
    setSelectedSeller(s);
    setNewStatus((s.verificationStatus === 'REJECTED' ? 'VERIFIED' : s.verificationStatus === 'VERIFIED' ? 'PENDING' : 'VERIFIED'));
    setReason('');
    setUpdateError(null);
  };

  const handleUpdateVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeller || !token) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await verifyAdminSeller(selectedSeller.id, { verificationStatus: newStatus, reason }, token);
      setSelectedSeller(null);
      refetch();
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update seller verification status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            Seller & FPO Oversight
          </h1>
          <p className="text-xs text-slate-400">Manage farmer and FPO verification, compliance, and listings</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search farm name, location, email..."
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
            value={sellerType}
            onChange={(e) => {
              setSellerType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Types (Farmer & FPO)</option>
            <option value="FARMER">Farmer</option>
            <option value="FPO">FPO</option>
          </select>

          <select
            value={verificationStatus}
            onChange={(e) => {
              setVerificationStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Verification States</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="PENDING">PENDING</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading sellers directory...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-red-400">
            {error instanceof Error ? error.message : 'Failed to load sellers'}
          </div>
        ) : sellers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No sellers found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Seller / Business</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Verification Status</th>
                  <th className="py-3.5 px-4">Activity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{s.businessName || 'Unnamed Farm/FPO'}</div>
                      <div className="text-[11px] text-slate-500">{s.user.email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.sellerType === 'FPO'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}
                      >
                        {s.sellerType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {s.farmLocation || 'Unspecified'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : s.verificationStatus === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-red-500/10 text-red-400'
                        }`}
                      >
                        {s.verificationStatus === 'VERIFIED' && <CheckCircle className="w-2.5 h-2.5" />}
                        {s.verificationStatus === 'PENDING' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {s.verificationStatus === 'REJECTED' && <XCircle className="w-2.5 h-2.5" />}
                        {s.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-400">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1" title="Active Products">
                          <Package className="w-3 h-3 text-slate-500" />
                          {s._count?.products || 0}
                        </span>
                        <span className="inline-flex items-center gap-1" title="Orders Received">
                          <ShoppingBag className="w-3 h-3 text-slate-500" />
                          {s._count?.ordersReceived || 0}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenVerifyModal(s)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Review KYC
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
            Showing <span className="font-semibold text-slate-200">{sellers.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{meta.total}</span> sellers
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

      {/* Verification Modal */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-base font-bold text-slate-100 mb-1">Seller Verification & KYC Review</h2>
            <p className="text-xs text-slate-400 mb-4">
              Entity: <span className="text-slate-200 font-medium">{selectedSeller.businessName || selectedSeller.user.email}</span>
            </p>

            {updateError && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-800/50 rounded-lg text-xs text-red-300">
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdateVerification} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Verification Decision</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'VERIFIED' | 'REJECTED' | 'PENDING')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="VERIFIED">VERIFIED (Approved for direct trade)</option>
                  <option value="PENDING">PENDING (Requires additional documentation)</option>
                  <option value="REJECTED">REJECTED (Failed KYC / Land record verification)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Audit Rationale / Mandi Record Reference <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Record document reference numbers, 7/12 land extract validation, or reason for rejection..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSeller(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {isUpdating ? 'Recording Decision...' : 'Save Verification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
