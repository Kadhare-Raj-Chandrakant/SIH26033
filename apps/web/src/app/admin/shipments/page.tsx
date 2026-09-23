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
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B] flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#233D22]" />
            <span>Freight Telematics & Fleet Monitoring</span>
          </h1>
          <p className="text-xs text-[#5D6352] mt-0.5">Live transit telemetry, digital weighbridge integration, and milestone tracking</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 bg-[#FCFAF6] border border-[#DFD8CB] rounded-md flex flex-col md:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#5D6352] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by consignment tracking number or order ID..."
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
            <option value="">All Logistics Statuses</option>
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
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">Loading transit telematics...</div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-[#9A3412]">
            {error instanceof Error ? error.message : 'Failed to load shipments'}
          </div>
        ) : shipments.length === 0 ? (
          <div className="p-10 text-center text-xs text-[#5D6352]">No transit records found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#F4F0E6] border-b border-[#DFD8CB] text-[10px] text-[#5D6352] uppercase tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Tracking Number</th>
                  <th className="py-3 px-4">Carrier Provider</th>
                  <th className="py-3 px-4">Order Reference</th>
                  <th className="py-3 px-4">Transit Status</th>
                  <th className="py-3 px-4">Latest Checkpoint</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFD8CB] text-[#1E221B]">
                {shipments.map((s) => {
                  const latestEvent = s.events && s.events.length > 0 ? s.events[0] : null;
                  return (
                    <tr key={s.id} className="hover:bg-[#F4F0E6]/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#233D22]">
                        {s.trackingNumber || 'Pending Allocation'}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#1E221B]">{s.provider}</td>
                      <td className="py-3 px-4 text-[#5D6352] font-mono text-[11px]">
                        {s.order?.orderNumber || 'Unknown'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            s.status === 'DELIVERED'
                              ? 'bg-[#233D22]/10 text-[#233D22] border-[#233D22]/20'
                              : s.status === 'IN_TRANSIT' || s.status === 'OUT_FOR_DELIVERY'
                              ? 'bg-[#BD8728]/10 text-[#BD8728] border-[#BD8728]/20'
                              : s.status === 'FAILED'
                              ? 'bg-[#9A3412]/10 text-[#9A3412] border-[#9A3412]/20'
                              : 'bg-[#F4F0E6] text-[#5D6352] border-[#DFD8CB]'
                          }`}
                        >
                          {s.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5D6352] text-[11px]">
                        {latestEvent ? (
                          <div>
                            <span className="text-[#1E221B] font-medium line-clamp-1">{latestEvent.message}</span>
                            <span className="text-[10px] text-[#5D6352]">
                              {latestEvent.location ? `${latestEvent.location} • ` : ''}
                              {new Date(latestEvent.occurredAt).toLocaleTimeString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#8A8E82]">Awaiting dispatch scan</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleInspectShipment(s.id)}
                          disabled={isLoadingDetail}
                          className="px-2.5 py-1 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-[11px] font-semibold rounded transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3 h-3 text-[#233D22]" />
                          <span>Timeline</span>
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
            Showing <span className="font-bold text-[#1E221B]">{shipments.length}</span> of{' '}
            <span className="font-bold text-[#1E221B]">{meta.total}</span> consignments
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

      {/* Shipment Timeline Modal */}
      {selectedShipment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md p-6 max-w-xl w-full my-8">
            <div className="flex items-center justify-between pb-3 border-b border-[#DFD8CB] mb-4">
              <div>
                <h2 className="text-base font-serif font-bold text-[#1E221B] flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#233D22]" />
                  <span>Consignment #{selectedShipment.trackingNumber || selectedShipment.id}</span>
                </h2>
                <p className="text-xs text-[#5D6352] mt-0.5">
                  Carrier: <span className="text-[#1E221B] font-semibold">{selectedShipment.provider}</span> • Contract:{' '}
                  <span className="text-[#233D22] font-mono font-bold">{selectedShipment.order?.orderNumber}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedShipment(null)}
                className="p-1 hover:bg-[#F4F0E6] rounded text-[#5D6352] hover:text-[#1E221B]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-[#5D6352] uppercase tracking-wider">
                Digital Weighbridge & Checkpoint History
              </h3>
              {selectedShipment.events && selectedShipment.events.length > 0 ? (
                <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DFD8CB]">
                  {selectedShipment.events.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-6 top-1.5 w-3 h-3 rounded-full bg-[#233D22] border-2 border-[#FCFAF6]" />
                      <div className="p-3 bg-[#F4F0E6] border border-[#DFD8CB] rounded text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[#1E221B]">{event.status}</span>
                          <span className="text-[10px] text-[#5D6352] font-mono">
                            {new Date(event.occurredAt).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <p className="text-[#5D6352] text-[11px] mb-1">{event.message}</p>
                        {event.location && (
                          <div className="flex items-center gap-1 text-[10px] text-[#1E221B] font-medium">
                            <MapPin className="w-3 h-3 text-[#233D22]" />
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-[#5D6352] bg-[#F4F0E6] rounded border border-[#DFD8CB]">
                  No telematics events recorded yet for this consignment.
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-[#DFD8CB] flex justify-end">
              <button
                onClick={() => setSelectedShipment(null)}
                className="px-4 py-1.5 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-xs font-semibold rounded transition-colors"
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
