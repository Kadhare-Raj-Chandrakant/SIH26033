'use client';

import Link from 'next/link';
import type { MarketplaceProduct, ProductLandedCostItem } from '@/lib/api';

interface ProductCardProps {
  product: MarketplaceProduct;
  onQuickView?: (product: MarketplaceProduct) => void;
  landedCost?: ProductLandedCostItem;
}

export function ProductCard({ product, onQuickView, landedCost }: ProductCardProps) {
  const primaryImage =
    product.primaryImage ||
    product.images?.find((img) => img.isPrimary)?.url ||
    product.images?.[0]?.url;

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

  const isOutOfStock =
    product.availableQuantity <= 0 ||
    product.status === 'OUT_OF_STOCK' ||
    product.status === 'SOLD_OUT' ||
    product.status === 'ARCHIVED' ||
    (!hasDemoPrice && !landedCost && (!product.price || product.price <= 0));

  const displayPrice = landedCost
    ? formatInr(landedCost.totalLandedCostPerQuintal)
    : hasDemoPrice
    ? formatInr(product.illustrativeFarmerListingReferenceInr)
    : isOutOfStock
    ? 'Out of Stock'
    : 'Inquire';

  const locationDisplay =
    product.district && product.state
      ? `${product.district} Mandi, ${product.state}`
      : product.location || 'India';

  const badgeText = product.seller?.sellerType === 'FPO' ? 'VERIFIED FPO' : 'QUALITY INSPECTED';

  return (
    <div className={`rounded-lg border overflow-hidden flex flex-col justify-between transition-shadow ${
      isOutOfStock
        ? 'border-[#E5DDD0] bg-[#FAF8F5]'
        : 'border-[#DFD8CB] bg-[#FCFAF6] hover:shadow-xs'
    }`}>
      <div>
        {/* Crop Photo Frame */}
        <div className="relative aspect-16/10 w-full bg-[#EAE4D6] border-b border-[#DFD8CB] overflow-hidden">
          <Link href={`/marketplace/products/${product.id}`} className="block h-full w-full">
            {primaryImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryImage}
                alt={product.name}
                className={`h-full w-full object-cover object-center transition-all ${
                  isOutOfStock ? 'grayscale-35 opacity-85' : ''
                }`}
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center select-none text-[#7A8070]">
                <span className="text-xs font-semibold">Image verified</span>
                <span className="text-[10px] text-[#8C9382] mt-0.5">Assay certificate active</span>
              </div>
            )}
          </Link>

          {/* Out of Stock Overlay Ribbon */}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-[#000000]/25 backdrop-blur-[0.5px] flex items-center justify-center pointer-events-none z-10">
              <span className="bg-[#B91C1C] text-[#FAF8F2] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded shadow-md">
                Out of Stock
              </span>
            </div>
          )}

          {/* Out of Stock Top-Left Badge */}
          {isOutOfStock ? (
            <span className="absolute top-2.5 left-2.5 bg-[#B91C1C] text-[#FAF8F2] text-[10px] font-sans font-bold px-2.5 py-0.5 rounded uppercase tracking-wider shadow-xs z-20">
              Out of Stock
            </span>
          ) : null}

          {/* Verification Badge */}
          <span className="absolute top-2.5 right-2.5 bg-[#2E4221] text-[#FAF8F2] text-[10px] font-sans font-bold px-2 py-0.5 rounded uppercase tracking-wider pointer-events-none z-20">
            {badgeText}
          </span>
        </div>

        {/* Product Details */}
        <div className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <Link href={`/marketplace/products/${product.id}`}>
                <h3 className={`font-serif font-bold text-lg transition-colors line-clamp-1 ${
                  isOutOfStock
                    ? 'text-[#505746] hover:text-[#1E221B]'
                    : 'text-[#1E221B] hover:text-[#2E4221]'
                }`}>
                  {product.name}
                </h3>
              </Link>
              <span className="text-xs text-[#5D6352] block mt-0.5">
                {product.varietyType || product.category?.name || 'Standard Agricultural Lot'}
              </span>
            </div>
          </div>

          {/* Specifications Table */}
          <div className="mt-4 space-y-1.5 text-xs text-[#505746] pt-3 border-t border-[#ECE5D8]">
            <div className="flex justify-between">
              <span className="text-[#7A8070]">Location / Mandi:</span>
              <span className="font-medium text-[#1E221B] text-right truncate max-w-[60%]">{locationDisplay}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#7A8070]">Available Quantity:</span>
              {isOutOfStock ? (
                <span className="font-semibold text-[#B91C1C] flex items-center gap-1.5">
                  <span>0 {product.unit ? product.unit.toLowerCase() : 'quintals'}</span>
                  <span className="text-[9px] uppercase font-bold bg-[#FEE2E2] text-[#991B1B] px-1.5 py-0.5 rounded">
                    Depleted
                  </span>
                </span>
              ) : (
                <span className="font-semibold text-[#1E221B]">
                  {product.availableQuantity} {product.unit.toLowerCase()}
                </span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-[#7A8070]">Producer Organization:</span>
              <span className="font-medium text-[#3B532B] truncate max-w-[55%]">
                {product.farmerName || product.seller.businessName || 'Verified Collective'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Procure Button */}
      <div className="p-5 pt-0">
        <div className={`flex items-center justify-between p-3.5 rounded border transition-colors ${
          isOutOfStock
            ? 'bg-[#FDF4F4] border-[#F5C6C6]'
            : 'bg-[#F4F0E6] border-[#E0D9CB]'
        }`}>
          <div>
            <span className="block text-[10px] text-[#7A8070] uppercase tracking-wider font-semibold">
              {isOutOfStock ? 'Availability' : landedCost ? 'Total Landed Cost' : 'Offer Price'}
            </span>
            <span className={`text-base font-serif font-bold ${
              isOutOfStock ? 'text-[#B91C1C]' : 'text-[#1E221B]'
            }`}>
              {isOutOfStock ? 'Out of Stock' : displayPrice ? `${displayPrice} / Qtl` : 'Price on request'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onQuickView && (
              <button
                type="button"
                onClick={() => onQuickView(product)}
                className="px-2.5 py-2 text-xs font-semibold uppercase tracking-wider text-[#3B532B] border border-[#C8C0AF] rounded hover:bg-[#EAE4D6] cursor-pointer"
                title="Quick View"
              >
                View
              </button>
            )}
            {isOutOfStock ? (
              <button
                type="button"
                disabled
                className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider bg-[#E8E2D5] text-[#7A8070] border border-[#D5CEBF] rounded cursor-not-allowed select-none"
                title="This produce lot is currently out of stock"
              >
                Out of Stock
              </button>
            ) : (
              <Link href={`/marketplace/products/${product.id}`}>
                <button className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#3B532B] hover:bg-[#2D4021] text-[#FAF8F2] rounded transition-colors cursor-pointer">
                  Procure Lot
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
