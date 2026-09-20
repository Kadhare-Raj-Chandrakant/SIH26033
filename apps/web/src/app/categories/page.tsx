'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Sprout,
  ArrowRight,
  Search,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Package,
  Layers,
  ShoppingBag,
  Wheat,
  Apple,
  Carrot,
  Droplets,
  Coffee,
  Flower2,
  Leaf,
} from 'lucide-react';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchCategories, type Category } from '@/lib/api';

// Specific visual and icon mapping for the 10 agricultural categories

function getCategoryVisuals(slug: string, name: string) {
  const lower = (slug + ' ' + name).toLowerCase();

  // 1. Cereals & Grains
  if (lower.includes('cereal') || lower.includes('grain') || lower.includes('wheat') || lower.includes('rice')) {
    return {
      Icon: Wheat,
      bgGradient: 'from-amber-500/15 to-amber-600/5',
      badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
      tag: 'Staple Grains',
    };
  }

  // 2. Pulses & Legumes
  if (lower.includes('pulse') || lower.includes('legume') || lower.includes('dal') || lower.includes('chana')) {
    return {
      Icon: Sprout,
      bgGradient: 'from-lime-500/15 to-emerald-600/5',
      badgeClass: 'bg-lime-500/10 text-lime-800 dark:text-lime-300 border-lime-500/20',
      iconColor: 'text-lime-700 dark:text-lime-400',
      tag: 'High Protein',
    };
  }

  // 3. Vegetables
  if (lower.includes('veg') || lower.includes('tomato') || lower.includes('onion') || lower.includes('potato')) {
    return {
      Icon: Carrot,
      bgGradient: 'from-emerald-500/15 to-emerald-600/5',
      badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      tag: 'Fresh Harvest',
    };
  }

  // 4. Fruits
  if (lower.includes('fruit') || lower.includes('apple') || lower.includes('mango') || lower.includes('banana')) {
    return {
      Icon: Apple,
      bgGradient: 'from-rose-500/15 to-rose-600/5',
      badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
      iconColor: 'text-rose-600 dark:text-rose-400',
      tag: 'Orchard Fresh',
    };
  }

  // 5. Oilseeds
  if (lower.includes('oil') || lower.includes('mustard') || lower.includes('soybean') || lower.includes('groundnut')) {
    return {
      Icon: Droplets,
      bgGradient: 'from-yellow-500/15 to-amber-600/5',
      badgeClass: 'bg-yellow-500/10 text-yellow-800 dark:text-yellow-300 border-yellow-500/20',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      tag: 'Oil & Seeds',
    };
  }

  // 6. Spices & Condiments
  if (lower.includes('spice') || lower.includes('condiment') || lower.includes('chili') || lower.includes('turmeric')) {
    return {
      Icon: Sparkles,
      bgGradient: 'from-orange-500/15 to-orange-600/5',
      badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20',
      iconColor: 'text-orange-600 dark:text-orange-400',
      tag: 'Aromatic & Pure',
    };
  }

  // 7. Cash & Fibre Crops
  if (lower.includes('cash') || lower.includes('fibre') || lower.includes('fiber') || lower.includes('cotton') || lower.includes('jute')) {
    return {
      Icon: Layers,
      bgGradient: 'from-indigo-500/15 to-indigo-600/5',
      badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
      tag: 'Commercial Fibre',
    };
  }

  // 8. Plantation & Beverage Crops
  if (lower.includes('plantation') || lower.includes('beverage') || lower.includes('tea') || lower.includes('coffee')) {
    return {
      Icon: Coffee,
      bgGradient: 'from-stone-500/15 to-amber-900/10',
      badgeClass: 'bg-stone-500/10 text-stone-700 dark:text-stone-300 border-stone-500/20',
      iconColor: 'text-stone-700 dark:text-stone-400',
      tag: 'Estate & Beverage',
    };
  }

  // 9. Fodder Crops
  if (lower.includes('fodder') || lower.includes('forage') || lower.includes('feed') || lower.includes('silage')) {
    return {
      Icon: Leaf,
      bgGradient: 'from-green-600/15 to-emerald-700/5',
      badgeClass: 'bg-green-600/10 text-green-800 dark:text-green-300 border-green-600/20',
      iconColor: 'text-green-700 dark:text-green-400',
      tag: 'Livestock Forage',
    };
  }

  // 10. Flowers & Medicinal Plants
  if (lower.includes('flower') || lower.includes('medicinal') || lower.includes('herb') || lower.includes('plant')) {
    return {
      Icon: Flower2,
      bgGradient: 'from-fuchsia-500/15 to-pink-600/5',
      badgeClass: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/20',
      iconColor: 'text-fuchsia-600 dark:text-fuchsia-400',
      tag: 'Blooms & Herbal',
    };
  }

  return {
    Icon: Sprout,
    bgGradient: 'from-teal-500/15 to-teal-600/5',
    badgeClass: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
    tag: 'Agricultural Crop',
  };
}

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: categoriesResponse,
    isLoading,
    isError,
    error,
  } = useQuery<{ success: boolean; data: Category[] }>({
    queryKey: ['marketplace-categories'],
    queryFn: fetchCategories,
  });

  const categories = useMemo(() => {
    return categoriesResponse?.data || [];
  }, [categoriesResponse]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase().trim();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        (cat.description && cat.description.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/"
            className="flex items-center gap-1 font-medium hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Home
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Categories Directory</span>
        </nav>

        {/* Hero Header */}
        <div className="mb-10 rounded-2xl border border-border/70 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6 sm:p-8 lg:p-10 shadow-sm relative overflow-hidden">
          <div className="max-w-3xl relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Layers className="h-3.5 w-3.5" />
              <span>Direct Farm Commodities</span>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Browse Agricultural Categories
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base leading-relaxed">
              Explore farm-fresh produce grouped by commodity. Choose a category to discover verified direct producer listings, real-time APMC mandi prices, and transparent wholesale lots.
            </p>

            {/* Search Categories Input */}
            <div className="mt-6 max-w-md relative">
              <Input
                type="text"
                placeholder="Search categories (e.g. Vegetables, Grains)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-11 text-sm bg-background/90 rounded-xl border-border/80 shadow-sm"
              />
              <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 animate-pulse"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <Skeleton className="h-5 w-24 rounded-full" />
                </div>
                <Skeleton className="h-6 w-3/4 rounded-lg" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-8 text-center max-w-lg mx-auto">
            <p className="text-sm font-semibold text-destructive">
              {error instanceof Error ? error.message : 'Unable to load categories at this time.'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-4 text-xs"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Categories Grid (Amazon-Style Cards) */}
        {!isLoading && !isError && filteredCategories.length > 0 && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat) => {
              const visuals = getCategoryVisuals(cat.slug, cat.name);
              const CategoryIcon = visuals.Icon;
              return (
                <Card
                  key={cat.id}
                  className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm hover:shadow-md transition-all hover:border-emerald-500/50 flex flex-col justify-between"
                >
                  {/* Subtle top gradient background */}
                  <div
                    className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-b ${visuals.bgGradient} pointer-events-none -z-0`}
                  />

                  <CardContent className="p-6 relative z-10 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-background border border-border/80 shadow-sm">
                          <CategoryIcon className={`h-6 w-6 ${visuals.iconColor}`} />
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${visuals.badgeClass}`}
                        >
                          {visuals.tag}
                        </Badge>
                      </div>

                      {/* Title & Description */}
                      <h3 className="text-xl font-bold tracking-tight text-foreground group-hover:text-emerald-600 transition-colors">
                        {cat.name}
                      </h3>
                      <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                        {cat.description ||
                          `Browse certified producer listings, wholesale quantities, and direct pricing for ${cat.name}.`}
                      </p>
                    </div>

                    {/* Action Button */}
                    <div className="mt-6 pt-4 border-t border-border/50">
                      <Link href={`/marketplace?categoryId=${cat.id}`} className="block">
                        <Button
                          size="sm"
                          className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-sm gap-2 transition-all flex items-center justify-center"
                        >
                          <span>Explore {cat.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty Search Results */}
        {!isLoading && !isError && filteredCategories.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center max-w-md mx-auto">
            <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground">No Categories Found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              No categories match your search for &quot;{searchQuery}&quot;.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="mt-4 text-xs"
            >
              Clear Search Filter
            </Button>
          </div>
        )}

        {/* Bottom Banner */}
        <div className="mt-14 rounded-2xl border border-border/70 bg-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">
                Looking for the full produce catalog?
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Browse all available listings with price sliders, sorting, and location filters.
              </p>
            </div>
          </div>
          <Link href="/marketplace">
            <Button size="sm" variant="outline" className="text-xs font-semibold gap-2 shrink-0">
              <span>Go to Full Marketplace</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
