'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { fetchAdminPayments } from '@/lib/api';

export default function AdminPaymentsPage() {
  const { token, user: currentAdmin } = useAuth();
  const mounted = useIsMounted();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-payments', page, activeSearch, status],
    queryFn: () =>
      fetchAdminPayments(
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

  const payments = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B] flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#233D22]" />
            <span>Escrow & Payment Settlements</span>
          </h1>
          <p className="text-xs text-[#5D6352] mt-0.5">Read-only transaction ledger with banking gateway audit tokens</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5D6352] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by gateway transaction reference..."
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
            <option value="">All Settlement States</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="PENDING">PENDING</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">Loading escrow transactions...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#9A3412]">
            {error instanceof Error ? error.message : 'Failed to load payments'}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">No settlement records found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F0E6] border-b border-[#DFD8CB] text-[10px] text-[#5D6352] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Payment Identifier</th>
                  <th className="py-3 px-4">Trade Order Reference</th>
                  <th className="py-3 px-4">Settled Amount</th>
                  <th className="py-3 px-4">Settlement State</th>
                  <th className="py-3 px-4">Gateway Reference</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFD8CB] text-[#1E221B]">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F4F0E6]/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[#5D6352] text-[11px]">
                      {p.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#1E221B] font-mono">
                        {p.order?.orderNumber || 'Direct Escrow'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#1E221B]">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          p.status === 'COMPLETED'
                            ? 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                            : p.status === 'PENDING'
                            ? 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                            : p.status === 'FAILED'
                            ? 'bg-[#9A3412]/10 text-[#9A3412] border-[#9A3412]/20'
                            : 'bg-[#F4F0E6] text-[#5D6352] border-[#DFD8CB]'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#5D6352] text-[11px]">
                      {p.providerReference || 'Pending Gateway ID'}
                    </td>
                    <td className="py-3 px-4 text-[#5D6352] text-[11px] text-right font-mono">
                      {new Date(p.createdAt).toLocaleString('en-IN')}
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
            Showing <span className="font-bold text-[#1E221B]">{payments.length}</span> of{' '}
            <span className="font-bold text-[#1E221B]">{meta.total}</span> settlements
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
    </div>
  );
}
