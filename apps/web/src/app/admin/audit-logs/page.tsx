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
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#233D22]" />
            <span>Immutable Governance Audit Trail</span>
          </h1>
          <p className="text-xs text-[#5D6352] mt-0.5">Append-only log of privileged actions, administrative provenance, and entity state diffs</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5D6352] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by target entity ID (UUID)..."
              value={entityIdInput}
              onChange={(e) => setEntityIdInput(e.target.value)}
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
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
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
            className="px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
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
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">Loading immutable audit records...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#9A3412]">
            {error instanceof Error ? error.message : 'Failed to load audit logs'}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">No audit records match the filter criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F0E6] border-b border-[#DFD8CB] text-[10px] text-[#5D6352] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Actor Provenance</th>
                  <th className="py-3 px-4">Audit Rationale</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">State Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFD8CB] text-[#1E221B]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F4F0E6]/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F4F0E6] text-[#233D22] border border-[#DFD8CB]">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#1E221B]">{log.entityType}</div>
                      <span className="text-[10px] font-mono text-[#5D6352] truncate block max-w-[140px]">
                        {log.entityId}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[11px]">
                      <div className="text-[#1E221B] font-medium">
                        {log.actor?.email || 'Authenticated Admin'}
                      </div>
                      <span className="text-[10px] font-mono text-[#8A8E82]">{log.actorUserId}</span>
                    </td>
                    <td className="py-3 px-4 text-[#5D6352] text-[11px] max-w-[240px]">
                      <span className="line-clamp-2">{log.reason || 'No audit reason recorded'}</span>
                    </td>
                    <td className="py-3 px-4 text-[#5D6352] text-[11px] shrink-0 font-mono">
                      {new Date(log.createdAt).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-[11px] font-semibold rounded transition-colors inline-flex items-center gap-1.5"
                      >
                        <Code className="w-3 h-3 text-[#233D22]" />
                        <span>State Diff</span>
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
            Showing <span className="font-bold text-[#1E221B]">{logs.length}</span> of{' '}
            <span className="font-bold text-[#1E221B]">{meta.total}</span> audit records
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

      {/* State Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md p-6 max-w-2xl w-full my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD8CB] mb-4">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1E221B] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#233D22]" />
                  <span>Audit Record: [{selectedLog.action}]</span>
                </h2>
                <p className="text-xs text-[#5D6352] mt-0.5">
                  Actor: <span className="text-[#1E221B] font-mono">{selectedLog.actor?.email || selectedLog.actorUserId}</span> • Target:{' '}
                  <span className="text-[#233D22] font-mono font-bold">
                    {selectedLog.entityType}:{selectedLog.entityId}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 hover:bg-[#F4F0E6] rounded text-[#5D6352] hover:text-[#1E221B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#F4F0E6] rounded border border-[#DFD8CB]">
                <span className="text-[#5D6352] block text-[10px] uppercase font-bold tracking-wider mb-1">
                  Administrative Reason
                </span>
                <p className="text-[#1E221B]">{selectedLog.reason || 'None provided'}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-[#5D6352] font-bold block mb-1.5 uppercase text-[10px] tracking-wider">
                    Previous State
                  </span>
                  <pre className="p-3 bg-[#F4F0E6] border border-[#DFD8CB] rounded text-[11px] font-mono text-[#5D6352] overflow-x-auto max-h-56">
                    {selectedLog.previousState
                      ? JSON.stringify(selectedLog.previousState, null, 2)
                      : '// No previous state recorded'}
                  </pre>
                </div>

                <div>
                  <span className="text-[#233D22] font-bold block mb-1.5 uppercase text-[10px] tracking-wider">
                    New Mutated State
                  </span>
                  <pre className="p-3 bg-[#F4F0E6] border border-[#DFD8CB] rounded text-[11px] font-mono text-[#233D22] overflow-x-auto max-h-56">
                    {selectedLog.newState
                      ? JSON.stringify(selectedLog.newState, null, 2)
                      : '// No new state recorded'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-[#DFD8CB] flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-xs font-semibold rounded transition-colors"
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
