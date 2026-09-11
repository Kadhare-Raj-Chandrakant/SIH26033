'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBuyerOrderById, cancelBuyerOrder, syncSellerOrderShipment } from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Calendar,
  Building2,
  MapPin,
  ChevronLeft,
  AlertCircle,
  XCircle,
  ShieldCheck,
  CheckCircle2,
  Truck,
  Clock,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function OrderDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const mounted = useIsMounted();
  const queryClient = useQueryClient();
  const { token, isAuthenticated } = useAuth();
  const [copied, setCopied] = useState(false);

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
    },
  });

  const order = orderResponse?.data;

  const copyTrackingNumber = (trk: string) => {
    navigator.clipboard.writeText(trk);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Pending</Badge>;
      case 'CONFIRMED':
        return <Badge variant="success" className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Confirmed</Badge>;
      case 'PROCESSING':
        return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">Processing</Badge>;
      case 'READY_FOR_SHIPMENT':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">Ready for Dispatch</Badge>;
      case 'SHIPPED':
        return <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">Dispatched</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="secondary" className="bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300">In Transit</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Delivered</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-zinc-500 border-zinc-300">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getShipmentBadge = (status: string) => {
    switch (status) {
      case 'CREATED':
      case 'PICKUP_PENDING':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[11px]">Carrier Assigned</Badge>;
      case 'PICKED_UP':
        return <Badge variant="secondary" className="bg-cyan-100 text-cyan-800 text-[11px]">Dispatched</Badge>;
      case 'IN_TRANSIT':
        return <Badge variant="secondary" className="bg-sky-100 text-sky-800 text-[11px]">In Transit</Badge>;
      case 'OUT_FOR_DELIVERY':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-[11px]">Out for Delivery</Badge>;
      case 'DELIVERED':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 text-[11px]">Delivered</Badge>;
      default:
        return <Badge variant="secondary" className="text-[11px]">{status}</Badge>;
    }
  };

  const isCancellable = order?.status === 'PENDING' || order?.status === 'CONFIRMED';

  // Lifecycle steps for progress bar
  const lifecycleSteps = [
    { key: 'PENDING', label: 'Order Placed' },
    { key: 'CONFIRMED', label: 'Confirmed' },
    { key: 'PROCESSING', label: 'Processing' },
    { key: 'READY_FOR_SHIPMENT', label: 'Packed' },
    { key: 'SHIPPED', label: 'Dispatched' },
    { key: 'IN_TRANSIT', label: 'In Transit' },
    { key: 'DELIVERED', label: 'Delivered' },
  ];

  const statusOrder: Record<string, number> = {
    PENDING: 0,
    CONFIRMED: 1,
    PROCESSING: 2,
    READY_FOR_SHIPMENT: 3,
    SHIPPED: 4,
    IN_TRANSIT: 5,
    DELIVERED: 6,
  };

  const currentStepIndex = order ? statusOrder[order.status] ?? -1 : -1;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/orders"
            className="flex items-center gap-1 font-medium hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Orders
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground truncate max-w-xs">
            {order?.orderNumber || 'Order Details'}
          </span>
        </nav>

        {/* Loading State Skeleton */}
        {(!mounted || isLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-8 space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
            <div className="md:col-span-4 space-y-4">
              <Skeleton className="h-52 w-full rounded-2xl" />
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && mounted && (
          <div className="rounded-2xl border border-destructive/20 bg-card p-12 text-center shadow-sm space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-bold text-foreground">Order Not Found</h2>
            <p className="max-w-md mx-auto text-xs text-muted-foreground">
              {(error as Error)?.message || 'This order does not exist or you do not have permission to view it.'}
            </p>
            <Link href="/orders" className="inline-block mt-4">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                Return to Orders
              </Button>
            </Link>
          </div>
        )}

        {/* Order Details Display */}
        {order && !isLoading && (
          <div className="space-y-6">
            {/* Header Card */}
            <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                      Order {order.orderNumber}
                    </h1>
                    {getStatusBadge(order.status)}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                      Placed on{' '}
                      {new Date(order.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Verified Agricultural Purchase
                    </span>
                  </div>
                </div>

                {/* Cancel Order Action if early status */}
                {isCancellable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => cancelMutation.mutate()}
                    disabled={cancelMutation.isPending}
                    className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1.5 self-start sm:self-auto"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>{cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}</span>
                  </Button>
                )}
              </div>

              {/* Lifecycle Progress Stepper (Hidden on Cancelled) */}
              {order.status !== 'CANCELLED' && (
                <div className="mt-8 pt-6 border-t border-border/50">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                    Fulfillment Status Progress
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-2">
                    {lifecycleSteps.map((step, idx) => {
                      const isComplete = currentStepIndex >= idx;
                      const isCurrent = currentStepIndex === idx;
                      return (
                        <div key={step.key} className="flex flex-col items-center text-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                              isComplete
                                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                                : 'bg-muted text-muted-foreground'
                            } ${isCurrent ? 'ring-2 ring-emerald-600 ring-offset-2' : ''}`}
                          >
                            {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
                          </div>
                          <span
                            className={`mt-1.5 text-[11px] font-medium leading-tight ${
                              isCurrent
                                ? 'text-emerald-600 font-bold'
                                : isComplete
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>

            {/* Live Logistics & Shipment Tracking Card */}
            {order.shipment ? (
              <Card className="rounded-2xl border border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-foreground">Live Shipment Tracking</h2>
                        {getShipmentBadge(order.shipment.status)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Carrier: <strong className="text-foreground">{order.shipment.provider}</strong> (Agri-Logistics Network)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                      className="text-xs gap-1.5 h-8"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                      <span>{syncMutation.isPending ? 'Syncing...' : 'Sync Live Status'}</span>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="rounded-xl bg-background p-3.5 border border-border/60">
                    <span className="text-muted-foreground block text-[11px]">Consignment Tracking No.</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-bold text-foreground text-sm tracking-wide">
                        {order.shipment.trackingNumber}
                      </span>
                      <button
                        onClick={() => copyTrackingNumber(order.shipment!.trackingNumber)}
                        className="p-1 hover:text-emerald-600 transition-colors"
                        title="Copy tracking number"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-background p-3.5 border border-border/60">
                    <span className="text-muted-foreground block text-[11px]">Dispatched At</span>
                    <span className="font-semibold text-foreground text-sm mt-1 block">
                      {order.shipment.shippedAt
                        ? new Date(order.shipment.shippedAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Pending Dispatch'}
                    </span>
                  </div>

                  <div className="rounded-xl bg-background p-3.5 border border-border/60">
                    <span className="text-muted-foreground block text-[11px]">
                      {order.shipment.status === 'DELIVERED' ? 'Delivered At' : 'Estimated Delivery (ETA)'}
                    </span>
                    <span className="font-semibold text-emerald-600 text-sm mt-1 block">
                      {order.shipment.status === 'DELIVERED' && order.shipment.deliveredAt
                        ? new Date(order.shipment.deliveredAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : order.shipment.estimatedDeliveryAt
                          ? new Date(order.shipment.estimatedDeliveryAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Standard (3-4 Days)'}
                    </span>
                  </div>
                </div>

                {/* Chronological Tracking Timeline */}
                {order.shipment.events && order.shipment.events.length > 0 && (
                  <div className="pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Tracking Event History</span>
                    </h3>

                    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                      {order.shipment.events.map((event) => (
                        <div key={event.id} className="relative text-xs">
                          <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                            <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{event.status.replace(/_/g, ' ')}</span>
                              {event.location && (
                                <span className="text-muted-foreground text-[11px]">
                                  • {event.location}
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground mt-0.5">{event.message}</p>
                            <span className="text-[10px] text-muted-foreground/70 mt-0.5 block">
                              {new Date(event.occurredAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            ) : order.status !== 'CANCELLED' ? (
              <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm">Producer Preparation Phase</h3>
                    <p className="text-xs text-muted-foreground">
                      The farmer/FPO has received your order and is preparing produce for harvest and dispatch. A live tracking consignment number will be generated once handed to carrier.
                    </p>
                  </div>
                </div>
              </Card>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Purchased Items */}
              <div className="md:col-span-8 space-y-6">
                <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-4">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Package className="h-4 w-4 text-emerald-600" />
                    Purchased Produce Items
                  </h2>

                  <div className="divide-y divide-border/40">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted border border-border/40">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.productName}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-muted-foreground">
                                Produce
                              </div>
                            )}
                          </div>

                          <div className="space-y-1 min-w-0 flex-1">
                            <p className="text-sm font-bold text-foreground truncate">
                              {item.productName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Quantity: <strong className="text-foreground">{item.quantity} {item.unit}</strong>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Snapshotted Unit Price: ₹{item.unitPrice.toFixed(2)} / {item.unit}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm sm:text-base font-extrabold text-foreground block">
                            ₹{item.totalPrice.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Historical Total</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  <div className="flex items-baseline justify-between pt-2">
                    <span className="text-sm font-bold text-foreground">Order Subtotal</span>
                    <span className="text-xl font-extrabold text-foreground">
                      ₹{order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </Card>
              </div>

              {/* Right Column: Shipping Snapshot & Producer Info */}
              <div className="md:col-span-4 space-y-6">
                {/* Shipping Address Snapshot */}
                <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Shipping Destination</span>
                  </div>

                  <div className="rounded-xl bg-muted/40 p-3.5 space-y-1 text-xs">
                    <p className="font-bold text-foreground text-sm">
                      {order.shippingAddressSnapshot.name}
                    </p>
                    <p className="text-muted-foreground">
                      {order.shippingAddressSnapshot.addressLine}
                    </p>
                    <p className="text-muted-foreground">
                      {order.shippingAddressSnapshot.city}, {order.shippingAddressSnapshot.state} -{' '}
                      {order.shippingAddressSnapshot.pincode}
                    </p>
                    <p className="text-muted-foreground">{order.shippingAddressSnapshot.country}</p>
                    <p className="text-muted-foreground pt-1 font-medium">
                      Contact: {order.shippingAddressSnapshot.phone}
                    </p>
                  </div>
                </Card>

                {/* Seller Info */}
                <Card className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Producer Details</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm">
                        {order.seller.businessName || 'Verified Producer'}
                      </span>
                      <Badge
                        variant={order.seller.sellerType === 'FPO' ? 'fpo' : 'farmer'}
                        className="text-[10px] py-0"
                      >
                        {order.seller.sellerType}
                      </Badge>
                    </div>
                    {order.seller.farmLocation && (
                      <p className="text-muted-foreground">{order.seller.farmLocation}</p>
                    )}
                    <Badge variant="farmer" className="text-[10px] mt-1 inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>{order.seller.verificationStatus || 'VERIFIED'}</span>
                    </Badge>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
