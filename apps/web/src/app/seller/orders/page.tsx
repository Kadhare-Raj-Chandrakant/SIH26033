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
import { Skeleton } from '@/components/ui/skeleton';
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
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';

export default function SellerOrdersPage() {
  const mounted = useIsMounted();
  const queryClient = useQueryClient();
  const { token, isAuthenticated, user, setAuth } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Check if current user is FARMER or FPO
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

  // Action Mutations
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

  // Demo Login as Farmer
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
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[11px]">Pending Approval</Badge>;
      case 'CONFIRMED':
        return <Badge variant="success" className="bg-blue-100 text-blue-800 text-[11px]">Confirmed</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 text-[11px]">In Preparation</Badge>;
      case 'READY_FOR_SHIPMENT':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-[11px]">Ready for Pickup</Badge>;
      case 'SHIPPED':
        return <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 text-[11px]">Dispatched</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="secondary" className="bg-sky-100 text-sky-800 text-[11px]">In Transit</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 text-[11px]">Delivered</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-zinc-500 border-zinc-300 text-[11px]">Cancelled</Badge>;
      default:
        return <Badge variant="secondary" className="text-[11px]">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-6xl flex-1">
        {/* Page Title & Producer Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Milestone 8 — Order Fulfillment Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              Producer Fulfillment Center
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage received buyer orders, schedule carrier dispatches, and track consignments.
            </p>
          </div>

          {/* Quick Role Switcher / Demo Login */}
          <div className="flex items-center gap-2">
            {!mounted ? (
              <div className="h-8 w-32 bg-muted animate-pulse rounded-xl" />
            ) : !isSeller ? (
              <div className="flex items-center gap-2 bg-card border border-border/80 rounded-xl p-2 shadow-sm">
                <span className="text-xs text-muted-foreground">Demo Mode:</span>
                <Button
                  size="sm"
                  onClick={() => handleDemoSellerLogin('FARMER')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8"
                >
                  Login as Farmer
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDemoSellerLogin('FPO')}
                  className="text-xs h-8"
                >
                  Login as FPO
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant={user?.role === 'FPO' ? 'fpo' : 'farmer'} className="text-xs py-1">
                  Active Producer: {user?.role}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Global Action Error Alert */}
        {actionError && (
          <div className="mb-6 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setActionError(null)}
              className="text-xs h-6 px-2 text-destructive hover:bg-destructive/20"
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-6 border-b border-border/50 text-xs">
          {[
            { key: 'ALL', label: 'All Orders' },
            { key: 'PENDING', label: 'Pending' },
            { key: 'CONFIRMED', label: 'Confirmed' },
            { key: 'PROCESSING', label: 'Processing' },
            { key: 'READY_FOR_SHIPMENT', label: 'Ready to Ship' },
            { key: 'SHIPPED', label: 'Dispatched' },
            { key: 'DELIVERED', label: 'Delivered' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedStatus(tab.key)}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${
                selectedStatus === tab.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {(!mounted || isLoading) && (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-44 w-full rounded-2xl" />
          </div>
        )}

        {/* Non-Seller Warning State */}
        {mounted && isAuthenticated && !isSeller && (
          <Card className="rounded-2xl border border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10 p-12 text-center shadow-sm space-y-4">
            <AlertTriangle className="h-12 w-12 text-amber-600 mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Producer Access Required</h2>
            <p className="max-w-md mx-auto text-xs text-muted-foreground">
              You are currently logged in as a Buyer. To access seller fulfillment actions (Confirm, Pack, Dispatch), please switch to a verified Farmer or FPO profile.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                onClick={() => handleDemoSellerLogin('FARMER')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                Switch to Demo Farmer
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDemoSellerLogin('FPO')}
                className="text-xs"
              >
                Switch to Demo FPO
              </Button>
            </div>
          </Card>
        )}

        {/* Empty Orders State */}
        {mounted && !isLoading && !isError && isSeller && filteredOrders.length === 0 && (
          <Card className="rounded-2xl border border-dashed border-border/80 bg-card p-12 text-center shadow-sm space-y-3">
            <Package className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <h2 className="text-base font-bold text-foreground">No Orders Found</h2>
            <p className="max-w-sm mx-auto text-xs text-muted-foreground">
              {selectedStatus === 'ALL'
                ? 'You have not received any orders yet. When buyers purchase your produce, they will appear here.'
                : `No orders currently match status "${selectedStatus}".`}
            </p>
          </Card>
        )}

        {/* Order Cards List */}
        {mounted && !isLoading && isSeller && filteredOrders.length > 0 && (
          <div className="space-y-5">
            {filteredOrders.map((order) => (
              <Card
                key={order.id}
                className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm transition-all hover:border-border"
              >
                {/* Order Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground text-sm sm:text-base">
                          {order.orderNumber}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Buyer: <strong>{order.shippingAddressSnapshot.name}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-lg font-extrabold text-foreground block">
                      ₹{order.totalAmount.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Total Consignment Value</span>
                  </div>
                </div>

                {/* Main Content Grid: Items & Shipping Destination */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-4 items-start text-xs">
                  {/* Items list */}
                  <div className="md:col-span-7 space-y-2">
                    <span className="font-bold uppercase text-[10px] text-muted-foreground tracking-wider block">
                      Produce Items Ordered
                    </span>
                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-xl bg-muted/30 border border-border/40"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-muted">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.productName}
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-muted-foreground">
                                  Item
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate text-xs">
                                {item.productName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.quantity} {item.unit} @ ₹{item.unitPrice.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-foreground shrink-0">
                            ₹{item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Destination */}
                  <div className="md:col-span-5 space-y-2">
                    <span className="font-bold uppercase text-[10px] text-muted-foreground tracking-wider block">
                      Buyer Delivery Destination
                    </span>
                    <div className="rounded-xl bg-muted/30 border border-border/40 p-3 space-y-1 text-xs">
                      <p className="font-bold text-foreground">
                        {order.shippingAddressSnapshot.name}
                      </p>
                      <p className="text-muted-foreground">
                        {order.shippingAddressSnapshot.addressLine}
                      </p>
                      <p className="text-muted-foreground">
                        {order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.state} -{' '}
                        {order.shippingAddressSnapshot.pincode}
                      </p>
                      <p className="text-muted-foreground pt-1 font-medium">
                        Phone: {order.shippingAddressSnapshot.phone}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Active Shipment Information (if already dispatched) */}
                {order.shipment && (
                  <div className="rounded-xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-500/20 p-3.5 mb-4 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            Carrier: {order.shipment.provider}
                          </span>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px]">
                            {order.shipment.status}
                          </Badge>
                        </div>
                        <span className="font-mono text-muted-foreground text-[11px]">
                          Tracking: <strong>{order.shipment.trackingNumber}</strong>
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncMutation.mutate(order.id)}
                      disabled={syncMutation.isPending}
                      className="text-xs h-8 gap-1.5"
                    >
                      <RefreshCw className={`h-3 w-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>Sync Latest Carrier Status</span>
                    </Button>
                  </div>
                )}

                <Separator className="my-2" />

                {/* Fulfillment Actions Bottom Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-muted-foreground">
                    Current Fulfillment State: <strong className="text-foreground">{order.status}</strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* State: PENDING */}
                    {order.status === 'PENDING' && (
                      <Button
                        size="sm"
                        onClick={() => confirmMutation.mutate(order.id)}
                        disabled={confirmMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-8"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{confirmMutation.isPending ? 'Confirming...' : 'Confirm Order'}</span>
                      </Button>
                    )}

                    {/* State: CONFIRMED */}
                    {order.status === 'CONFIRMED' && (
                      <Button
                        size="sm"
                        onClick={() => processMutation.mutate(order.id)}
                        disabled={processMutation.isPending}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 h-8"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>{processMutation.isPending ? 'Updating...' : 'Start Harvesting & Packing'}</span>
                      </Button>
                    )}

                    {/* State: PROCESSING */}
                    {order.status === 'PROCESSING' && (
                      <Button
                        size="sm"
                        onClick={() => readyMutation.mutate(order.id)}
                        disabled={readyMutation.isPending}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5 h-8"
                      >
                        <Package className="h-3.5 w-3.5" />
                        <span>{readyMutation.isPending ? 'Updating...' : 'Mark Ready for Pickup'}</span>
                      </Button>
                    )}

                    {/* State: READY_FOR_SHIPMENT */}
                    {order.status === 'READY_FOR_SHIPMENT' && (
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-muted-foreground flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={simulateFailure}
                            onChange={(e) => setSimulateFailure(e.target.checked)}
                            className="rounded border-border text-emerald-600"
                          />
                          <span>Simulate Carrier Failure</span>
                        </label>
                        <Button
                          size="sm"
                          onClick={() => shipMutation.mutate(order.id)}
                          disabled={shipMutation.isPending}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-8 shadow-sm"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>{shipMutation.isPending ? 'Dispatching...' : 'Dispatch & Create Shipment'}</span>
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
                        className="text-xs h-8 gap-1.5"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                        <span>Sync Delivery Progression</span>
                      </Button>
                    )}

                    {/* State: DELIVERED */}
                    {order.status === 'DELIVERED' && (
                      <Badge variant="success" className="bg-emerald-100 text-emerald-800 text-xs py-1 gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Order Fulfilled & Delivered</span>
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
