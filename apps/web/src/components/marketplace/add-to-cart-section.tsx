'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addToCart, MarketplaceProduct } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';

interface AddToCartSectionProps {
  product: MarketplaceProduct;
}

export function AddToCartSection({ product }: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1);
  const [successMessage, setSuccessMessage] = useState(false);
  const queryClient = useQueryClient();
  const { token, user, isAuthenticated } = useAuth();

  const isBuyer = user?.role === 'BUYER';
  const isFarmer = user?.role === 'FARMER' || user?.role === 'FPO';

  const maxStock = product.availableQuantity || 0;
  const hasValidPrice =
    product.price !== null &&
    product.price !== undefined &&
    !isNaN(product.price) &&
    product.price > 0 &&
    product.illustrativeFarmerListingReferenceInr !== null &&
    product.illustrativeFarmerListingReferenceInr !== undefined &&
    !isNaN(product.illustrativeFarmerListingReferenceInr) &&
    product.illustrativeFarmerListingReferenceInr > 0;

  const isOutOfStock = maxStock <= 0 || product.status !== 'ACTIVE' || !hasValidPrice;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!hasValidPrice) {
        throw new Error('This item is currently out of stock and cannot be added to cart.');
      }
      if (!isAuthenticated || !isBuyer || !token) {
        throw new Error('Please sign in with a Buyer account to add items to cart.');
      }
      return addToCart(product.id, quantity, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    },
  });

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < maxStock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      setQuantity(1);
    } else if (val > maxStock) {
      setQuantity(maxStock);
    } else {
      setQuantity(val);
    }
  };

  const handleAddToCart = () => {
    mutation.mutate();
  };

  if (isOutOfStock) {
    return (
      <div className="rounded-lg border border-[#DFD8CB] bg-[#FDF2F2] p-5 text-center space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-[#9B1C1C] block">
          Produce Out of Stock
        </span>
        <p className="text-xs text-[#771D1D] leading-relaxed">
          {!hasValidPrice
            ? 'This batch is currently pending APMC price verification or is archived. Please check back for subsequent harvest cycles.'
            : 'This produce lot is currently committed or out of stock. Contact the producer collective for future contracts.'}
        </p>
      </div>
    );
  }

  const returnUrl = `/marketplace/products/${product.id}`;

  // 1. Logged-out Visitor Experience
  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 text-center space-y-3.5">
        <div className="w-10 h-10 mx-auto rounded-full bg-[#E2EDE2] flex items-center justify-center text-[#233D22]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="8" cy="21" r="1" />
            <circle cx="19" cy="21" r="1" />
            <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-serif font-bold text-[#1E221B]">Sign In to Procure</h3>
          <p className="text-xs text-[#6B7260] leading-relaxed max-w-sm mx-auto mt-1">
            Direct farmgate lot purchase, escrow reservation, and trade contract generation require an authenticated <strong>Buyer</strong> account.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
          <Link
            href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="w-full sm:w-auto"
          >
            <button className="w-full sm:w-auto h-9 px-5 text-xs font-bold uppercase tracking-wider bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] rounded transition-colors">
              Sign In as Buyer
            </button>
          </Link>
          <Link
            href={`/register?role=BUYER&returnUrl=${encodeURIComponent(returnUrl)}`}
            className="w-full sm:w-auto"
          >
            <button className="w-full sm:w-auto h-9 px-4 text-xs font-bold uppercase tracking-wider border border-[#233D22] text-[#233D22] rounded hover:bg-[#EAE4D6] transition-colors">
              Create Buyer Account
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // 2. Logged-in Farmer / Producer Experience
  if (isFarmer) {
    return (
      <div className="rounded-lg border border-[#DFD8CB] bg-[#F7F4EB] p-5 text-center space-y-3">
        <h3 className="text-sm font-serif font-bold text-[#1E221B]">Producer Account Notice</h3>
        <p className="text-xs text-[#6B7260] leading-relaxed max-w-md mx-auto">
          You are signed in with a <strong>Producer/FPO</strong> account ({user?.email}). Producer accounts list and fulfill produce. Buyer procurement requires a registered buyer profile.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
          <Link
            href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="w-full sm:w-auto"
          >
            <button className="w-full sm:w-auto h-9 px-4 text-xs font-semibold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2] rounded">
              Switch to Buyer Account
            </button>
          </Link>
          <Link href="/seller/orders" className="w-full sm:w-auto">
            <button className="w-full sm:w-auto h-9 px-4 text-xs font-semibold uppercase tracking-wider border border-[#DFD8CB] bg-[#FFFFFF] rounded">
              View Your Producer Orders
            </button>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Logged-in Buyer Experience
  const lineTotal = product.price * quantity;

  return (
    <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-[#52594B]">
          Procurement Quantity
        </span>
        <span className="text-xs text-[#6B7260]">
          Available Stock: <strong className="text-[#1E221B]">{maxStock} {product.unit}</strong>
        </span>
      </div>

      {/* Quantity Stepper */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded border border-[#DFD8CB] bg-[#FFFFFF]">
          <button
            type="button"
            onClick={handleDecrement}
            disabled={quantity <= 1 || mutation.isPending}
            className="h-8 w-8 text-sm font-bold text-[#1E221B] hover:bg-[#F2EFE7] disabled:opacity-40"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            max={maxStock}
            value={quantity}
            onChange={handleQuantityChange}
            disabled={mutation.isPending}
            className="w-14 text-center text-xs font-bold text-[#1E221B] bg-transparent focus:outline-none"
          />
          <button
            type="button"
            onClick={handleIncrement}
            disabled={quantity >= maxStock || mutation.isPending}
            className="h-8 w-8 text-sm font-bold text-[#1E221B] hover:bg-[#F2EFE7] disabled:opacity-40"
          >
            +
          </button>
        </div>

        <div className="flex-1 text-right">
          <span className="text-[10px] text-[#7A8070] uppercase tracking-wider font-semibold block">Batch Subtotal</span>
          <span className="text-lg font-serif font-bold text-[#1E221B]">
            ₹{lineTotal.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Error or Success notification */}
      {mutation.isError && (
        <div className="p-2.5 rounded bg-[#FDF2F2] border border-[#F8B4B4] text-[#9B1C1C] text-xs">
          {(mutation.error as Error)?.message || 'Failed to add batch to cart.'}
        </div>
      )}

      {successMessage && (
        <div className="p-2.5 rounded bg-[#E8F1E5] border border-[#A5BFA0] text-[#284021] text-xs flex items-center justify-between">
          <span>Batch added to your procurement cart.</span>
          <Link href="/cart" className="font-bold underline">
            View Cart
          </Link>
        </div>
      )}

      {/* Submit Action */}
      <div className="pt-2 flex gap-2.5">
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={mutation.isPending}
          className="flex-1 h-11 bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-70"
        >
          {mutation.isPending ? 'Reserving...' : 'Add to Procurement Cart'}
        </button>
        <Link href="/cart">
          <button className="h-11 px-4 text-xs font-bold uppercase tracking-wider border border-[#233D22] text-[#233D22] rounded hover:bg-[#EAE4D6]">
            Go to Cart
          </button>
        </Link>
      </div>

      <div className="pt-2 border-t border-[#ECE5D8] flex items-center justify-between text-[11px] text-[#6B7260]">
        <span>Escrow funds held in banking trustee account</span>
        <span className="font-semibold text-[#233D22]">100% Protected</span>
      </div>
    </div>
  );
}
