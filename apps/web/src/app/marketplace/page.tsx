'use client';

import { Suspense, useTransition, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  fetchMarketplaceProducts,
  fetchCategories,
  fetchMarketplaceFilterOptions,
  getMarketplaceLandedCost,
  fetchAddresses,
  type MarketplaceQueryParams,
  type MarketplaceProduct,
  type Category,
  type MarketplaceLandedCostResult,
  type ProductLandedCostItem,
} from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { ProductCard } from '@/components/marketplace/product-card';
import { FilterSidebar } from '@/components/marketplace/filter-sidebar';
import { PaginationControls } from '@/components/marketplace/pagination-controls';
import { ListingDetailsModal } from '@/components/marketplace/listing-details-modal';
import { useAuth } from '@/components/providers/auth-provider';

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);

  const { token } = useAuth();
  const [isLandedCostMode, setIsLandedCostMode] = useState<boolean>(true);
  const [buyerCity, setBuyerCity] = useState<string>('Mumbai');
  const [buyerState, setBuyerState] = useState<string>('Maharashtra');

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

  const { data: addressData } = useQuery({
    queryKey: ['buyer-addresses', token],
    queryFn: () => fetchAddresses(token || undefined),
    enabled: !!token,
  });

  useEffect(() => {
    if (addressData?.data && addressData.data.length > 0) {
      const def = addressData.data.find((a) => a.isDefault) || addressData.data[0];
      if (def.city) setBuyerCity(def.city);
      if (def.state) setBuyerState(def.state);
    }
  }, [addressData]);

  const {
    data: landedCostData,
    isLoading: isLandedCostLoading,
  } = useQuery<MarketplaceLandedCostResult>({
    queryKey: ['marketplace-landed-cost', buyerCity, buyerState, filters.search],
    queryFn: () =>
      getMarketplaceLandedCost(
        {
          destinationCity: buyerCity,
          destinationState: buyerState,
          commodity: filters.search || undefined,
        },
        token || undefined,
      ),
    enabled: isLandedCostMode,
    staleTime: 60000,
  });

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

  const landedCostMap = new Map<string, ProductLandedCostItem>();
  if (isLandedCostMode && landedCostData?.products) {
    for (const item of landedCostData.products) {
      landedCostMap.set(item.productId, item);
    }
  }

  const sortedProducts = [...products].sort((a, b) => {
    if (isLandedCostMode && landedCostMap.size > 0) {
      const itemA = landedCostMap.get(a.id);
      const itemB = landedCostMap.get(b.id);
      const costA = itemA ? itemA.totalLandedCostPerQuintal : Infinity;
      const costB = itemB ? itemB.totalLandedCostPerQuintal : Infinity;
      return costA - costB;
    }
    return 0;
  });

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B]">
      <MarketplaceNavbar />

      {/* Hero / Header Bar */}
      <section className="border-b border-[#DFD8CB] bg-[#FAF8F2] py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E2EDE2] text-[#233D22] border border-[#CCDBCB] mb-2.5">
                Verified Agricultural Trade Gateway
              </span>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#1E221B]">
                Marketplace Showcase
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[#616857] leading-relaxed">
                Direct trade lots from verified farmers and FPOs with deterministic road logistics, digital assaying slips, and escrow payment settlement.
              </p>
            </div>

            {/* Landed Cost Mode Control Box */}
            <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-4 sm:p-5 space-y-3 min-w-[320px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1E221B]">
                  Landed Cost Intelligence
                </span>
                <button
                  onClick={() => setIsLandedCostMode(!isLandedCostMode)}
                  className={`px-3 py-1 text-xs font-semibold rounded border transition-colors ${
                    isLandedCostMode
                      ? 'bg-[#233D22] text-[#FAF8F2] border-[#233D22]'
                      : 'bg-[#FFFFFF] text-[#484E40] border-[#DFD8CB]'
                  }`}
                >
                  {isLandedCostMode ? 'Active' : 'Enable'}
                </button>
              </div>

              {isLandedCostMode && (
                <div className="space-y-2 pt-2 border-t border-[#ECE5D8]">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-[#6B7260] font-medium">Delivery Destination:</span>
                    <select
                      value={buyerCity}
                      onChange={(e) => {
                        const city = e.target.value;
                        setBuyerCity(city);
                        if (city === 'Delhi') setBuyerState('Delhi');
                        else if (city === 'Ahmedabad') setBuyerState('Gujarat');
                        else if (city === 'Indore') setBuyerState('Madhya Pradesh');
                        else if (city === 'Hyderabad') setBuyerState('Telangana');
                        else setBuyerState('Maharashtra');
                      }}
                      className="h-8 px-2 rounded border border-[#DFD8CB] bg-[#F7F5EE] text-xs font-semibold text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                    >
                      <option value="Mumbai">Mumbai, Maharashtra</option>
                      <option value="Pune">Pune, Maharashtra</option>
                      <option value="Delhi">Delhi, Delhi</option>
                      <option value="Ahmedabad">Ahmedabad, Gujarat</option>
                      <option value="Indore">Indore, Madhya Pradesh</option>
                      <option value="Hyderabad">Hyderabad, Telangana</option>
                    </select>
                  </div>
                  <span className="text-[10px] text-[#7A8070] block">
                    Calculates: Farmgate Price + Commercial Road Freight + Handling
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog View */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Mobile Filter Toggle */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <span className="text-xs text-[#6B7260]">
            {meta?.total ? `${meta.total} trading lots active` : 'Searching...'}
          </span>
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="h-8 px-3 text-xs font-semibold uppercase tracking-wider text-[#233D22] border border-[#DFD8CB] bg-[#FFFFFF] rounded"
          >
            {mobileFiltersOpen ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4 items-start">
          {/* Sidebar */}
          <aside className={`lg:col-span-1 ${mobileFiltersOpen ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-28">
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
            {/* Active Landed Cost Decision Banner */}
            {isLandedCostMode && landedCostData && (
              <div className="mb-6 rounded-lg border border-[#CCDBCB] bg-[#F0F5EE] p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="bg-[#233D22] text-[#FAF8F2] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                      Landed Cost Engine
                    </span>
                    <span className="text-xs font-bold text-[#1E221B]">
                      Destination: {landedCostData.buyerDestination.city}, {landedCostData.buyerDestination.state}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#5A6352] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#DFD8CB]">
                    {landedCostData.calculationFormula}
                  </span>
                </div>
                <p className="text-xs text-[#3E4536] leading-relaxed">
                  {landedCostData.summaryExplanation}
                </p>
              </div>
            )}

            {/* Active Search Feedback Banner */}
            {filters.search && (
              <div className="mb-5 flex items-center justify-between p-3 rounded border border-[#DFD8CB] bg-[#FAF8F2] text-xs">
                <div>
                  <span className="text-[#6B7260]">Filtered by search: </span>
                  <strong className="text-[#1E221B]">&ldquo;{filters.search}&rdquo;</strong>
                  <span className="ml-2 text-[10px] font-bold uppercase bg-[#EAE4D6] px-2 py-0.5 rounded text-[#4B5242]">
                    {meta?.total !== undefined ? `${meta.total} lots found` : 'Searching...'}
                  </span>
                </div>
                <button
                  onClick={() => updateFilters({ search: undefined, page: 1 })}
                  className="text-xs font-semibold text-[#8B4513] hover:underline"
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Loading State (No pulsing skeletons) */}
            {isProductsLoading && (
              <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
                <span className="text-xs font-bold uppercase tracking-wider text-[#6B7260] block mb-2">
                  Querying APMC & Farmgate Nodes
                </span>
                <p className="text-sm font-serif font-bold text-[#1E221B]">
                  Loading verified agricultural batches...
                </p>
              </div>
            )}

            {/* Error State */}
            {isProductsError && !isProductsLoading && (
              <div className="p-8 text-center border border-[#E5B5B5] rounded-lg bg-[#FDF2F2]">
                <h3 className="font-serif font-bold text-base text-[#9B1C1C]">
                  Unable to Retrieve Market Listings
                </h3>
                <p className="mt-1 text-xs text-[#771D1D] max-w-md mx-auto">
                  {(productsError as Error)?.message ||
                    'An unexpected network error occurred while querying the commodity index.'}
                </p>
                <button
                  onClick={() => refetchProducts()}
                  className="mt-4 px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2] rounded"
                >
                  Retry Request
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isProductsLoading && !isProductsError && products.length === 0 && (
              <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
                <h3 className="font-serif font-bold text-lg text-[#1E221B]">
                  No Matching Commodity Batches Found
                </h3>
                <p className="mt-2 text-xs text-[#6B7260] max-w-md mx-auto leading-relaxed">
                  No active harvest lots match your currently selected filters or price thresholds. Adjust your filters or reset to browse all lots.
                </p>
                <button
                  onClick={resetFilters}
                  className="mt-5 px-5 py-2 text-xs font-semibold uppercase tracking-wider border border-[#233D22] text-[#233D22] rounded hover:bg-[#EAE4D6]"
                >
                  Reset All Filters
                </button>
              </div>
            )}

            {/* Product Cards Grid */}
            {!isProductsLoading && !isProductsError && sortedProducts.length > 0 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {sortedProducts.map((product: MarketplaceProduct) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onQuickView={setSelectedProduct}
                      landedCost={landedCostMap.get(product.id)}
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
        <div className="min-h-screen flex items-center justify-center bg-[#F7F5EE] text-xs text-[#6B7260]">
          Loading Agricultural Marketplace...
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
