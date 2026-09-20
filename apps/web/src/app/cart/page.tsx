'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart,
  Trash2,
  Minus,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Package,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { RoleGuard } from '@/components/auth/role-guard';

export default function CartPage() {
  return (
    <RoleGuard allowedRoles={['BUYER']}>
      <CartPageContent />
    </RoleGuard>
  );
}

function CartPageContent() {
  const mounted = useIsMounted();
  const queryClient = useQueryClient();
  const { token, user, isAuthenticated, isLoading: authLoading } = useAuth();

  const isBuyer = user?.role === 'BUYER';

  const {
    data: cartResponse,
    isLoading: cartLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cart', token],
    queryFn: () => fetchCart(token || undefined),
    enabled: mounted && isAuthenticated && !!token && isBuyer,
  });

  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => {
      setUpdatingItemId(productId);
      return updateCartItemQuantity(productId, quantity, token || undefined);
    },
    onSettled: () => {
      setUpdatingItemId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: string) => removeCartItem(productId, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: () => clearCart(token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const cartData = cartResponse?.data;
  const items = cartData?.items || [];
  const subtotal = cartData?.subtotal || 0;
  const itemCount = cartData?.itemCount || 0;

  const hasUnavailableItems = items.some((item) => !item.isAvailable);

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
              <ShoppingCart className="h-7 w-7 text-emerald-600" />
              Direct Sourcing Cart
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Review selected produce, quantities, and direct producer pricing before checkout.
            </p>
          </div>

          {mounted && items.length > 0 && isBuyer && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => clearCartMutation.mutate()}
              disabled={clearCartMutation.isPending}
              className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 gap-1.5 self-start sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Cart</span>
            </Button>
          )}
        </div>

        {/* Loading State */}
        {(!mounted || authLoading || (cartLoading && isBuyer)) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-4">
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
              <Skeleton className="h-28 w-full rounded-2xl" />
            </div>
            <div className="lg:col-span-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          </div>
        )}



        {/* Error State */}
        {mounted && isError && !cartLoading && (() => {
          const errMsg = (error as Error)?.message || '';
          const isRateLimited =
            errMsg.toLowerCase().includes('too many') ||
            errMsg.toLowerCase().includes('throttler') ||
            errMsg.toLowerCase().includes('quickly');

          return (
            <div className="rounded-2xl border border-destructive/20 bg-card p-10 text-center space-y-3 max-w-lg mx-auto my-6 shadow-sm">
              <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
              <h3 className="text-base font-bold text-foreground">
                {isRateLimited ? 'Too Many Rapid Clicks' : 'Failed to Load Cart'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isRateLimited
                  ? 'We noticed multiple quick clicks. Please pause for a brief moment and click Retry to reload your cart.'
                  : errMsg}
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button size="sm" onClick={() => refetch()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Retry Loading Cart
                </Button>
              </div>
            </div>
          );
        })()}

        {/* Empty Cart State */}
        {mounted && !cartLoading && !isError && isBuyer && items.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-12 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-4">
              <ShoppingCart className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Your Cart is Empty</h2>
            <p className="mt-1.5 max-w-sm text-xs text-muted-foreground">
              You haven&apos;t added any agricultural produce to your cart yet. Explore our marketplace to connect directly with local farmers.
            </p>
            <Link href="/marketplace" className="mt-6">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-xs font-semibold h-10 px-5">
                <Package className="h-4 w-4" />
                <span>Explore Produce Catalog</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Cart Contents */}
        {mounted && !cartLoading && !isError && isBuyer && items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Items List */}
            <div className="lg:col-span-8 space-y-4">
              {hasUnavailableItems && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>Some items in your cart have exceeded available harvest stock. Please adjust quantities before checkout.</span>
                </div>
              )}

              {items.map((item) => {
                const isItemOutOfStock = !item.isAvailable;

                return (
                  <Card
                    key={item.id}
                    className={`overflow-hidden border transition-all ${
                      isItemOutOfStock
                        ? 'border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10'
                        : 'border-border/80 bg-card hover:border-border'
                    }`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        {/* Product Image & Info */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted border border-border/40">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.productName}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted-foreground">
                                Produce
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/marketplace/products/${item.productId}`}
                                className="font-bold text-foreground text-sm sm:text-base hover:text-emerald-600 transition-colors truncate"
                              >
                                {item.productName}
                              </Link>
                              <Badge
                                variant={item.seller.sellerType === 'FPO' ? 'fpo' : 'farmer'}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {item.seller.sellerType}
                              </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <span>{item.seller.businessName || 'Verified Producer'}</span>
                              {item.seller.farmLocation && (
                                <span className="text-muted-foreground/60">• {item.seller.farmLocation}</span>
                              )}
                            </p>

                            <div className="flex items-baseline gap-2 pt-0.5">
                              <span className="text-sm font-extrabold text-foreground">
                                ₹{item.unitPrice.toFixed(2)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                / {item.unit}
                              </span>
                            </div>

                            {isItemOutOfStock && (
                              <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 block">
                                Available stock: {item.availableStock} {item.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Controls & Line Total */}
                        <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border/40">
                          {/* Quantity selector */}
                          <div className="flex items-center rounded-xl border border-input bg-background p-1 shadow-inner">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                updateQuantityMutation.mutate({
                                  productId: item.productId,
                                  quantity: Math.max(1, item.quantity - 1),
                                })
                              }
                              disabled={
                                item.quantity <= 1 ||
                                updateQuantityMutation.isPending ||
                                updatingItemId === item.productId
                              }
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <Minus className="h-3 w-3" />
                            </Button>

                            <span className="w-10 text-center text-xs font-bold text-foreground">
                              {updatingItemId === item.productId ? (
                                <span className="animate-pulse">...</span>
                              ) : (
                                item.quantity
                              )}
                            </span>

                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() =>
                                updateQuantityMutation.mutate({
                                  productId: item.productId,
                                  quantity: item.quantity + 1,
                                })
                              }
                              disabled={
                                item.quantity >= item.availableStock ||
                                updateQuantityMutation.isPending ||
                                updatingItemId === item.productId
                              }
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Line Total */}
                          <div className="text-right min-w-20">
                            <span className="text-base font-extrabold text-foreground block">
                              ₹{item.lineTotal.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">Line Total</span>
                          </div>

                          {/* Delete Item Button */}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeItemMutation.mutate(item.productId)}
                            disabled={removeItemMutation.isPending}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-4">
              <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5 sticky top-24">
                <h2 className="text-base font-bold text-foreground">Order Summary</h2>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Total Produce Items:</span>
                    <span className="font-semibold text-foreground">{itemCount} items</span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Produce Subtotal:</span>
                    <span className="font-bold text-foreground">₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Direct Platform Margin:</span>
                    <span className="font-medium text-emerald-600">₹0.00 (Zero Intermediary)</span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-foreground">Grand Subtotal</span>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-foreground">
                      ₹{subtotal.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Taxes calculated at dispatch
                    </span>
                  </div>
                </div>

                <Link href="/checkout" className="block w-full">
                  <Button
                    disabled={hasUnavailableItems || items.length === 0}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <span>Proceed to Review & Order</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>

                <p className="text-[11px] text-center text-muted-foreground">
                  Purchases are placed directly with verified local farmers & cooperatives.
                </p>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
