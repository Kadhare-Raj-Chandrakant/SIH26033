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
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#233D22]" />
            <span>Producer & Collective Oversight</span>
          </h1>
          <p className="text-xs text-[#5D6352] mt-0.5">Manage farmer and FPO accreditation, compliance documents, and active inventory</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5D6352] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search farm name, location, email..."
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
            value={sellerType}
            onChange={(e) => {
              setSellerType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
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
            className="px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
          >
            <option value="">All Verification States</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="PENDING">PENDING</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">Loading producer directory...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#9A3412]">
            {error instanceof Error ? error.message : 'Failed to load sellers'}
          </div>
        ) : sellers.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">No producers found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F0E6] border-b border-[#DFD8CB] text-[10px] text-[#5D6352] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Producer / Business</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Accreditation</th>
                  <th className="py-3 px-4">Trading Activity</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFD8CB] text-[#1E221B]">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F4F0E6]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#1E221B]">{s.businessName || 'Unnamed Farm/FPO'}</div>
                      <div className="text-[11px] text-[#5D6352]">{s.user.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          s.sellerType === 'FPO'
                            ? 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                            : 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                        }`}
                      >
                        {s.sellerType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5D6352] text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#233D22]" />
                        {s.farmLocation || 'Unspecified'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          s.verificationStatus === 'VERIFIED'
                            ? 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                            : s.verificationStatus === 'PENDING'
                            ? 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                            : 'bg-[#9A3412]/10 text-[#9A3412] border-[#9A3412]/20'
                        }`}
                      >
                        {s.verificationStatus === 'VERIFIED' && <CheckCircle className="w-2.5 h-2.5" />}
                        {s.verificationStatus === 'PENDING' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {s.verificationStatus === 'REJECTED' && <XCircle className="w-2.5 h-2.5" />}
                        {s.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#5D6352]">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1" title="Active Products">
                          <Package className="w-3 h-3 text-[#233D22]" />
                          <span>{s._count?.products || 0} listings</span>
                        </span>
                        <span className="inline-flex items-center gap-1" title="Orders Received">
                          <ShoppingBag className="w-3 h-3 text-[#5D6352]" />
                          <span>{s._count?.ordersReceived || 0} orders</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenVerifyModal(s)}
                        className="px-2.5 py-1 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-[11px] font-semibold rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3 h-3 text-[#233D22]" />
                        <span>Accreditation</span>
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
            Showing <span className="font-bold text-[#1E221B]">{sellers.length}</span> of{' '}
            <span className="font-bold text-[#1E221B]">{meta.total}</span> producers
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

      {/* Verification Modal */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md p-6 max-w-md w-full">
            <h2 className="text-base font-serif font-bold text-[#1E221B] mb-1">Producer Accreditation Review</h2>
            <p className="text-xs text-[#5D6352] mb-4">
              Entity: <span className="text-[#1E221B] font-semibold">{selectedSeller.businessName || selectedSeller.user.email}</span>
            </p>

            {updateError && (
              <div className="mb-4 p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 rounded text-xs text-[#9A3412]">
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdateVerification} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E221B] mb-1">Accreditation Decision</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'VERIFIED' | 'REJECTED' | 'PENDING')}
                  className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                >
                  <option value="VERIFIED">VERIFIED (Approved for direct trade)</option>
                  <option value="PENDING">PENDING (Requires additional documentation)</option>
                  <option value="REJECTED">REJECTED (Accreditation Denied)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E221B] mb-1">
                  Audit Rationale / Mandi Record Reference <span className="text-[#9A3412]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Record document reference numbers, 7/12 land extract validation, or reason for rejection..."
                  className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] placeholder-[#8A8E82] focus:outline-none focus:border-[#233D22]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DFD8CB]">
                <button
                  type="button"
                  onClick={() => setSelectedSeller(null)}
                  className="px-3.5 py-1.5 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-xs font-semibold rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 bg-[#233D22] hover:bg-[#1E331D] disabled:opacity-50 text-[#F7F5EE] text-xs font-semibold rounded transition-colors"
                >
                  {isUpdating ? 'Recording Decision...' : 'Save Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
