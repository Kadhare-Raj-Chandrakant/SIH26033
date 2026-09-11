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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Marketplace Moderation & Flag Queue
          </h1>
          <p className="text-xs text-slate-400">Review community reports on commodities, sellers, listings, and orders</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by reason, description, or target ID..."
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
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Targets</option>
            <option value="PRODUCT">PRODUCT</option>
            <option value="SELLER">SELLER</option>
            <option value="ORDER">ORDER</option>
            <option value="USER">USER</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading moderation queue...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-red-400">
            {error instanceof Error ? error.message : 'Failed to load moderation reports'}
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No moderation reports in queue.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Target Type & ID</th>
                  <th className="py-3.5 px-4">Report Reason</th>
                  <th className="py-3.5 px-4">Reporter</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Submitted</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.targetType === 'PRODUCT'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : r.targetType === 'SELLER'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : r.targetType === 'ORDER'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {r.targetType}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 truncate max-w-[120px]">
                          {r.targetId}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{r.reason}</div>
                      {r.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-1">{r.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-400">
                      <div>{r.reporter?.email || 'Anonymous'}</div>
                      <span className="text-[10px] text-slate-500">{r.reporter?.role}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                          r.status === 'RESOLVED'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : r.status === 'UNDER_REVIEW'
                              ? 'bg-blue-500/10 text-blue-400'
                              : r.status === 'OPEN'
                                ? 'bg-amber-500/10 text-amber-400'
                                : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {r.status === 'RESOLVED' && <CheckCircle className="w-2.5 h-2.5" />}
                        {r.status === 'UNDER_REVIEW' && <Clock className="w-2.5 h-2.5" />}
                        {r.status === 'OPEN' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {r.status === 'DISMISSED' && <XCircle className="w-2.5 h-2.5" />}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenReviewModal(r)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <ShieldAlert className="w-3 h-3 text-amber-400" />
                        Review / Resolve
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
            Showing <span className="font-semibold text-slate-200">{reports.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{meta.total}</span> reports
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

      {/* Review Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-base font-bold text-slate-100 mb-1">Review Moderation Report</h2>
            <p className="text-xs text-slate-400 mb-4">
              Target: <span className="text-slate-200 font-medium">{selectedReport.targetType}</span> • ID:{' '}
              <span className="font-mono text-emerald-400">{selectedReport.targetId}</span>
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 mb-4 text-xs">
              <span className="text-slate-500 block text-[10px]">Reported Issue:</span>
              <p className="font-semibold text-slate-200">{selectedReport.reason}</p>
              {selectedReport.description && (
                <p className="text-slate-400 text-[11px] mt-1">{selectedReport.description}</p>
              )}
            </div>

            {updateError && (
              <div className="mb-4 p-3 bg-red-950/50 border border-red-800/50 rounded-lg text-xs text-red-300">
                {updateError}
              </div>
            )}

            <form onSubmit={handleReviewReport} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Action Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED')}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="UNDER_REVIEW">UNDER REVIEW (Investigation ongoing)</option>
                  <option value="RESOLVED">RESOLVED (Action taken / Issue mitigated)</option>
                  <option value="DISMISSED">DISMISSED (Invalid flag / Legitimate listing)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Resolution Notes / Action Summary <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Record investigation findings, seller contact notes, or dismiss reason..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {isUpdating ? 'Saving Decision...' : 'Record Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
