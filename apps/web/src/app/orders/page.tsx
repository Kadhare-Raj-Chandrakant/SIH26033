'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchBuyerOrders } from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Calendar,
  Building2,
  ChevronRight,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { RoleGuard } from '@/components/auth/role-guard';

export default function OrdersPage() {
  return (
    <RoleGuard allowedRoles={['BUYER']}>
      <OrdersPageContent />
    </RoleGuard>
  );
}

function OrdersPageContent() {
  const mounted = useIsMounted();
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const [page, setPage] = useState(1);

  const {
    data: ordersResponse,
    isLoading: ordersLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => fetchBuyerOrders({ page, limit: 10 }, token || undefined),
    enabled: mounted && isAuthenticated,
  });

  const ordersData = ordersResponse?.data;
  const orders = ordersData?.orders || [];
  const meta = ordersData?.meta;

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

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Package className="h-7 w-7 text-emerald-600" />
            My Orders
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Track and view historical records of your direct farm produce purchases.
          </p>
        </div>

        {/* Loading state */}
        {(!mounted || authLoading || ordersLoading) && (
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        )}

        {/* Error state */}
        {isError && !ordersLoading && (
          <div className="rounded-2xl border border-destructive/20 bg-card p-10 text-center space-y-3">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="text-base font-bold text-foreground">Failed to Load Orders</h3>
            <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
          </div>
        )}

        {/* Empty orders state */}
        {!ordersLoading && !isError && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-4">
              <ShoppingBag className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-foreground">No Orders Placed Yet</h2>
            <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
              You have not placed any orders yet. Discover high quality harvest produce sourced directly from farmers.
            </p>
            <Link href="/marketplace" className="mt-6">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-semibold h-10 px-5">
                Explore Marketplace
              </Button>
            </Link>
          </div>
        )}

        {/* Orders list */}
        {!ordersLoading && !isError && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="overflow-hidden border border-border/80 bg-card hover:border-border transition-all shadow-sm"
              >
                <CardContent className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    {/* Order summary info */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-sm sm:text-base text-foreground">
                          {order.orderNumber}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(order.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {order.seller?.businessName || 'Direct Producer'}
                        </span>
                        <span>• {order.itemCount || order.items?.length || 1} item(s)</span>
                      </div>

                      {/* Items preview */}
                      <div className="pt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {order.items?.map((item) => (
                          <span
                            key={item.id}
                            className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-medium text-foreground text-[11px]"
                          >
                            {item.productName} ({item.quantity} {item.unit})
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Order total and view button */}
                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                      <div className="sm:text-right">
                        <span className="text-[11px] text-muted-foreground block">Order Total</span>
                        <span className="text-base sm:text-lg font-extrabold text-foreground">
                          ₹{order.totalAmount.toFixed(2)}
                        </span>
                      </div>

                      <Link href={`/orders/${order.id}`}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs h-8 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50"
                        >
                          <span>View Details</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Pagination Controls */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
                <span>
                  Page {meta.page} of {meta.totalPages} ({meta.total} orders)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={meta.page <= 1}
                    className="h-8 text-xs"
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    disabled={meta.page >= meta.totalPages}
                    className="h-8 text-xs"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
