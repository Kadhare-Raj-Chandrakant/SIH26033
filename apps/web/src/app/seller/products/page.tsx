'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchSellerProducts, SellerProductItem } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { RoleGuard } from '@/components/auth/role-guard';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tractor,
  Layers,
  PackageCheck,
  AlertCircle,
  ExternalLink,
  Store,
  Sparkles,
  Plus,
  TrendingUp,
  ImageOff,
} from 'lucide-react';

export default function SellerProductsPage() {
  return (
    <RoleGuard allowedRoles={['FARMER', 'FPO']}>
      <SellerProductsContent />
    </RoleGuard>
  );
}

function SellerProductsContent() {
  const { token, user } = useAuth();

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['seller-products', token],
    queryFn: () => fetchSellerProducts(token || undefined),
    enabled: !!token,
  });

  const products: SellerProductItem[] = response?.data || [];

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-6xl flex-1">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
              <Tractor className="h-3.5 w-3.5" />
              <span>Producer Portal • Listing Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              My Produce Listings
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage your agricultural harvest listings, monitor available inventory stock, and track live buyer visibility.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/seller/intelligence">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 h-9 border-border/80">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>Market Intelligence</span>
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 shadow-sm">
                <Store className="h-3.5 w-3.5" />
                <span>Browse Marketplace</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <Card className="rounded-2xl border-destructive/20 p-10 text-center space-y-3 max-w-lg mx-auto">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <h3 className="text-base font-bold text-foreground">Failed to Load Listings</h3>
            <p className="text-xs text-muted-foreground">{(error as Error)?.message}</p>
            <Button size="sm" onClick={() => refetch()} className="bg-emerald-600 hover:bg-emerald-700 text-white mt-2">
              Retry
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !isError && products.length === 0 && (
          <Card className="rounded-2xl border-dashed border-border p-12 text-center shadow-sm max-w-lg mx-auto my-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-4 mx-auto">
              <Tractor className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-foreground">No Listings Registered</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              You do not have any registered produce listings under this account ({user?.email}).
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/seller/orders">
                <Button variant="outline" size="sm" className="text-xs h-9">
                  Check Fulfillment Orders
                </Button>
              </Link>
              <Link href="/seller/intelligence">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9">
                  Explore Market Intelligence
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Products Grid */}
        {!isLoading && !isError && products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((item) => {
              const stock = item.inventory?.availableQuantity ?? 0;
              const isAvailable = item.status === 'ACTIVE' && stock > 0;
              const imgUrl = item.primaryImage || item.images?.[0]?.url;

              return (
                <Card
                  key={item.id}
                  className="group flex flex-col h-full overflow-hidden border border-border/80 bg-card hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 rounded-2xl"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                    {imgUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imgUrl}
                        alt={item.name}
                        className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                        <ImageOff className="h-8 w-8 mb-1 opacity-50" />
                        <span className="text-[11px]">No Photo Assigned</span>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5">
                      <Badge variant="secondary" className="text-[10px] font-semibold backdrop-blur-md bg-background/85 shadow-sm">
                        {item.category?.name || 'Produce'}
                      </Badge>
                    </div>

                    <div className="absolute bottom-2.5 right-2.5">
                      {isAvailable ? (
                        <Badge variant="success" className="text-[10px] font-medium shadow-sm py-0.5">
                          <PackageCheck className="mr-1 h-3 w-3" />
                          {stock} {item.unit} available
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] font-semibold shadow-sm py-0.5">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          Out of Stock
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="flex flex-1 flex-col p-4 sm:p-5 justify-between">
                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-foreground line-clamp-1 group-hover:text-emerald-600 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {item.description || 'Verified direct farmer produce listing.'}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                          Asking Price
                        </span>
                        <span className="text-base font-extrabold text-foreground">
                          ₹{item.price} <span className="text-xs font-normal text-muted-foreground">/{item.unit.toLowerCase()}</span>
                        </span>
                      </div>

                      <Link href={`/marketplace/products/${item.id}`}>
                        <Button size="sm" variant="ghost" className="text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 h-8 px-2.5">
                          <span>View Card</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
