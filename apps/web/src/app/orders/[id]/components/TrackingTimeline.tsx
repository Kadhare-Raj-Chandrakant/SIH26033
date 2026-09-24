import React, { useState } from 'react';
import { ShipmentInfo } from '@/lib/api';
import { CheckCircle2, Circle, MapPin, Copy, Check, RefreshCw } from 'lucide-react';

interface TrackingTimelineProps {
  shipment: ShipmentInfo | null;
  orderNumber: string;
  onSyncTelematics?: () => void;
  isSyncing?: boolean;
}

export function TrackingTimeline({
  shipment,
  orderNumber,
  onSyncTelematics,
  isSyncing = false,
}: TrackingTimelineProps) {
  const [copied, setCopied] = useState(false);

  const copyTracking = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const trackingNumber = shipment?.trackingNumber || `TRK-AGRI-${orderNumber.slice(-6)}`;
  const carrierName = shipment?.provider || 'Aroha Freight Express Network';

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Standard lifecycle fallback events if events array is empty
  const defaultEvents = [
    {
      id: 'def-1',
      title: 'Consignment Manifest Generated',
      location: 'Origin Collective Terminal',
      time: formatDate(shipment?.shippedAt) || 'Trade Execution Confirmed',
      completed: true,
      current: shipment?.status === 'CREATED',
    },
    {
      id: 'def-2',
      title: 'Freight Carrier Lot Assayed & Picked Up',
      location: 'Mandi Outbound Gate',
      time: formatDate(shipment?.shippedAt) || 'Quality Certificate Stamped',
      completed: ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(
        shipment?.status || '',
      ),
      current: shipment?.status === 'PICKUP_PENDING' || shipment?.status === 'PICKED_UP',
    },
    {
      id: 'def-3',
      title: 'In Highway Transit via Logistics Corridor',
      location: 'National Freight Arterial Way',
      time: 'GPS Telematics Active',
      completed: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(
        shipment?.status || '',
      ),
      current: shipment?.status === 'IN_TRANSIT',
    },
    {
      id: 'def-4',
      title: 'Arrival at Destination APMC Terminal',
      location: 'City Logistics Perimeter',
      time: formatDate(shipment?.estimatedDeliveryAt)
        ? `ETA: ${formatDate(shipment?.estimatedDeliveryAt)}`
        : 'Scheduled for Terminal Ingestion',
      completed: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(shipment?.status || ''),
      current: shipment?.status === 'OUT_FOR_DELIVERY',
    },
    {
      id: 'def-5',
      title: 'Weighbridge Released & Escrow Settled',
      location: 'Buyer Warehouse Gate',
      time: formatDate(shipment?.deliveredAt) || 'Final Assaying Pending',
      completed: shipment?.status === 'DELIVERED',
      current: false,
    },
  ];

  return (
    <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-6">
      {/* Carrier Header Card */}
      <div className="pb-5 border-b border-[#ECE5D8] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B7260]">
              Carrier Partner
            </span>
            <h3 className="font-serif font-bold text-base text-[#1E221B]">{carrierName}</h3>
          </div>

          {onSyncTelematics && (
            <button
              onClick={onSyncTelematics}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-[#233D22] border border-[#CCDBCB] bg-[#E8F0E2] rounded hover:bg-[#DCE7D5] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Telematics'}</span>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between bg-[#F4EFE6] px-3.5 py-2 rounded border border-[#E5DECF] text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-[#7A8070]">e-Way Bill Tracking</span>
            <div className="font-mono font-bold text-[#1E221B] tracking-wide">{trackingNumber}</div>
          </div>
          <button
            onClick={() => copyTracking(trackingNumber)}
            className="flex items-center gap-1 text-[11px] text-[#233D22] font-semibold hover:underline"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Chronological Timeline */}
      <div className="space-y-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7260] mb-4">
          Transit Audit Ledger
        </h4>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#DFD8CB]">
          {shipment?.events && shipment.events.length > 0
            ? shipment.events.map((event, idx) => {
                const isLatest = idx === shipment.events!.length - 1;
                return (
                  <div key={event.id || idx} className="relative group">
                    <span
                      className={`absolute -left-6 top-0.5 flex items-center justify-center w-4 h-4 rounded-full border-2 ${
                        isLatest
                          ? 'bg-[#233D22] border-[#FAF8F2] ring-4 ring-[#E8F0E2]'
                          : 'bg-[#6B7260] border-[#FAF8F2]'
                      }`}
                    >
                      {isLatest ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#FAF8F2]"></span>
                      ) : (
                        <CheckCircle2 className="w-3 h-3 text-[#FAF8F2]" />
                      )}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span
                          className={`font-semibold ${
                            isLatest ? 'text-[#233D22] font-bold' : 'text-[#1E221B]'
                          }`}
                        >
                          {event.message}
                        </span>
                        <span className="text-[11px] text-[#7A8070] font-mono">
                          {formatDate(event.occurredAt)}
                        </span>
                      </div>

                      {event.location && (
                        <div className="flex items-center gap-1 text-[11px] text-[#6B7260]">
                          <MapPin className="w-3 h-3 text-[#8A9082]" />
                          <span>{event.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            : defaultEvents.map((event) => (
                <div key={event.id} className="relative">
                  <span
                    className={`absolute -left-6 top-0.5 flex items-center justify-center w-4 h-4 rounded-full border-2 ${
                      event.current
                        ? 'bg-[#233D22] border-[#FAF8F2] ring-4 ring-[#E8F0E2]'
                        : event.completed
                        ? 'bg-[#2E4221] border-[#FAF8F2]'
                        : 'bg-[#DFD8CB] border-[#FAF8F2]'
                    }`}
                  >
                    {event.current ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FAF8F2]"></span>
                    ) : event.completed ? (
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#FAF8F2]" />
                    ) : (
                      <Circle className="w-2 h-2 text-[#8A9082]" />
                    )}
                  </span>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={`font-semibold ${
                          event.current
                            ? 'text-[#233D22] font-bold'
                            : event.completed
                            ? 'text-[#1E221B]'
                            : 'text-[#8A9082]'
                        }`}
                      >
                        {event.title}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#7A8070]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location}
                      </span>
                      <span className="font-mono">{event.time}</span>
                    </div>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
