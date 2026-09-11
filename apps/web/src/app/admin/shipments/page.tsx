'use client';

import React, { useState } from 'react';
import {
  Truck,
  Search,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  MapPin,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { fetchAdminShipments, fetchAdminShipment, AdminShipment } from '@/lib/api';

export default function AdminShipmentsPage() {
  const { token, user: currentAdmin } = useAuth();
  const mounted = useIsMounted();

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Shipment detail modal
  const [selectedShipment, setSelectedShipment] = useState<AdminShipment | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['admin-shipments', page, activeSearch, status],
    queryFn: () =>
      fetchAdminShipments(
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

  const shipments = Array.isArray(response?.data) ? response.data : [];
  const meta = response?.meta || { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setActiveSearch(searchInput.trim());
  };

  const handleInspectShipment = async (shipmentId: string) => {
    if (!token) return;
    setIsLoadingDetail(true);
    try {
      const detail = await fetchAdminShipment(shipmentId, token);
      setSelectedShipment(detail);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to fetch shipment events');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            Logistics & Carrier Monitoring
          </h1>
          <p className="text-xs text-slate-400">Track shipments, carriers, delivery stages, and transit event logs</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by tracking number, carrier, or order..."
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
            <option value="">All Shipment Statuses</option>
            <option value="CREATED">CREATED</option>
            <option value="IN_TRANSIT">IN TRANSIT</option>
            <option value="OUT_FOR_DELIVERY">OUT FOR DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Shipments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading logistics tracker...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-red-400">
            {error instanceof Error ? error.message : 'Failed to load shipments'}
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">No shipments found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Tracking Number</th>
                  <th className="py-3.5 px-4">Carrier / Provider</th>
                  <th className="py-3.5 px-4">Order Reference</th>
                  <th className="py-3.5 px-4">Current Status</th>
                  <th className="py-3.5 px-4">Latest Event</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {shipments.map((s) => {
                  const latestEvent = s.events && s.events.length > 0 ? s.events[0] : null;
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                        {s.trackingNumber || 'Pending Allocation'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">{s.provider}</td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {s.order?.orderNumber || 'Unknown'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                            s.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY'
                                ? 'bg-blue-500/10 text-blue-400'
                                : s.status === 'FAILED'
                                  ? 'bg-red-500/10 text-red-400'
                                  : 'bg-amber-500/10 text-amber-400'
                          }`}
                        >
                          {s.status === 'DELIVERED' && <CheckCircle className="w-2.5 h-2.5" />}
                          {s.status === 'IN_TRANSIT' && <Truck className="w-2.5 h-2.5" />}
                          {s.status === 'FAILED' && <XCircle className="w-2.5 h-2.5" />}
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        {latestEvent ? (
                          <div>
                            <span className="text-slate-300 line-clamp-1">{latestEvent.message}</span>
                            <span className="text-[10px] text-slate-500">
                              {latestEvent.location ? `${latestEvent.location} • ` : ''}
                              {new Date(latestEvent.occurredAt).toLocaleTimeString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600">No events logged</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleInspectShipment(s.id)}
                          disabled={isLoadingDetail}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3 h-3 text-emerald-400" />
                          Tracking Log
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
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{shipments.length}</span> of{' '}
            <span className="font-semibold text-slate-200">{meta.total}</span> shipments
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

      {/* Shipment Timeline Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  Shipment Tracking #{selectedShipment.trackingNumber || selectedShipment.id}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Carrier: <span className="text-slate-200 font-semibold">{selectedShipment.provider}</span> • Order:{' '}
                  <span className="text-emerald-400 font-mono">{selectedShipment.order?.orderNumber}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Event History Timeline
              </h3>
              {selectedShipment.events && selectedShipment.events.length > 0 ? (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                  {selectedShipment.events.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                      <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-200">{event.status}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(event.occurredAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-slate-300 text-[11px] mb-1">{event.message}</p>
                        {event.location && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 bg-slate-950 rounded-xl">
                  No tracking events recorded yet for this dispatch.
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedShipment(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors"
              >
                Close Timeline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
