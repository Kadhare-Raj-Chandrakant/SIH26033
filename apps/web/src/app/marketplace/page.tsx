'use client';

import { Suspense, useTransition, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  fetchMarketplaceProducts,
  fetchCategories,
  fetchMarketplaceFilterOptions,
  type MarketplaceQueryParams,
  type MarketplaceProduct,
  type Category,
} from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { ProductCard } from '@/components/marketplace/product-card';
import { FilterSidebar } from '@/components/marketplace/filter-sidebar';
import { PaginationControls } from '@/components/marketplace/pagination-controls';
import { ListingDetailsModal } from '@/components/marketplace/listing-details-modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, PackageOpen, Sparkles, Filter, Search, X } from 'lucide-react';

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);

  // Extract query params from URL
  const filters: MarketplaceQueryParams = {
    search: searchParams.get('search') || undefined,
    categoryId: searchParams.get('categoryId') || undefined,
    state: searchParams.get('state') || undefined,
    district: searchParams.get('district') || undefined,
    location: searchParams.get('location') || undefined,
    minPrice: searchParams.get('minPrice')
      ? parseFloat(searchParams.get('minPrice')!)
      : undefined,
    maxPrice: searchParams.get('maxPrice')
      ? parseFloat(searchParams.get('maxPrice')!)
      : undefined,
    sort: (searchParams.get('sort') as MarketplaceQueryParams['sort']) || 'newest',
    page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
    limit: 18,
  };

  // Synchronize state changes to URL query parameters
  const updateFilters = (newFilters: Partial<MarketplaceQueryParams>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newFilters).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') {
        params.delete(key);
      } else {
        params.set(key, val.toString());
      }
    });

    startTransition(() => {
      router.push(`/marketplace?${params.toString()}`, { scroll: false });
    });
  };

  const resetFilters = () => {
    startTransition(() => {
      router.push('/marketplace', { scroll: false });
    });
  };

  // Queries
  const {
    data: productsData,
    isLoading: isProductsLoading,
    isError: isProductsError,
    error: productsError,
    refetch: refetchProducts,
  } = useQuery({
    queryKey: ['marketplace-products', filters],
    queryFn: () => fetchMarketplaceProducts(filters),
  });

  const { data: categoriesData } = useQuery<{ success: boolean; data: Category[] }>({
    queryKey: ['marketplace-categories'],
    queryFn: fetchCategories,
  });

  const { data: filterOptionsData } = useQuery({
    queryKey: ['marketplace-filter-options'],
    queryFn: fetchMarketplaceFilterOptions,
    staleTime: 60000,
  });

  const categories = categoriesData?.data || [];
  const filterOptions = filterOptionsData?.data;
  const products = productsData?.data || [];
  const meta = productsData?.meta;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <MarketplaceNavbar />

      {/* Hero / Header Bar */}
      <section className="border-b border-border/60 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent py-8 sm:py-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Direct From Certified Producers</span>
            </div>
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Buyer Agricultural Marketplace
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground">
              Discover, compare, and source verified farm-fresh produce directly from local farmers. All listings are direct farmer listings with authentic harvest and origin details.
            </p>
          </div>
        </div>
      </section>

      {/* Main Catalog View */}
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Mobile Filter Toggle */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="text-xs text-muted-foreground">
            {meta?.total ? `${meta.total} products found` : 'Searching...'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="gap-1.5 text-xs"
          >
            <Filter className="h-3.5 w-3.5 text-emerald-600" />
            {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Desktop / Collapsible Mobile Sidebar */}
          <aside
            className={`lg:col-span-1 ${
              mobileFiltersOpen ? 'block' : 'hidden lg:block'
            }`}
          >
            <div className="sticky top-24">
              <FilterSidebar
                categories={categories}
                filters={filters}
                filterOptions={filterOptions}
                onFilterChange={updateFilters}
                onResetFilters={resetFilters}
                isLoading={isProductsLoading}
              />
            </div>
          </aside>

          {/* Product Grid Area */}
          <section className="lg:col-span-3">
            {/* Active Search Feedback Banner */}
            {filters.search && (
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-emerald-600" />
                  <span className="text-muted-foreground">Showing produce matching:</span>
                  <span className="font-bold text-foreground">&ldquo;{filters.search}&rdquo;</span>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                    {meta?.total !== undefined ? `${meta.total} listings found` : 'Loading...'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => updateFilters({ search: undefined, page: 1 })}
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  <span>Clear Search</span>
                </Button>
              </div>
            )}

            {/* Loading State Skeleton */}
            {isProductsLoading && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="overflow-hidden rounded-xl border border-border/70 bg-card p-4 space-y-4"
                  >
                    <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <div className="flex justify-between pt-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {isProductsError && !isProductsLoading && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/5 p-12 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  Failed to Load Products
                </h3>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  {(productsError as Error)?.message ||
                    'An unexpected error occurred while fetching marketplace items.'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchProducts()}
                  className="mt-5"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Empty State */}
            {!isProductsLoading && !isProductsError && products.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-border/70 bg-card p-12 text-center shadow-sm">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
                  <PackageOpen className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-foreground">
                  No Available Products Found
                </h3>
                <p className="mt-1 max-w-md text-xs text-muted-foreground">
                  We could not find any active in-stock produce matching your current search criteria or price filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetFilters}
                  className="mt-5 text-xs text-emerald-600 hover:text-emerald-700"
                >
                  Reset All Filters
                </Button>
              </div>
            )}

            {/* Product Cards Grid */}
            {!isProductsLoading && !isProductsError && products.length > 0 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {products.map((product: MarketplaceProduct) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onQuickView={setSelectedProduct}
                    />
                  ))}
                </div>

                {/* Pagination Controls */}
                {meta && (
                  <PaginationControls
                    meta={meta}
                    onPageChange={(newPage: number) => updateFilters({ page: newPage })}
                    isLoading={isProductsLoading}
                  />
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Quick View / Listing Details Modal */}
      <ListingDetailsModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-sm font-medium text-muted-foreground animate-pulse">
            Loading Agricultural Marketplace...
          </div>
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
