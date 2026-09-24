'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBuyerOrderById,
  cancelBuyerOrder,
  syncSellerOrderShipment,
  fetchOrderTracking,
  fetchRoute,
} from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { RoleGuard } from '@/components/auth/role-guard';
import { FileText, Truck } from 'lucide-react';
import { TrackingMap } from './components/TrackingMap';
import { TrackingTimeline } from './components/TrackingTimeline';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  return (
    <RoleGuard allowedRoles={['BUYER']}>
      <OrderDetailContent params={params} />
    </RoleGuard>
  );
}

function OrderDetailContent({ params }: PageProps) {
  const { id } = use(params);
  const mounted = useIsMounted();
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'manifest' | 'tracking'>('manifest');

  const {
    data: orderResponse,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['order-detail', id],
    queryFn: () => fetchBuyerOrderById(id, token || undefined),
    enabled: mounted && isAuthenticated,
  });

  const {
    data: trackingResponse,
  } = useQuery({
    queryKey: ['order-tracking', id],
    queryFn: () => fetchOrderTracking(id, token || undefined),
    enabled: mounted && isAuthenticated,
  });

  const order = orderResponse?.data;
  const originDistrict = order?.seller?.farmLocation || 'Lasalgaon';
  const destDistrict = order?.shippingAddressSnapshot?.city || 'Vashi';

  const {
    data: routeData,
    isLoading: isRouteLoading,
  } = useQuery({
    queryKey: ['order-route', originDistrict, destDistrict],
    queryFn: () =>
      fetchRoute({
        originDistrict,
        destDistrict,
      }),
    enabled: mounted && !!order,
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelBuyerOrder(id, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => syncSellerOrderShipment(id, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['order-tracking', id] });
      queryClient.invalidateQueries({ queryKey: ['order-route'] });
    },
  });


  const copyTrackingNumber = (trk: string) => {
    navigator.clipboard.writeText(trk);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FBF4E6] text-[#7A5B18] border border-[#E8DCBF]">
            Escrow Pending
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E8F0E2] text-[#233D22] border border-[#CCDBCB]">
            Confirmed & Funded
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F0F5EE] text-[#2E4221] border border-[#CCD8C4]">
            Harvest Processing
          </span>
        );
      case 'READY_FOR_SHIPMENT':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#EAE4D6] text-[#4A5240] border border-[#D5CEBF]">
            Packed for Freight
          </span>
        );
      case 'SHIPPED':
      case 'IN_TRANSIT':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E2EDE2] text-[#233D22] border border-[#CCDBCB]">
            In Road Transit
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2]">
            Assayed & Delivered
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FDF2F2] text-[#9B1C1C] border border-[#E5B5B5]">
            Contract Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#F7F5EE] text-[#4E5446] border border-[#DFD8CB]">
            {status}
          </span>
        );
    }
  };

  const isCancellable = order?.status === 'PENDING' || order?.status === 'CONFIRMED';

  const lifecycleSteps = [
    { key: 'PENDING', label: 'Escrow Initiated' },
    { key: 'CONFIRMED', label: 'Escrow Funded' },
    { key: 'PROCESSING', label: 'Lot Assayed' },
    { key: 'SHIPPED', label: 'Dispatched' },
    { key: 'IN_TRANSIT', label: 'In Transit' },
    { key: 'DELIVERED', label: 'Weighbridge Released' },
  ];

  const statusOrder: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    PROCESSING: 2,
    READY_FOR_SHIPMENT: 2,
    SHIPPED: 3,
    IN_TRANSIT: 4,
    DELIVERED: 5,
  };

  const currentStepIndex = order ? statusOrder[order.status] ?? -1 : -1;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      <MarketplaceNavbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-[#6B7260]">
          <Link href="/orders" className="hover:text-[#1E221B] font-medium">
            ← Back to Orders Ledger
          </Link>
          <span>/</span>
          <span className="font-bold text-[#1E221B]">
            {order?.orderNumber || 'Contract Details'}
          </span>
        </nav>

        {/* Loading State */}
        {(!mounted || isLoading) && (
          <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
            <p className="text-sm font-serif font-bold text-[#1E221B]">
              Loading Commercial Trade Contract...
            </p>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && mounted && (
          <div className="rounded-lg border border-[#E5B5B5] bg-[#FDF2F2] p-8 text-center space-y-3">
            <h2 className="font-serif font-bold text-lg text-[#9B1C1C]">Order Not Found</h2>
            <p className="max-w-md mx-auto text-xs text-[#771D1D]">
              {(error as Error)?.message || 'This trade contract does not exist or you do not have permission to view it.'}
            </p>
            <Link href="/orders" className="inline-block mt-4">
              <button className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2] rounded">
                Return to Orders Ledger
              </button>
            </Link>
          </div>
        )}

        {/* Order Details Display */}
        {order && !isLoading && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#1E221B]">
                      Contract {order.orderNumber}
                    </h1>
                    {getStatusBadge(order.status)}
                  </div>

                  <p className="text-xs text-[#6B7260]">
                    Executed on {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })} • Certified Agricultural Trade
                  </p>
                </div>

                {isCancellable && (
                  <button
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="h-8 px-3.5 text-xs font-semibold uppercase tracking-wider text-[#8B4513] border border-[#D5CEBF] bg-[#FFFFFF] rounded hover:bg-[#F2EFE7] disabled:opacity-50"
                  >
                    {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Contract'}
                  </button>
                )}
              </div>

              {/* Progress Milestones */}
              {order.status !== 'CANCELLED' && (
                <div className="mt-8 pt-6 border-t border-[#ECE5D8]">
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-center">
                    {lifecycleSteps.map((step, idx) => {
                      const isCompleted = currentStepIndex >= idx;
                      const isCurrent = currentStepIndex === idx;

                      return (
                        <div key={step.key} className="space-y-1.5">
                          <div className={`h-1.5 rounded-full ${
                            isCompleted ? 'bg-[#233D22]' : 'bg-[#DFD8CB]'
                          }`} />
                          <span className={`block text-[11px] ${
                            isCurrent
                              ? 'font-bold text-[#233D22]'
                              : isCompleted
                              ? 'font-medium text-[#1E221B]'
                              : 'text-[#8A9082]'
                          }`}>
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Segmented Tab Controls */}
            <div className="flex border-b border-[#DFD8CB] gap-6 text-sm font-semibold pt-2">
              <button
                onClick={() => setActiveTab('manifest')}
                className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'manifest'
                    ? 'border-[#233D22] text-[#233D22]'
                    : 'border-transparent text-[#6B7260] hover:text-[#1E221B]'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Commercial Manifest</span>
              </button>
              <button
                onClick={() => setActiveTab('tracking')}
                className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
                  activeTab === 'tracking'
                    ? 'border-[#233D22] text-[#233D22]'
                    : 'border-transparent text-[#6B7260] hover:text-[#1E221B]'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Live Freight Telematics</span>
                {order.shipment && (
                  <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E8F0E2] text-[#233D22] border border-[#CCDBCB]">
                    Active
                  </span>
                )}
              </button>
            </div>

            {/* TAB 1: Manifest & Settlement View */}
            {activeTab === 'manifest' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Items Column */}
                <div className="md:col-span-7 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-4">
                  <h2 className="text-base font-serif font-bold text-[#1E221B]">
                    Commodity Batch Manifest
                  </h2>

                  <div className="divide-y divide-[#ECE5D8]">
                    {order.items?.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#1E221B] text-sm block">
                            {item.productName || 'Produce Lot'}
                          </span>
                          <span className="text-[#6B7260] block text-[11px] mt-0.5">
                            Producer: {order.seller?.businessName || 'Verified Collective'}
                          </span>
                          <span className="text-[11px] text-[#7A8070]">
                            Quantity: {item.quantity} {item.unit?.toLowerCase() || 'quintals'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-serif font-bold text-base text-[#1E221B] block">
                            ₹{item.totalPrice.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-[#7A8070]">
                            ₹{item.unitPrice} / unit
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[#ECE5D8] flex justify-between items-baseline">
                    <span className="font-bold text-xs uppercase tracking-wider text-[#1E221B]">Total Settlement Value</span>
                    <span className="text-xl font-serif font-bold text-[#1E221B]">
                      ₹{order.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Destination & Logistics Column */}
                <div className="md:col-span-5 space-y-6">
                  {/* Destination Card */}
                  <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-3">
                    <h3 className="font-serif font-bold text-base text-[#1E221B]">
                      Destination Warehouse
                    </h3>
                    <div className="text-xs space-y-1 text-[#5D6352]">
                      <p className="font-bold text-[#1E221B]">{order.shippingAddressSnapshot?.name || 'Authorized Consignee'}</p>
                      <p>{order.shippingAddressSnapshot?.addressLine || 'Warehouse Terminal'}</p>
                      <p>{order.shippingAddressSnapshot?.city}, {order.shippingAddressSnapshot?.state} - {order.shippingAddressSnapshot?.pincode}</p>
                      <p className="text-[11px] text-[#7A8070]">Contact: {order.shippingAddressSnapshot?.phone || 'On File'}</p>
                    </div>
                  </div>

                  {/* Freight Carrier Information */}
                  {order.shipment && (
                    <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-bold text-base text-[#1E221B]">
                          Carrier Dispatch
                        </h3>
                        <button
                          onClick={() => syncMutation.mutate()}
                          disabled={syncMutation.isPending}
                          className="text-[11px] font-semibold text-[#233D22] hover:underline"
                        >
                          {syncMutation.isPending ? 'Syncing...' : 'Sync Telematics'}
                        </button>
                      </div>

                      <div className="space-y-1.5 text-[#5D6352]">
                        <div className="flex justify-between">
                          <span>Carrier:</span>
                          <strong className="text-[#1E221B]">{order.shipment.provider || 'Aroha Logistics Carrier'}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>e-Way Tracking:</span>
                          <div className="flex items-center gap-1.5 font-mono text-[#1E221B]">
                            <span>{order.shipment.trackingNumber || 'TRK-IN-AGR-420'}</span>
                            <button
                              onClick={() => copyTrackingNumber(order.shipment?.trackingNumber || 'TRK-IN-AGR-420')}
                              className="text-[10px] text-[#233D22] underline"
                            >
                              {copied ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setActiveTab('tracking')}
                        className="w-full mt-2 py-1.5 px-3 text-xs font-semibold rounded bg-[#233D22] text-[#FAF8F2] hover:bg-[#1B2F1A] flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>View Live Freight Telematics Map</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Live Freight Telematics & Route */}
            {activeTab === 'tracking' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7">
                  <TrackingMap
                    route={routeData || null}
                    shipmentStatus={
                      trackingResponse?.data?.shipment?.status ||
                      order.shipment?.status ||
                      'IN_TRANSIT'
                    }
                    originName={order.seller?.farmLocation || order.seller?.businessName || 'Origin Mandi'}
                    destName={order.shippingAddressSnapshot?.city || 'Destination Terminal'}
                    isLoading={isRouteLoading}
                  />
                </div>
                <div className="lg:col-span-5">
                  <TrackingTimeline
                    shipment={trackingResponse?.data?.shipment || order.shipment || null}
                    orderNumber={order.orderNumber}
                    onSyncTelematics={() => syncMutation.mutate()}
                    isSyncing={syncMutation.isPending}
                  />
                </div>
              </div>
            )}

          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DFD8CB] bg-[#FAF8F2] py-8 text-center text-xs text-[#6B7260]">
        <div className="max-w-7xl mx-auto px-4">
          <p>Aroha Agricultural Marketplace Commercial Contract Document</p>
        </div>
      </footer>
    </div>
  );
}
