'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { fetchAdminReports, reviewAdminReport, AdminReport } from '@/lib/api';

export default function AdminReportsPage() {
  const { token, user: currentAdmin } = useAuth();
  const mounted = useIsMounted();

  // Filters
  const [status, setStatus] = useState('');
  const [targetType, setTargetType] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [page, setPage] = useState(1);

  // Review modal state
  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null);
  const [newStatus, setNewStatus] = useState<'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED'>('RESOLVED');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-reports', page, activeSearch, status, targetType],
    queryFn: () =>
      fetchAdminReports(
        {
          page,
          limit: 10,
          search: activeSearch || undefined,
          status: status || undefined,
          targetType: targetType || undefined,
        },
        token || undefined,
      ),
    enabled: mounted && !!token && currentAdmin?.role === 'ADMIN',
  });

  const reports = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleOpenReviewModal = (r: AdminReport) => {
    setSelectedReport(r);
    setNewStatus(r.status === 'OPEN' ? 'UNDER_REVIEW' : 'RESOLVED');
    setResolutionNotes(r.resolutionNotes || '');
    setUpdateError(null);
  };

  const handleReviewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !token) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      await reviewAdminReport(selectedReport.id, { status: newStatus, resolutionNotes }, token);
      setSelectedReport(null);
      refetch();
    } catch (err: unknown) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update report');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B] flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#BD8728]" />
            <span>Dispute & Quality Moderation Queue</span>
          </h1>
          <p className="text-xs text-[#5D6352] mt-0.5">Audit participant reports on lot grade variances, seller fulfillment, and assaying authenticity</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5D6352] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by reason, description, or entity ID..."
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
            <option value="">All Report Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="UNDER_REVIEW">UNDER REVIEW</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>

          <select
            value={targetType}
            onChange={(e) => {
              setTargetType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
          >
            <option value="">All Entity Targets</option>
            <option value="PRODUCT">PRODUCT</option>
            <option value="SELLER">SELLER</option>
            <option value="ORDER">ORDER</option>
            <option value="USER">USER</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">Loading moderation filings...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#9A3412]">
            {error instanceof Error ? error.message : 'Failed to load moderation reports'}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">No moderation reports open in the queue.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F0E6] border-b border-[#DFD8CB] text-[10px] text-[#5D6352] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Entity Type & ID</th>
                  <th className="py-3 px-4">Report Reason</th>
                  <th className="py-3 px-4">Filing Participant</th>
                  <th className="py-3 px-4">Review Status</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFD8CB] text-[#1E221B]">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F4F0E6]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            r.targetType === 'PRODUCT'
                              ? 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                              : r.targetType === 'SELLER'
                              ? 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                              : 'bg-[#F4F0E6] text-[#5D6352] border-[#DFD8CB]'
                          }`}
                        >
                          {r.targetType}
                        </span>
                        <span className="font-mono text-[11px] text-[#5D6352] truncate max-w-[120px]">
                          {r.targetId}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#1E221B]">{r.reason}</div>
                      {r.description && (
                        <p className="text-[11px] text-[#5D6352] line-clamp-1">{r.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[11px] text-[#5D6352]">
                      <div className="text-[#1E221B]">{r.reporter?.email || 'Anonymous'}</div>
                      <span className="text-[10px] text-[#8A8E82]">{r.reporter?.role}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          r.status === 'RESOLVED'
                            ? 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                            : r.status === 'UNDER_REVIEW'
                            ? 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                            : r.status === 'OPEN'
                            ? 'bg-[#9A3412]/10 text-[#9A3412] border-[#9A3412]/20'
                            : 'bg-[#F4F0E6] text-[#5D6352] border-[#DFD8CB]'
                        }`}
                      >
                        {r.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5D6352] text-[11px] font-mono">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenReviewModal(r)}
                        className="px-2.5 py-1 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-[11px] font-semibold rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3 h-3 text-[#BD8728]" />
                        <span>Adjudicate</span>
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
            Showing <span className="font-bold text-[#1E221B]">{reports.length}</span> of{' '}
            <span className="font-bold text-[#1E221B]">{meta.total}</span> filings
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

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md p-6 max-w-md w-full">
            <h2 className="text-base font-serif font-bold text-[#1E221B] mb-1">Adjudicate Dispute Filing</h2>
            <p className="text-xs text-[#5D6352] mb-3">
              Target: <span className="text-[#1E221B] font-semibold">{selectedReport.targetType}</span> • ID:{' '}
              <span className="font-mono text-[#233D22]">{selectedReport.targetId}</span>
            </p>

            <div className="p-3 bg-[#F4F0E6] rounded border border-[#DFD8CB] mb-4 text-xs">
              <span className="text-[#5D6352] block text-[10px] font-bold uppercase tracking-wider">Reported Issue:</span>
              <p className="font-semibold text-[#1E221B] mt-0.5">{selectedReport.reason}</p>
              {selectedReport.description && (
                <p className="text-[#5D6352] text-[11px] mt-1">{selectedReport.description}</p>
              )}
            </div>

            {updateError && (
              <div className="mb-4 p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 rounded text-xs text-[#9A3412]">
                {updateError}
              </div>
            )}

            <form onSubmit={handleReviewReport} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1E221B] mb-1">Decision Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED')}
                  className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                >
                  <option value="UNDER_REVIEW">UNDER REVIEW (Investigation ongoing)</option>
                  <option value="RESOLVED">RESOLVED (Action taken / Issue mitigated)</option>
                  <option value="DISMISSED">DISMISSED (Invalid flag / Legitimate trade)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E221B] mb-1">
                  Resolution Notes / Action Summary <span className="text-[#9A3412]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record investigation findings, seller contact notes, or dismiss reason..."
                  className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] placeholder-[#8A8E82] focus:outline-none focus:border-[#233D22]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DFD8CB]">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
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
