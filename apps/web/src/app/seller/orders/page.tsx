'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSellerOrders,
  confirmSellerOrder,
  processSellerOrder,
  readySellerOrder,
  shipSellerOrder,
  syncSellerOrderShipment,
  demoLoginSeller,
  OrderDetail,
} from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Package,
  Calendar,
  Truck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  Check,
  User,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { RoleGuard } from '@/components/auth/role-guard';

export default function SellerOrdersPage() {
  return (
    <RoleGuard allowedRoles={['FARMER', 'FPO']}>
      <SellerOrdersContent />
    </RoleGuard>
  );
}

function SellerOrdersContent() {
  const mounted = useIsMounted();
  const queryClient = useQueryClient();
  const { token, isAuthenticated, user, setAuth } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isSeller = user?.role === 'FARMER' || user?.role === 'FPO';

  const {
    data: ordersResponse,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: () => fetchSellerOrders(undefined, token || undefined),
    enabled: mounted && isAuthenticated && isSeller,
    staleTime: 5000,
  });

  const confirmMutation = useMutation({
    mutationFn: (orderId: string) => confirmSellerOrder(orderId, token || undefined),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const processMutation = useMutation({
    mutationFn: (orderId: string) => processSellerOrder(orderId, token || undefined),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const readyMutation = useMutation({
    mutationFn: (orderId: string) => readySellerOrder(orderId, token || undefined),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const shipMutation = useMutation({
    mutationFn: (orderId: string) =>
      shipSellerOrder(orderId, { simulateFailure }, token || undefined),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: (orderId: string) => syncSellerOrderShipment(orderId, token || undefined),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    },
    onError: (err: Error) => setActionError(err.message),
  });

  const handleDemoSellerLogin = async (role: 'FARMER' | 'FPO') => {
    try {
      const res = await demoLoginSeller(role);
      setAuth(res.token, res.user);
      queryClient.invalidateQueries({ queryKey: ['seller-orders'] });
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const rawOrders: OrderDetail[] = ordersResponse?.data?.orders || [];
  const filteredOrders = rawOrders.filter((order) => {
    if (selectedStatus === 'ALL') return true;
    return order.status === selectedStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="bg-[#FAF6EC] text-[#9A6818] border-[#E8DEC8] text-[11px] font-semibold">Pending Approval</Badge>;
      case 'CONFIRMED':
        return <Badge variant="outline" className="bg-[#EDF3ED] text-[#233D22] border-[#C8D9C8] text-[11px] font-semibold">Confirmed</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="bg-[#F5F2EA] text-[#5D6352] border-[#DFD8CB] text-[11px] font-semibold">Assaying & Packing</Badge>;
      case 'READY_FOR_SHIPMENT':
        return <Badge variant="outline" className="bg-[#FAF3E8] text-[#8C5D1E] border-[#EAD5BE] text-[11px] font-semibold">Ready for Dispatch</Badge>;
      case 'SHIPPED':
        return <Badge variant="outline" className="bg-[#EBF1F5] text-[#2C4E65] border-[#CADCE6] text-[11px] font-semibold">In Transit</Badge>;
      case 'DELIVERED':
        return <Badge variant="outline" className="bg-[#EDF3ED] text-[#233D22] border-[#B9D4B9] text-[11px] font-semibold">Delivered & Settled</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="bg-[#F8F5F2] text-[#7A7369] border-[#DFD8CB] text-[11px]">Cancelled</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px] border-[#DFD8CB]">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B] flex flex-col font-sans">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-6xl flex-1">
        {/* Page Title & Producer Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#DFD8CB]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C8D9C8] bg-[#EDF3ED] px-3 py-1 text-xs font-semibold text-[#233D22] mb-2">
              <Package className="h-3.5 w-3.5 text-[#3B532B]" />
              <span>Producer Trade & Consignment Fulfillment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
              Producer Fulfillment Ledger
            </h1>
            <p className="text-xs text-[#5D6352] mt-1">
              Verify trade commitments, coordinate farmgate freight dispatches, and trigger digital weighbridge settlement milestones.
            </p>
          </div>

          {/* Quick Role Switcher / Demo Login */}
          <div className="flex items-center gap-2">
            {!mounted ? (
              <div className="h-8 w-32 bg-[#EBE7DC] animate-pulse rounded-lg" />
            ) : !isSeller ? (
              <div className="flex items-center gap-2 bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg p-2">
                <span className="text-xs text-[#5D6352]">Demo Access:</span>
                <Button
                  size="sm"
                  onClick={() => handleDemoSellerLogin('FARMER')}
                  className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs h-8 rounded-md"
                >
                  Login as Farmer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDemoSellerLogin('FPO')}
                  className="text-xs h-8 rounded-md border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] hover:bg-[#EBE7DC]"
                >
                  Login as FPO
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-[#EDF3ED] border-[#C8D9C8] text-[#233D22] text-xs py-1">
                  Active Producer Profile: {user?.role}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Global Action Error Alert */}
        {actionError && (
          <div className="mb-6 p-4 rounded-lg border border-[#D98282] bg-[#FDF2F2] text-[#8C2323] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActionError(null)}
              className="text-xs h-6 px-2 text-[#8C2323] hover:bg-[#F9DDDD]"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-[#DFD8CB] text-xs">
          {[
            { key: 'ALL', label: 'All Orders' },
            { key: 'PENDING', label: 'Pending Approval' },
            { key: 'CONFIRMED', label: 'Confirmed' },
            { key: 'PROCESSING', label: 'Assaying & Packing' },
            { key: 'READY_FOR_SHIPMENT', label: 'Ready for Dispatch' },
            { key: 'SHIPPED', label: 'Dispatched' },
            { key: 'DELIVERED', label: 'Delivered' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap border ${
                selectedStatus === tab.key
                  ? 'bg-[#233D22] text-white border-[#233D22]'
                  : 'bg-[#FCFAF6] text-[#5D6352] border-[#DFD8CB] hover:text-[#1E221B] hover:bg-[#F2EFE8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {(!mounted || isLoading) && (
          <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
            <p className="text-xs text-[#5D6352]">Loading fulfillment ledger contracts...</p>
          </div>
        )}

        {/* Non-Seller Warning State */}
        {mounted && isAuthenticated && !isSeller && (
          <Card className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-12 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-[#9A6818] mx-auto" />
            <h2 className="text-lg font-serif font-bold text-[#1E221B]">Producer Access Required</h2>
            <p className="max-w-md mx-auto text-xs text-[#5D6352]">
              You are currently authenticated with a Buyer profile. To inspect fulfillment orders and schedule farmgate freight dispatches, switch to an accredited Farmer or FPO profile.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => handleDemoSellerLogin('FARMER')}
                className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs rounded-md"
              >
                Switch to Demo Farmer
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDemoSellerLogin('FPO')}
                className="text-xs rounded-md border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
              >
                Switch to Demo FPO
              </Button>
            </div>
          </Card>
        )}

        {/* Empty Orders State */}
        {mounted && !isLoading && !isError && isSeller && filteredOrders.length === 0 && (
          <Card className="rounded-lg border border-dashed border-[#DFD8CB] bg-[#FCFAF6] p-12 text-center space-y-3">
            <Package className="h-10 w-10 text-[#8C867A] mx-auto" />
            <h2 className="text-base font-serif font-bold text-[#1E221B]">No Trade Contracts Found</h2>
            <p className="max-w-sm mx-auto text-xs text-[#5D6352]">
              {selectedStatus === 'ALL'
                ? 'No commercial purchase orders have been received yet. When buyers procure your produce lots, they will appear here.'
                : `No trade contracts currently match status filter "${selectedStatus}".`}
            </p>
          </Card>
        )}

        {/* Order Cards List */}
        {mounted && !isLoading && isSeller && filteredOrders.length > 0 && (
          <div className="space-y-5">
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 transition-colors"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DFD8CB] pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#EDF3ED] text-[#233D22] border border-[#C8D9C8]">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#1E221B] text-sm sm:text-base">
                          {order.orderNumber}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#5D6352] mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Procured by: <strong className="text-[#1E221B]">{order.shippingAddressSnapshot.name}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-[#F4F0E6] p-3 rounded-lg border border-[#E0D9CB]">
                    <span className="text-lg font-serif font-bold text-[#1E221B] block">
                      ₹{order.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-[#5D6352]">Commercial Consignment Escrow</span>
                  </div>
                </div>

                {/* Main Content Grid: Items & Shipping Destination */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4 items-start text-xs">
                  {/* Items list */}
                  <div className="md:col-span-7 space-y-2">
                    <span className="font-bold uppercase text-[10px] text-[#5D6352] tracking-wider block">
                      Contracted Commodity Lots
                    </span>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-md bg-[#F7F5EE] border border-[#DFD8CB]"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative h-10 w-10 shrink-0 rounded overflow-hidden bg-[#EAE5D9] border border-[#DFD8CB]">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.productName}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-[#5D6352]">
                                  Lot
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-serif font-bold text-[#1E221B] truncate text-xs">
                                {item.productName}
                              </p>
                              <p className="text-[11px] text-[#5D6352]">
                                {item.quantity} {item.unit} @ ₹{item.unitPrice.toLocaleString('en-IN')}/{item.unit.toLowerCase()}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-[#1E221B] shrink-0">
                            ₹{item.totalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="md:col-span-5 space-y-2">
                    <span className="font-bold uppercase text-[10px] text-[#5D6352] tracking-wider block">
                      Buyer Assaying & Delivery Destination
                    </span>
                    <div className="rounded-md bg-[#F7F5EE] border border-[#DFD8CB] p-3 space-y-1 text-xs">
                      <p className="font-bold text-[#1E221B]">
                        {order.shippingAddressSnapshot.name}
                      </p>
                      <p className="text-[#5D6352]">
                        {order.shippingAddressSnapshot.addressLine}
                      </p>
                      <p className="text-[#5D6352]">
                        {order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.state} -{' '}
                        {order.shippingAddressSnapshot.pincode}
                      </p>
                      <p className="text-[#5D6352] pt-1 font-medium">
                        Contact: {order.shippingAddressSnapshot.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Shipment Information (if already dispatched) */}
                {order.shipment && (
                  <div className="rounded-md bg-[#EDF3ED] border border-[#C8D9C8] p-3.5 mb-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-[#233D22] shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1E221B]">
                            Carrier: {order.shipment.provider}
                          </span>
                          <Badge variant="outline" className="bg-[#FCFAF6] border-[#C8D9C8] text-[#233D22] text-[10px]">
                            {order.shipment.status}
                          </Badge>
                        </div>
                        <span className="font-mono text-[#5D6352] text-[11px]">
                          E-Way Bill / Waybill: <strong className="text-[#1E221B]">{order.shipment.trackingNumber}</strong>
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncMutation.mutate(order.id)}
                      disabled={syncMutation.isPending}
                      className="text-xs h-8 gap-1.5 border-[#C8D9C8] bg-[#FCFAF6] text-[#233D22] hover:bg-[#E2EDE2]"
                    >
                      <RefreshCw className={`h-3 w-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>Sync Telematics</span>
                    </Button>
                  </div>
                )}

                <Separator className="my-2 bg-[#DFD8CB]" />

                {/* Fulfillment Actions Bottom Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-[#5D6352]">
                    Fulfillment Phase: <strong className="text-[#1E221B]">{order.status}</strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* State: PENDING */}
                    {order.status === 'PENDING' && (
                      <Button
                        size="sm"
                        onClick={() => confirmMutation.mutate(order.id)}
                        disabled={confirmMutation.isPending}
                        className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs gap-1.5 h-8 rounded-md"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{confirmMutation.isPending ? 'Confirming...' : 'Confirm Trade Commitment'}</span>
                      </Button>
                    )}

                    {/* State: CONFIRMED */}
                    {order.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        onClick={() => processMutation.mutate(order.id)}
                        disabled={processMutation.isPending}
                        className="bg-[#BD8728] hover:bg-[#a67420] text-white text-xs gap-1.5 h-8 rounded-md"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>{processMutation.isPending ? 'Updating...' : 'Begin Quality Assaying & Bagging'}</span>
                      </Button>
                    )}

                    {/* State: PROCESSING */}
                    {order.status === 'PROCESSING' && (
                      <Button
                        size="sm"
                        onClick={() => readyMutation.mutate(order.id)}
                        disabled={readyMutation.isPending}
                        className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs gap-1.5 h-8 rounded-md"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span>{readyMutation.isPending ? 'Updating...' : 'Mark Ready for Carrier Pickup'}</span>
                      </Button>
                    )}

                    {/* State: READY_FOR_SHIPMENT */}
                    {order.status === 'READY_FOR_SHIPMENT' && (
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-[#5D6352] flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={simulateFailure}
                            onChange={(e) => setSimulateFailure(e.target.checked)}
                            className="rounded border-[#DFD8CB] text-[#233D22]"
                          />
                          <span>Simulate Carrier Exception</span>
                        </label>
                        <Button
                          size="sm"
                          onClick={() => shipMutation.mutate(order.id)}
                          disabled={shipMutation.isPending}
                          className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs gap-1.5 h-8 rounded-md"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{shipMutation.isPending ? 'Dispatching...' : 'Dispatch Farmgate Consignment'}</span>
                        </Button>
                      </div>
                    )}

                    {/* State: SHIPPED / IN_TRANSIT */}
                    {(order.status === 'SHIPPED' || order.status === 'IN_TRANSIT') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => syncMutation.mutate(order.id)}
                        disabled={syncMutation.isPending}
                        className="text-xs h-8 gap-1.5 border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] hover:bg-[#EBE7DC]"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                        <span>Sync Transit Telematics</span>
                      </Button>
                    )}

                    {/* State: DELIVERED */}
                    {order.status === 'DELIVERED' && (
                      <Badge variant="outline" className="bg-[#EDF3ED] border-[#C8D9C8] text-[#233D22] text-xs py-1 gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-[#233D22]" />
                        <span>Escrow Released & Consignment Completed</span>
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
