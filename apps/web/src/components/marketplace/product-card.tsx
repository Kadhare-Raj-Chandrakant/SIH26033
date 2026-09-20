'use client';

import Link from 'next/link';

import {
  MapPin,
  User,
  PackageCheck,
  ArrowRight,
  Eye,
  ImageOff,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MarketplaceProduct } from '@/lib/api';

interface ProductCardProps {
  product: MarketplaceProduct;
  onQuickView?: (product: MarketplaceProduct) => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  // Exactly ONE primary image per farmer listing
  const primaryImage =
    product.primaryImage ||
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url;

  // Indian Rupee number formatter (e.g. ₹2,760)
  const formatInr = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount) || amount === 0) return null;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const hasDemoPrice =
    product.illustrativeFarmerListingReferenceInr !== null &&
    product.illustrativeFarmerListingReferenceInr !== undefined &&
    !isNaN(product.illustrativeFarmerListingReferenceInr) &&
    product.illustrativeFarmerListingReferenceInr > 0;

  const demoPriceDisplay = hasDemoPrice
    ? `${formatInr(product.illustrativeFarmerListingReferenceInr)} / quintal`
    : 'Out of stock';

  const locationDisplay =
    product.district && product.state
      ? `${product.district}, ${product.state}`
      : product.location || 'India';

  return (
    <Card className="group flex flex-col h-full overflow-hidden border border-border/80 bg-card hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
      {/* Product Image Area with Single Primary Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100/80 dark:bg-zinc-900/80">
        <Link href={`/marketplace/products/${product.id}`} className="block h-full w-full">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage}
              alt={product.name}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            // Neutral "Image unavailable" placeholder (No stock/generic/castle photos)
            <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center select-none">
              <div className="h-10 w-10 rounded-full bg-zinc-200/80 dark:bg-zinc-800/80 flex items-center justify-center mb-1.5 text-zinc-400 dark:text-zinc-500">
                <ImageOff className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Image unavailable
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Farmer photo pending verification
              </span>
            </div>
          )}
        </Link>

        {/* Category & Variety Overlay Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 max-w-[75%] pointer-events-none">
          <Badge variant="secondary" className="backdrop-blur-md bg-background/85 text-[11px] font-semibold">
            {product.category?.name || 'General'}
          </Badge>
          {product.varietyType && (
            <Badge variant="outline" className="backdrop-blur-md bg-background/85 text-[10px] font-medium border-border/80">
              {product.varietyType}
            </Badge>
          )}
        </div>

        {/* Quick View trigger */}
        {onQuickView && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickView(product);
            }}
            className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-background/85 backdrop-blur-md text-muted-foreground hover:text-emerald-600 hover:bg-background flex items-center justify-center shadow-sm transition-all"
            title="Quick view listing details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Availability Stock Badge */}
        <div className="absolute bottom-2.5 right-2.5">
          {hasDemoPrice ? (
            <Badge variant="success" className="text-[10px] font-medium shadow-sm py-0.5">
              <PackageCheck className="mr-1 h-3 w-3" />
              {product.availableQuantity} {product.unit.toLowerCase()} stock
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px] font-semibold shadow-sm py-0.5 bg-rose-600 hover:bg-rose-600 text-white border-0">
              <AlertCircle className="mr-1 h-3 w-3" />
              Out of stock
            </Badge>
          )}
        </div>
      </div>


      {/* Card Content */}
      <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Product Title & Producer Info */}
        <div className="mb-2">
          <Link href={`/marketplace/products/${product.id}`}>
            <h3 className="line-clamp-1 text-base font-bold text-foreground group-hover:text-emerald-600 transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Farmer & Farm Name */}
          <p className="mt-1 flex items-center gap-1.5 text-xs text-foreground/80 font-medium truncate">
            <User className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">
              {product.farmerName || product.seller.businessName || 'Verified Farmer'}
              {product.farmName && (
                <span className="text-muted-foreground font-normal"> ({product.farmName})</span>
              )}
            </span>
          </p>

          {/* Location: District, State */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate">{locationDisplay}</span>
          </div>
        </div>

        {/* Price Breakdown Container */}
        <div className="mt-auto pt-3 border-t border-border/60 space-y-2.5">
          {/* Primary Price: Direct Farmer Listing Price */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">
                Farmer’s listing price
              </span>
              {hasDemoPrice ? (
                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                  Farmer Listing
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded">
                  Unavailable
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={`font-extrabold ${
                  hasDemoPrice
                    ? 'text-lg sm:text-xl text-foreground'
                    : 'text-base sm:text-lg text-rose-600 dark:text-rose-400 font-bold'
                }`}
              >
                {demoPriceDisplay}
              </span>
            </div>
            {hasDemoPrice ? (
              <p className="text-[10px] text-muted-foreground/75 leading-tight mt-0.5">
                Illustrative demo listing price—not an actual farmer offer.
              </p>
            ) : (
              <p className="text-[10px] text-muted-foreground/75 leading-tight mt-0.5">
                Pricing not available. Currently out of stock.
              </p>
            )}
          </div>
        </div>

        {/* Card Action Buttons */}
        <div className="mt-4 flex items-center justify-between gap-2 pt-1">
          {onQuickView ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onQuickView(product)}
              className="h-8 text-xs flex-1 gap-1 border-border/80 hover:border-emerald-500/50"
            >
              <Eye className="h-3 w-3 text-muted-foreground" />
              <span>Quick View</span>
            </Button>
          ) : null}

          <Link href={`/marketplace/products/${product.id}`} className="flex-1">
            <Button
              size="sm"
              className="w-full h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1 shadow-sm"
            >
              <span>Details</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
