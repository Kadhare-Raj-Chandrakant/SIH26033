'use client';

import { useState, useEffect } from 'react';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Layers,
  FileText,
  TrendingUp,
  Tag,
  ArrowRight,
  ShieldCheck,
  Scale,
  X,
  User,
  ImageOff,
  PackageCheck,
  Info,
  AlertCircle,
} from 'lucide-react';
import type { MarketplaceProduct } from '@/lib/api';

interface ListingDetailsModalProps {
  product: MarketplaceProduct | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ListingDetailsModal({
  product,
  isOpen,
  onClose,
}: ListingDetailsModalProps) {
  // Lock body scroll and listen for Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  // Single primary image for listing
  const primaryImage =
    product.primaryImage ||
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url;

  // Indian Rupee number formatter
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

  const formattedDemoPrice = hasDemoPrice
    ? `${formatInr(product.illustrativeFarmerListingReferenceInr)} / quintal`
    : 'Out of stock';

  const locationDisplay =
    product.district && product.state
      ? `${product.district}, ${product.state}`
      : product.location || 'India';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="listing-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/80 bg-card text-card-foreground shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/85 backdrop-blur-md text-foreground hover:bg-background shadow-md transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Hero Image with Single Primary Image */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-zinc-100/90 dark:bg-zinc-900/90 flex items-center justify-center">
          {primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={primaryImage}
              alt={product.name}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center select-none">
              <div className="h-12 w-12 rounded-xl bg-zinc-200/80 dark:bg-zinc-800/80 flex items-center justify-center mb-2 text-zinc-400 dark:text-zinc-500">
                <ImageOff className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Image unavailable
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Farmer photo pending verification
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent pointer-events-none" />

          {/* Badges Overlay */}
          <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-2 pointer-events-none">
            <Badge className="bg-background/90 text-foreground backdrop-blur-md text-xs font-semibold shadow-sm">
              {product.category?.name || 'Produce'}
            </Badge>
            {product.varietyType && (
              <Badge variant="secondary" className="backdrop-blur-md text-xs shadow-sm">
                Variety: {product.varietyType}
              </Badge>
            )}
          </div>
        </div>


        {/* Content Container */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Header Info */}
          <div>
            <h2 id="listing-modal-title" className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground">
              {product.name}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span>{locationDisplay}</span>
              </div>
              {product.farmName && (
                <>
                  <span>•</span>
                  <span>{product.farmName}</span>
                </>
              )}
              {product.farmerName && (
                <>
                  <span>•</span>
                  <span className="font-medium text-foreground">
                    Farmer: {product.farmerName}
                  </span>
                </>
              )}
              <span>•</span>
              {hasDemoPrice ? (
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <PackageCheck className="h-3.5 w-3.5" />
                  Available: {product.availableQuantity} {product.unit}
                </span>
              ) : (
                <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Out of stock
                </span>
              )}
            </div>
          </div>

          {/* Price Box */}
          <div>
            <div className={`rounded-xl border p-4 space-y-1.5 ${hasDemoPrice ? 'border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/25' : 'border-rose-500/30 bg-rose-50/40 dark:bg-rose-950/20'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${hasDemoPrice ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                  Farmer’s listing price
                </span>
                <Badge variant="outline" className={`text-[10px] ${hasDemoPrice ? 'border-emerald-600/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10' : 'border-rose-600/30 text-rose-700 dark:text-rose-300 bg-rose-500/10'}`}>
                  {hasDemoPrice ? 'Farmer Listing' : 'Unavailable'}
                </Badge>
              </div>
              <div className={`text-xl sm:text-2xl font-extrabold ${hasDemoPrice ? 'text-foreground' : 'text-rose-600 dark:text-rose-400'}`}>
                {formattedDemoPrice}
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {hasDemoPrice
                  ? 'Illustrative demo listing price—not an actual farmer offer.'
                  : 'Pricing not available. Currently out of stock.'}
              </p>
            </div>
          </div>

          {/* Key Specifications Grid */}
          <div className="rounded-xl border border-border/80 bg-card p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Listing Specifications
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">Available Stock</span>
                <p className={`font-semibold flex items-center gap-1 ${hasDemoPrice ? 'text-foreground' : 'text-rose-600 dark:text-rose-400'}`}>
                  {hasDemoPrice ? (
                    <>
                      <PackageCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{product.availableQuantity} {product.unit}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                      <span>Out of stock</span>
                    </>
                  )}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">Variety Type</span>
                <p className="font-semibold text-foreground">
                  {product.varietyType || 'Standard'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">Selling Unit</span>
                <p className="font-semibold text-foreground flex items-center gap-1">
                  <Scale className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>{product.sellingUnit || 'Rs./Quintal'}</span>
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">District</span>
                <p className="font-semibold text-foreground">
                  {product.district || 'Not Specified'}
                </p>
              </div>

              <div className="space-y-0.5">
                <span className="text-muted-foreground block text-[11px]">State</span>
                <p className="font-semibold text-foreground">
                  {product.state || 'India'}
                </p>
              </div>
            </div>
          </div>

          {/* Official Notes & Methodology */}
          {product.notes && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                <span>Dataset Notes & Methodology</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {product.notes}
              </p>
            </div>
          )}

          {/* Verification Badge & Direct Farmer Notice */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-emerald-500/25 p-3.5 bg-emerald-500/5 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-semibold text-foreground block">
                  {product.farmerName} • {product.farmName || 'Verified Farm'}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Direct farmer listing • Verified produce listed directly by the producer.
                </span>
              </div>
            </div>
            <Badge variant="farmer" className="text-[10px] shrink-0 self-start sm:self-auto">
              Direct Producer
            </Badge>
          </div>

          <Separator />

          {/* Footer Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
              Close
            </Button>
            <Link href={`/marketplace/products/${product.id}`}>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
                <span>View Full Page</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
