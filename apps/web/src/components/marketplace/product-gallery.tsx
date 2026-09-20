'use client';

import { ImageOff, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProductImage } from '@/lib/api';

interface ProductGalleryProps {
  primaryImage?: string | null;
  images?: ProductImage[];
  productName: string;
  location?: string;
}

export function ProductGallery({
  primaryImage,
  images = [],
  productName,
  location,
}: ProductGalleryProps) {
  // Exactly ONE primary image per listing
  const imageUrl =
    primaryImage ||
    images.find((img) => img.isPrimary)?.url ||
    images[0]?.url;

  const hasImage = Boolean(imageUrl);

  return (
    <div className="space-y-4">
      {/* Exactly ONE Primary Image Frame */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/80 bg-zinc-100/90 dark:bg-zinc-900/90 shadow-sm flex items-center justify-center">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={`${productName} primary photo`}
            className="h-full w-full object-cover object-center transition-all duration-300"
          />
        ) : (
          // Neutral "Image unavailable" placeholder
          <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center select-none">
            <div className="h-16 w-16 rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 flex items-center justify-center mb-3 text-zinc-400 dark:text-zinc-500 shadow-inner">
              <ImageOff className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
              Image unavailable
            </h3>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              No verified farmer-uploaded photo is currently available for {productName}
              {location ? ` (${location})` : ''}.
            </p>
            <div className="mt-4 flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-background/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-xs">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Genuine Farmer Upload Pending Verification</span>
            </div>
          </div>
        )}

        {/* Verification Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          {hasImage ? (
            <Badge variant="success" className="backdrop-blur-md text-[11px] shadow-xs gap-1">
              <ShieldCheck className="h-3 w-3" />
              Verified Farmer Photo
            </Badge>
          ) : (
            <Badge variant="outline" className="backdrop-blur-md bg-background/85 text-[11px] shadow-xs text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700">
              No Photo Available
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
