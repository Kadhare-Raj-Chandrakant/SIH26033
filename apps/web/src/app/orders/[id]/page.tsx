'use client';

import { use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBuyerOrderById, cancelBuyerOrder } from '@/lib/api';
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

  const order = orderResponse?.data;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Pending</Badge>;
      case 'CONFIRMED':
        return <Badge variant="success" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Confirmed</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="text-zinc-500 border-zinc-300">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const isCancellable = order?.status === 'PENDING' || order?.status === 'CONFIRMED';

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
            </Card>

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
