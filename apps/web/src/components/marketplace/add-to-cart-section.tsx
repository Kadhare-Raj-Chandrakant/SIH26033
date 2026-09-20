'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addToCart, MarketplaceProduct } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, Check, AlertCircle, Tractor, LogIn } from 'lucide-react';
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
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Out of Stock</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {!hasValidPrice
            ? 'This produce does not currently have pricing assigned and is out of stock. It cannot be added to cart.'
            : 'This produce is currently out of stock or archived by the farmer. Check back soon for the next harvest batch.'}
        </p>
      </div>
    );
  }

  const returnUrl = `/marketplace/products/${product.id}`;

  // 1. Logged-out Visitor Experience
  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-card p-5 shadow-sm space-y-3.5 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <ShoppingCart className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">Sign In to Buy</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
            Direct farmer sourcing, cart management, and order checkout require an active <strong>Buyer</strong> account.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
          <Link
            href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="w-full sm:w-auto"
          >
            <Button size="sm" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-5 gap-1.5 shadow-sm">
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In as Buyer</span>
            </Button>
          </Link>
          <Link
            href={`/register?role=BUYER&returnUrl=${encodeURIComponent(returnUrl)}`}
            className="w-full sm:w-auto"
          >
            <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs h-9 px-4 border-border/80">
              Create Buyer Account
            </Button>
          </Link>
        </div>
        <p className="text-[11px] text-muted-foreground pt-1">
          Direct farmer listing • Purchase directly from verified producers
        </p>
      </div>
    );
  }

  // 2. Logged-in Farmer / Producer Experience
  if (isFarmer) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm space-y-3 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 border border-amber-500/30">
          <Tractor className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">Buyer Account Required</h3>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md mx-auto">
            You are signed in with a <strong>Farmer/Producer</strong> account (<span className="font-mono text-foreground">{user?.email}</span>). Producer accounts list and fulfill produce and cannot make buyer purchases.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-1">
          <Link
            href={`/login?returnUrl=${encodeURIComponent(returnUrl)}`}
            className="w-full sm:w-auto"
          >
            <Button size="sm" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 px-4">
              Sign In with Buyer Account
            </Button>
          </Link>
          <Link href="/seller/orders" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="w-full sm:w-auto text-xs h-9 px-4 border-border/80">
              Go to Producer Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Logged-in Buyer Experience
  const lineTotal = product.price * quantity;

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Select Quantity
        </span>
        <span className="text-xs text-muted-foreground">
          Available: <strong className="text-foreground">{maxStock} {product.unit}</strong>
        </span>
      </div>

      {/* Quantity Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-xl border border-input bg-background p-1 shadow-inner">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleDecrement}
            disabled={quantity <= 1 || mutation.isPending}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>

          <input
            type="number"
            min={1}
            max={maxStock}
            value={quantity}
            onChange={handleQuantityChange}
            disabled={mutation.isPending}
            className="w-14 text-center text-sm font-bold text-foreground bg-transparent focus:outline-none"
          />

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={handleIncrement}
            disabled={quantity >= maxStock || mutation.isPending}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex-1 text-right">
          <span className="text-[11px] text-muted-foreground block">Item Total</span>
          <span className="text-base font-extrabold text-foreground">
            ₹{lineTotal.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Add To Cart CTA Button */}
      <Button
        onClick={handleAddToCart}
        disabled={mutation.isPending}
        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-md shadow-emerald-600/20"
      >
        {mutation.isPending ? (
          <span>Adding to Cart...</span>
        ) : successMessage ? (
          <>
            <Check className="h-4 w-4 text-white" />
            <span>Added to Cart!</span>
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" />
            <span>Add to Cart</span>
          </>
        )}
      </Button>

      {/* Quick View Cart link when added */}
      {successMessage && (
        <div className="flex items-center justify-between rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-300">
          <span>Item added to your basket</span>
          <Link href="/cart" className="font-bold underline hover:text-emerald-900">
            View Cart &rarr;
          </Link>
        </div>
      )}

      {/* Mutation Error */}
      {mutation.isError && (
        <p className="text-xs text-destructive text-center">
          {mutation.error?.message || 'Failed to add item to cart'}
        </p>
      )}

      {/* Farmer Listing Assurance */}
      <p className="text-[11px] text-center text-muted-foreground pt-0.5">
        Direct farmer listing • Purchase directly from verified producers
      </p>
    </div>
  );
}
