'use client';

import Link from 'next/link';
import { MapPin, UserCheck, PackageCheck, ArrowRight, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MarketplaceProduct } from '@/lib/api';

interface ProductCardProps {
  product: MarketplaceProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const primaryImage =
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url;

  return (
    <Card className="group flex flex-col overflow-hidden border border-border/80 bg-card hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
      {/* Product Image Area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40">
        {primaryImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={primaryImage}
            alt={product.name}
            className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 text-muted-foreground">
            <Layers className="h-10 w-10 text-emerald-600/40" />
            <span className="text-xs font-medium text-muted-foreground/80">Fresh Produce</span>
          </div>
        )}

        {/* Category & Status Overlay Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="backdrop-blur-sm bg-background/80 text-xs font-medium">
            {product.category?.name || 'General'}
          </Badge>
          <Badge
            variant={product.seller.sellerType === 'FPO' ? 'fpo' : 'farmer'}
            className="text-[11px] font-semibold"
          >
            {product.seller.sellerType}
          </Badge>
        </div>

        {/* Availability Badge */}
        <div className="absolute bottom-2.5 right-2.5">
          <Badge variant="success" className="text-[11px] font-medium shadow-sm">
            <PackageCheck className="mr-1 h-3 w-3" />
            {product.availableQuantity} {product.unit} Available
          </Badge>
        </div>
      </div>

      {/* Card Content */}
      <CardContent className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2">
          <h3 className="line-clamp-1 text-base font-semibold text-foreground group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>
          <p className="line-clamp-2 mt-1 text-xs text-muted-foreground">
            {product.description || 'Direct fresh agricultural supply directly from source.'}
          </p>
        </div>

        {/* Location & Seller Info */}
        <div className="mt-auto space-y-1.5 pt-3 border-t border-border/50 text-xs text-muted-foreground">
          {product.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">{product.location}</span>
            </div>
          )}
          {product.seller.businessName && (
            <div className="flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate font-medium text-foreground/80">
                {product.seller.businessName}
              </span>
            </div>
          )}
        </div>

        {/* Pricing and Action Button */}
        <div className="mt-4 flex items-center justify-between pt-2">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-foreground">
                ₹{product.price.toFixed(2)}
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                / {product.unit}
              </span>
            </div>
          </div>

          <Link href={`/marketplace/products/${product.id}`}>
            <Button size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
              <span>Details</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
