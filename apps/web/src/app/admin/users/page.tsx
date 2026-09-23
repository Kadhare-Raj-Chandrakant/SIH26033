'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Edit3,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { fetchAdminUsers, updateAdminUserStatus, AdminUser } from '@/lib/api';

export default function AdminUsersPage() {
  const { token, user: currentAdmin } = useAuth();
  const mounted = useIsMounted();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Status update modal state
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'>('ACTIVE');
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
    queryKey: ['admin-users', page, activeSearch, role, status],
    queryFn: () =>
      fetchAdminUsers(
        {
          page,
          limit: 10,
          search: activeSearch || undefined,
          role: role || undefined,
          status: status || undefined,
        },
        token || undefined,
      ),
    enabled: mounted && !!token && currentAdmin?.role === 'ADMIN',
  });

  const users = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleOpenStatusModal = (u: AdminUser) => {
    setSelectedUser(u);
    setNewStatus(u.status);
    setReason('');
    setUpdateError(null);
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !token) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await updateAdminUserStatus(selectedUser.id, { status: newStatus, reason }, token);
      setSelectedUser(null);
      refetch();
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B] flex items-center gap-2">
            <Users className="w-5 h-5 text-[#233D22]" />
            <span>User Account Governance</span>
          </h1>
          <p className="text-xs text-[#5D6352] mt-0.5">Filter, audit, and moderate participant buyer, farmer, and FPO accounts</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5D6352] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by email or mobile..."
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
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
          >
            <option value="">All Roles</option>
            <option value="FARMER">Farmer</option>
            <option value="FPO">FPO</option>
            <option value="BUYER">Buyer</option>
            <option value="ADMIN">Admin</option>
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">Loading participant accounts...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#9A3412]">
            {error instanceof Error ? error.message : 'Error loading users'}
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">No participant accounts match query criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F0E6] border-b border-[#DFD8CB] text-[10px] text-[#5D6352] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Profiles</th>
                  <th className="py-3 px-4">Registered Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFD8CB] text-[#1E221B]">
                {users.map((u) => {
                  const isCurrentAdmin = u.id === currentAdmin?.id;
                  return (
                    <tr key={u.id} className="hover:bg-[#F4F0E6]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#1E221B]">{u.email}</div>
                        <div className="text-[11px] text-[#5D6352]">{u.mobile || 'No mobile linked'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            u.role === 'ADMIN'
                              ? 'bg-[#233D22] text-[#F7F5EE] border-[#233D22]'
                              : u.role === 'FARMER'
                              ? 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                              : u.role === 'FPO'
                              ? 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                              : 'bg-[#F4F0E6] text-[#5D6352] border-[#DFD8CB]'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            u.status === 'ACTIVE'
                              ? 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                              : u.status === 'SUSPENDED'
                              ? 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                              : 'bg-[#9A3412]/10 text-[#9A3412] border-[#9A3412]/20'
                          }`}
                        >
                          {u.status === 'ACTIVE' && <CheckCircle className="w-2.5 h-2.5" />}
                          {u.status === 'SUSPENDED' && <AlertTriangle className="w-2.5 h-2.5" />}
                          {u.status === 'DEACTIVATED' && <XCircle className="w-2.5 h-2.5" />}
                          {u.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5D6352] text-[11px]">
                        {u.sellerProfile ? (
                          <div className="text-[#1E221B]">
                            {u.sellerProfile.businessName || 'Seller Profile'}
                            <span className="text-[#5D6352] block text-[10px]">
                              {u.sellerProfile.sellerType} • {u.sellerProfile.verificationStatus}
                            </span>
                          </div>
                        ) : u.buyerProfile ? (
                          <div className="text-[#1E221B]">
                            {u.buyerProfile.businessName || 'Buyer Profile'}
                            <span className="text-[#5D6352] block text-[10px]">{u.buyerProfile.buyerType}</span>
                          </div>
                        ) : (
                          <span className="text-[#8A8E82]">Unlinked</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#5D6352] text-[11px] font-mono">
                        {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenStatusModal(u)}
                          disabled={isCurrentAdmin}
                          className="px-2.5 py-1 bg-[#F4F0E6] hover:bg-[#EFE9DC] disabled:opacity-40 disabled:cursor-not-allowed text-[#1E221B] border border-[#DFD8CB] text-[11px] font-semibold rounded transition-colors inline-flex items-center gap-1.5"
                          title={isCurrentAdmin ? 'Self-status modification restricted' : 'Modify account status'}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Status</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-3.5 border-t border-[#DFD8CB] bg-[#F4F0E6]/50 flex items-center justify-between text-xs text-[#5D6352]">
          <div>
            Showing <span className="font-bold text-[#1E221B]">{users.length}</span> of{' '}
            <span className="font-bold text-[#1E221B]">{meta.total}</span> participants
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

      {/* Moderation Status Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md p-6 max-w-md w-full">
            <h2 className="text-base font-serif font-bold text-[#1E221B] mb-1">Modify Account Status</h2>
            <p className="text-xs text-[#5D6352] mb-4">
              Target User: <span className="text-[#1E221B] font-semibold">{selectedUser.email}</span>
            </p>

            {updateError && (
              <div className="mb-4 p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 rounded text-xs text-[#9A3412]">
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdateStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E221B] mb-1">New Account Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED')}
                  className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                >
                  <option value="ACTIVE">ACTIVE (Full access)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporary restriction)</option>
                  <option value="DEACTIVATED">DEACTIVATED (Account deactivated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E221B] mb-1">
                  Administrative Reason / Audit Note <span className="text-[#9A3412]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide detailed rationale for audit trail compliance..."
                  className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] placeholder-[#8A8E82] focus:outline-none focus:border-[#233D22]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DFD8CB]">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3.5 py-1.5 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-xs font-semibold rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 bg-[#233D22] hover:bg-[#1E331D] disabled:opacity-50 text-[#F7F5EE] text-xs font-semibold rounded transition-colors"
                >
                  {isUpdating ? 'Recording Audit...' : 'Confirm Status Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
