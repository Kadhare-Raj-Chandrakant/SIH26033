'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketplaceProductById } from '@/lib/api';
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
  Info,
  User,
  Layers,
  FileText,
  Tag,
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
    staleTime: 30000,
  });

  const product = response?.data;

  // Indian Rupee number formatter (e.g. ₹2,760 / quintal)
  const formatInr = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount) || amount === 0) return null;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasDemoPrice =
    product?.illustrativeFarmerListingReferenceInr !== null &&
    product?.illustrativeFarmerListingReferenceInr !== undefined &&
    !isNaN(product.illustrativeFarmerListingReferenceInr) &&
    product.illustrativeFarmerListingReferenceInr > 0;

  const demoPriceDisplay = hasDemoPrice
    ? `${formatInr(product?.illustrativeFarmerListingReferenceInr)} / quintal`
    : 'Out of stock';

  const locationDisplay =
    product?.district && product?.state
      ? `${product.district}, ${product.state}`
      : product?.location || 'India';

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
            <div className="lg:col-span-7">
              <ProductGallery
                primaryImage={product.primaryImage}
                images={product.images}
                productName={product.name}
                location={locationDisplay}
              />



              {/* Product Detailed Description & Specifications */}
              <div className="mt-8 rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-base font-bold text-foreground">Produce Description</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {product.description || 'Verified agricultural listing sourced directly from regional producers.'}
                  </p>
                </div>

                {/* Listing Details & Metadata */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Listing Specifications
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <span className="text-muted-foreground block text-[11px]">Category</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {product.category?.name || 'Produce'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <span className="text-muted-foreground block text-[11px]">Variety / Grade</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {product.varietyType || 'Standard'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <span className="text-muted-foreground block text-[11px]">Selling Unit</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {product.sellingUnit || product.unit}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <span className="text-muted-foreground block text-[11px]">Available Stock</span>
                      <p className={`font-semibold mt-0.5 ${hasDemoPrice ? 'text-foreground' : 'text-rose-600 dark:text-rose-400'}`}>
                        {hasDemoPrice ? `${product.availableQuantity} ${product.unit}` : 'Out of stock'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                      <span className="text-muted-foreground block text-[11px]">Origin Location</span>
                      <p className="font-semibold text-foreground mt-0.5">
                        {locationDisplay}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {product.notes && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold mb-1">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span>Market & Source Notes</span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed mt-1">
                      {product.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Key Details, Seller Card, Add to Cart */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {product.category?.name}
                  </Badge>
                  {product.varietyType && (
                    <Badge variant="outline" className="text-xs font-medium">
                      {product.varietyType}
                    </Badge>
                  )}
                  {hasDemoPrice ? (
                    <Badge variant="success" className="text-xs">
                      <PackageCheck className="mr-1 h-3.5 w-3.5" />
                      In Stock: {product.availableQuantity} {product.unit}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs bg-rose-600 hover:bg-rose-600 text-white border-0">
                      <AlertCircle className="mr-1 h-3.5 w-3.5" />
                      Out of Stock
                    </Badge>
                  )}
                </div>

                {/* Title & Location */}
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                    {product.name}
                  </h1>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{locationDisplay}</span>
                  </div>
                </div>

                {/* Price Display Section: Direct Farmer Listing */}
                <div className={`rounded-2xl border p-4 sm:p-5 space-y-3.5 ${hasDemoPrice ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span className={`font-bold text-sm ${hasDemoPrice ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                        Farmer’s listing price
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${hasDemoPrice ? 'border-emerald-600/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10' : 'border-rose-600/30 text-rose-700 dark:text-rose-300 bg-rose-500/10'}`}>
                        {hasDemoPrice ? 'Farmer Listing' : 'Unavailable'}
                      </Badge>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-extrabold ${
                          hasDemoPrice
                            ? 'text-2xl sm:text-3xl text-foreground'
                            : 'text-2xl sm:text-3xl text-rose-600 dark:text-rose-400 font-bold'
                        }`}
                      >
                        {demoPriceDisplay}
                      </span>
                    </div>
                    {hasDemoPrice ? (
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        Illustrative demo listing price—not an actual farmer offer.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        Pricing not available. This product is currently out of stock.
                      </p>
                    )}
                  </div>
                </div>

                {/* Verified Farmer & Farm Card */}
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

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span className="text-sm font-semibold text-foreground">
                          {product.farmerName || product.seller.businessName || 'Independent Farmer'}
                        </span>
                        {product.farmName && (
                          <span className="text-muted-foreground">
                            ({product.farmName})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span>{locationDisplay}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>Direct farmer listing • Connect directly with verified producers</span>
                    </div>
                  </CardContent>
                </Card>

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

