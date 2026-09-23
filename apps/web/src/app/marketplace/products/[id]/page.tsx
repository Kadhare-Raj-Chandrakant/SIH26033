'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchMarketplaceProductById } from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { ProductGallery } from '@/components/marketplace/product-gallery';
import { AddToCartSection } from '@/components/marketplace/add-to-cart-section';

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
      ? `${product.district} Mandi, ${product.state}`
      : product?.location || 'India';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      <MarketplaceNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-[#6B7260]">
          <Link
            href="/marketplace"
            className="hover:text-[#1E221B] font-medium"
          >
            ← Back to Marketplace
          </Link>
          {product && (
            <>
              <span>/</span>
              <span className="text-[#4E5446]">{product.category?.name}</span>
              <span>/</span>
              <span className="font-bold text-[#1E221B] truncate max-w-xs">
                {product.name}
              </span>
            </>
          )}
        </nav>

        {/* Loading State */}
        {isLoading && (
          <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
            <p className="text-sm font-serif font-bold text-[#1E221B]">
              Loading Agricultural Lot Specifications...
            </p>
          </div>
        )}

        {/* Error / Not Found */}
        {isError && !isLoading && (
          <div className="p-8 text-center border border-[#E5B5B5] rounded-lg bg-[#FDF2F2]">
            <h2 className="font-serif font-bold text-lg text-[#9B1C1C]">
              Produce Lot Unavailable
            </h2>
            <p className="mt-2 max-w-md mx-auto text-xs text-[#771D1D]">
              {(error as Error)?.message ||
                'This agricultural lot does not exist, has been archived, or is currently out of stock.'}
            </p>
            <Link href="/marketplace" className="inline-block mt-4">
              <button className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2] rounded">
                Return to Marketplace
              </button>
            </Link>
          </div>
        )}

        {/* Active Product Details */}
        {product && !isLoading && (
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
            {/* Left Column: Imagery & Specifications */}
            <div className="lg:col-span-7 space-y-8">
              <ProductGallery
                primaryImage={product.primaryImage}
                images={product.images}
                productName={product.name}
                location={locationDisplay}
              />

              {/* Product Specifications & Assaying Sheet */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#556448] block mb-1">
                    Commodity Profile
                  </span>
                  <h3 className="font-serif font-bold text-lg text-[#1E221B]">
                    Produce Assaying Specifications
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-[#5D6352] whitespace-pre-line">
                    {product.description ||
                      'Verified agricultural listing sourced directly from regional FPO collectives and independent producers.'}
                  </p>
                </div>

                {/* Technical Listing Parameters */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#52594B] mb-3">
                    Batch Metadata
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-3">
                      <span className="text-[10px] uppercase font-bold text-[#7A8070] block">Category</span>
                      <p className="font-bold text-[#1E221B] mt-0.5">
                        {product.category?.name || 'Produce'}
                      </p>
                    </div>

                    <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-3">
                      <span className="text-[10px] uppercase font-bold text-[#7A8070] block">Variety / Grade</span>
                      <p className="font-bold text-[#1E221B] mt-0.5">
                        {product.varietyType || 'Standard Commercial'}
                      </p>
                    </div>

                    <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-3">
                      <span className="text-[10px] uppercase font-bold text-[#7A8070] block">Trading Unit</span>
                      <p className="font-bold text-[#1E221B] mt-0.5">
                        {product.sellingUnit || product.unit}
                      </p>
                    </div>

                    <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-3">
                      <span className="text-[10px] uppercase font-bold text-[#7A8070] block">Available Lot Size</span>
                      <p className="font-bold text-[#1E221B] mt-0.5">
                        {product.availableQuantity} {product.unit}
                      </p>
                    </div>

                    <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-3">
                      <span className="text-[10px] uppercase font-bold text-[#7A8070] block">Origin APMC</span>
                      <p className="font-bold text-[#1E221B] mt-0.5">
                        {locationDisplay}
                      </p>
                    </div>

                    <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-3">
                      <span className="text-[10px] uppercase font-bold text-[#7A8070] block">Settlement Type</span>
                      <p className="font-bold text-[#2E7D32] mt-0.5">
                        Banking Escrow
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {product.notes && (
                  <div className="rounded border border-[#CCDBCB] bg-[#F0F5EE] p-4 text-xs">
                    <span className="font-bold uppercase tracking-wider text-[#233D22] text-[10px] block mb-1">
                      Mandi Inspection & Source Notes
                    </span>
                    <p className="text-[#3E4536] leading-relaxed">
                      {product.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Pricing, Seller Card, Add To Cart */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-5">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E8F0E2] text-[#233D22] px-2.5 py-0.5 rounded border border-[#CCDBCB]">
                    {product.category?.name}
                  </span>
                  {product.varietyType && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[#F7F5EE] text-[#484E40] px-2.5 py-0.5 rounded border border-[#DFD8CB]">
                      {product.varietyType}
                    </span>
                  )}
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2] px-2.5 py-0.5 rounded">
                    In Stock: {product.availableQuantity} {product.unit}
                  </span>
                </div>

                {/* Title & Location */}
                <div>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B]">
                    {product.name}
                  </h1>
                  <span className="mt-1.5 text-xs text-[#5D6352] block">
                    {locationDisplay}
                  </span>
                </div>

                {/* Price Display */}
                <div className="p-4 rounded border border-[#DFD8CB] bg-[#F4F0E6]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A8070] block">
                    Direct Farmer / FPO Listing Rate
                  </span>
                  <div className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] mt-1">
                    {demoPriceDisplay}
                  </div>
                  <p className="text-[11px] text-[#6B7260] mt-1">
                    Ex-farmgate benchmark rate. Net delivered cost calculated with road logistics.
                  </p>
                </div>

                {/* Producer Information */}
                <div className="p-4 rounded border border-[#DFD8CB] bg-[#FAF8F2] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#52594B]">
                      Producer Collective
                    </span>
                    <span className="text-[10px] font-bold uppercase bg-[#E2EDE2] text-[#233D22] px-2 py-0.5 rounded border border-[#CCDBCB]">
                      {product.seller.verificationStatus || 'VERIFIED PRODUCER'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-bold text-[#1E221B] text-sm">
                      {product.farmerName || product.seller.businessName || 'Verified Regional Collective'}
                    </p>
                    {product.farmName && (
                      <p className="text-[#6B7260]">
                        Farm Facility: {product.farmName}
                      </p>
                    )}
                    <p className="text-[#6B7260]">
                      Location: {locationDisplay}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#DFD8CB] text-[10px] text-[#556448]">
                    Direct origin traceability with verified APMC weighment certificate.
                  </div>
                </div>

                {/* Add to Cart Component */}
                <AddToCartSection product={product} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DFD8CB] bg-[#FAF8F2] py-8 text-center text-xs text-[#6B7260]">
        <div className="max-w-7xl mx-auto px-4">
          <p>Aroha Agricultural Marketplace Commodity Assaying & Trade Sheet</p>
        </div>
      </footer>
    </div>
  );
}
