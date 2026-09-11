'use client';

import { useState } from 'react';
import { Layers } from 'lucide-react';
import type { ProductImage } from '@/lib/api';

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const primary = images.find((i) => i.isPrimary) || images[0];
  const [activeUrl, setActiveUrl] = useState<string | undefined>(primary?.url);

  if (!images || images.length === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center rounded-2xl border border-border/80 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 text-muted-foreground shadow-sm">
        <Layers className="h-16 w-16 text-emerald-600/40" />
        <span className="mt-2 text-sm font-medium text-muted-foreground/80">
          Fresh Agricultural Produce
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Image Frame */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/80 bg-muted/30 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeUrl || primary?.url}
          alt={productName}
          className="h-full w-full object-cover object-center transition-all duration-300"
        />
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setActiveUrl(img.url)}
              className={`relative aspect-square w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                activeUrl === img.url
                  ? 'border-emerald-600 ring-2 ring-emerald-600/30'
                  : 'border-border opacity-70 hover:opacity-100'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={productName}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
