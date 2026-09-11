'use client';

import React, { useState } from 'react';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  Code,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { fetchAdminAuditLogs, AdminAuditLog } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const { token, user: currentAdmin } = useAuth();
  const mounted = useIsMounted();

  // Filters
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityIdInput, setEntityIdInput] = useState('');
  const [activeEntityId, setActiveEntityId] = useState('');
  const [page, setPage] = useState(1);

  // Diff inspection modal
  const [selectedLog, setSelectedLog] = useState<AdminAuditLog | null>(null);

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-audit-logs', page, activeEntityId, action, entityType],
    queryFn: () =>
      fetchAdminAuditLogs(
        {
          page,
          limit: 10,
          action: action || undefined,
          entityType: entityType || undefined,
          entityId: activeEntityId || undefined,
        },
        token || undefined,
      ),
    enabled: mounted && !!token && currentAdmin?.role === 'ADMIN',
  });

  const logs = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveEntityId(entityIdInput.trim());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Append-Only Administrative Audit Trail
          </h1>
          <p className="text-xs text-slate-400">Immutable ledger of privileged mutations, actor provenance, and state transitions</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by target entity ID (UUID)..."
              value={entityIdInput}
              onChange={(e) => setEntityIdInput(e.target.value)}
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
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Privileged Actions</option>
            <option value="USER_STATUS_UPDATE">USER_STATUS_UPDATE</option>
            <option value="SELLER_VERIFICATION">SELLER_VERIFICATION</option>
            <option value="PRODUCT_MODERATION">PRODUCT_MODERATION</option>
            <option value="REPORT_RESOLUTION">REPORT_RESOLUTION</option>
          </select>

          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Entity Types</option>
            <option value="USER">USER</option>
            <option value="SELLER">SELLER</option>
            <option value="PRODUCT">PRODUCT</option>
            <option value="ORDER">ORDER</option>
            <option value="REPORT">REPORT</option>
          </select>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading immutable audit trail...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-red-400">
            {error instanceof Error ? error.message : 'Failed to load audit logs'}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No audit records found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Target Entity</th>
                  <th className="py-3.5 px-4">Actor Provenance</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-200 border border-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">{log.entityType}</div>
                      <span className="text-[10px] font-mono text-slate-500 truncate block max-w-[140px]">
                        {log.entityId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-[11px]">
                      <div className="text-slate-200 font-medium">
                        {log.actor?.email || 'Authenticated Admin'}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">{log.actorUserId}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px] max-w-[240px]">
                      <span className="line-clamp-2">{log.reason || 'No audit reason specified'}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] shrink-0">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <Code className="w-3 h-3 text-emerald-400" />
                        Inspect Diff
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
            Showing <span className="font-semibold text-slate-200">{logs.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{meta.total}</span> audit records
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

      {/* State Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Audit Record [{selectedLog.action}]
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Actor: <span className="text-slate-200 font-mono">{selectedLog.actor?.email || selectedLog.actorUserId}</span> • Target:{' '}
                  <span className="text-emerald-400 font-mono">
                    {selectedLog.entityType}:{selectedLog.entityId}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                <span className="text-slate-500 block text-[10px] mb-1">Administrative Reason</span>
                <p className="text-slate-200">{selectedLog.reason || 'None provided'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 font-semibold block mb-2 uppercase text-[11px] tracking-wider">
                    Previous State
                  </span>
                  <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56">
                    {selectedLog.previousState
                      ? JSON.stringify(selectedLog.previousState, null, 2)
                      : '// No previous state recorded'}
                  </pre>
                </div>

                <div>
                  <span className="text-emerald-400 font-semibold block mb-2 uppercase text-[11px] tracking-wider">
                    New State
                  </span>
                  <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-56">
                    {selectedLog.newState
                      ? JSON.stringify(selectedLog.newState, null, 2)
                      : '// No new state recorded'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
