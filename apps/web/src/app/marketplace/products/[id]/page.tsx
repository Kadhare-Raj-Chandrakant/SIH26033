'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketplaceProductById, getMarketIntelligence } from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { ProductGallery } from '@/components/marketplace/product-gallery';
import { AddToCartSection } from '@/components/marketplace/add-to-cart-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  MapPin,
  ShieldCheck,
  Building2,
  PackageCheck,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Info,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { id } = use(params);

  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['marketplace-product', id],
    queryFn: () => fetchMarketplaceProductById(id),
    retry: 1,
  });

  const product = response?.data;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/marketplace"
            className="flex items-center gap-1 font-medium hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Marketplace
          </Link>
          {product && (
            <>
              <span>/</span>
              <span className="text-foreground/80">{product.category?.name}</span>
              <span>/</span>
              <span className="font-semibold text-foreground truncate max-w-xs">
                {product.name}
              </span>
            </>
          )}
        </nav>

        {/* Loading State Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4">
              <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
              <div className="flex gap-3">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <Skeleton className="h-16 w-16 rounded-lg" />
              </div>
            </div>
            <div className="lg:col-span-5 space-y-5">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          </div>
        )}

        {/* Error / Not Found State */}
        {isError && !isLoading && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-card p-12 text-center shadow-sm">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-lg font-bold text-foreground">
              Product Unavailable
            </h2>
            <p className="mt-2 max-w-md text-xs text-muted-foreground">
              {(error as Error)?.message ||
                'This agricultural product does not exist, has been archived, or is currently out of stock in the marketplace.'}
            </p>
            <Link href="/marketplace" className="mt-6">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Return to Marketplace
              </Button>
            </Link>
          </div>
        )}

        {/* Active Product Details */}
        {product && !isLoading && (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            {/* Left Column: Image Gallery */}
            <div className="lg:col-span-7">
              <ProductGallery images={product.images} productName={product.name} />

              {/* Product Detailed Description */}
              <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
                <h3 className="text-base font-bold text-foreground">Produce Description</h3>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {product.description || 'No detailed description provided by the producer.'}
                </p>

                <Separator className="my-6" />

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {product.category?.name || 'General Produce'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unit Specification:</span>
                    <p className="font-semibold text-foreground mt-0.5">{product.unit}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Origin Location:</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {product.location || 'Local Farm'}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Listed On:</span>
                    <p className="font-semibold text-foreground mt-0.5">
                      {new Date(product.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Key Details, Seller Card, Future CTA */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {product.category?.name}
                  </Badge>
                  <Badge
                    variant={product.seller.sellerType === 'FPO' ? 'fpo' : 'farmer'}
                    className="text-xs font-semibold"
                  >
                    {product.seller.sellerType} Listing
                  </Badge>
                  <Badge variant="success" className="text-xs">
                    <PackageCheck className="mr-1 h-3.5 w-3.5" />
                    In Stock: {product.availableQuantity} {product.unit}
                  </Badge>
                </div>

                {/* Title */}
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                    {product.name}
                  </h1>
                  {product.location && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{product.location}</span>
                    </div>
                  )}
                </div>

                {/* Price Display */}
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-4">
                  <span className="text-xs text-muted-foreground block mb-1 font-medium">
                    Direct Sourcing Price
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-foreground">
                      ₹{product.price.toFixed(2)}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      per {product.unit}
                    </span>
                  </div>
                </div>

                {/* Verified Seller Information Card */}
                <Card className="border border-border/60 bg-muted/20">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Producer Information
                      </span>
                      <Badge variant="farmer" className="text-[11px] py-0.5">
                        <ShieldCheck className="mr-1 h-3 w-3 text-emerald-600" />
                        {product.seller.verificationStatus || 'VERIFIED'}
                      </Badge>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-semibold text-foreground">
                          {product.seller.businessName || 'Independent Farmer'}
                        </span>
                      </div>
                      {product.seller.farmLocation && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{product.seller.farmLocation}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Market Intelligence & Price Benchmark */}
                <ProductMarketIntelligence
                  commodityName={product.name.split(' ')[0] || product.category?.name || 'Tomato'}
                  productPrice={product.price}
                  productUnit={product.unit}
                />

                {/* Interactive Add To Cart Section */}
                <AddToCartSection product={product} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ProductMarketIntelligence({
  commodityName,
  productPrice,
  productUnit,
}: {
  commodityName: string;
  productPrice: number;
  productUnit: string;
}) {
  const { data: marketData, isLoading } = useQuery({
    queryKey: ['market-intelligence', commodityName],
    queryFn: () => getMarketIntelligence(commodityName),
    staleTime: 60000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4 text-xs space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (!marketData || !marketData.overallStats) {
    return null;
  }

  const isKg = productUnit.toLowerCase().includes('kg');
  const mandiModalPerKg = marketData.overallStats.avgModalPrice / 100;
  const comparisonPrice = isKg ? mandiModalPerKg : marketData.overallStats.avgModalPrice;
  const isCompetitive = productPrice <= comparisonPrice * 1.1;

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          APMC Mandi Intelligence Benchmark
        </span>
        <Badge
          variant={isCompetitive ? 'success' : 'secondary'}
          className="text-[10px] py-0.5"
        >
          {isCompetitive ? 'Direct Farm Advantage' : 'Premium Graded Produce'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground block text-[11px]">Regional APMC Modal Rate:</span>
          <span className="font-bold text-foreground text-sm">
            ₹{marketData.overallStats.avgModalPrice}/q
            {isKg && (
              <span className="text-[11px] font-normal text-muted-foreground block">
                (~₹{mandiModalPerKg.toFixed(2)}/kg)
              </span>
            )}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground block text-[11px]">Wholesale Absorption Proxy:</span>
          <span className="font-bold text-foreground text-sm">
            {marketData.overallStats.totalArrivalsTonnes.toLocaleString()} Tonnes
          </span>
          <span className="text-[10px] text-muted-foreground block">
            Across {marketData.totalMarketsReporting} reporting mandis
          </span>
        </div>
      </div>

      {marketData.forwardOutlook && (
        <div className="flex items-center gap-2 text-xs pt-1 border-t border-emerald-500/10">
          <span className="text-muted-foreground">7-Day Price Direction:</span>
          <Badge variant="outline" className="text-[10px] gap-1 font-semibold">
            {marketData.forwardOutlook.price_trend_direction === 'RISING' ? (
              <>
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span>RISING TREND</span>
              </>
            ) : marketData.forwardOutlook.price_trend_direction === 'FALLING' ? (
              <>
                <TrendingDown className="h-3 w-3 text-rose-500" />
                <span>FALLING TREND</span>
              </>
            ) : (
              <span>STABLE</span>
            )}
          </Badge>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground/90 flex items-start gap-1 pt-1 border-t border-emerald-500/10">
        <Info className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
        <span>
          Mandi benchmark is calculated from regional APMC wholesale arrivals as of {marketData.reportingDate}. Platform orders feature verified direct producer traceability.
        </span>
      </div>
    </div>
  );
}

