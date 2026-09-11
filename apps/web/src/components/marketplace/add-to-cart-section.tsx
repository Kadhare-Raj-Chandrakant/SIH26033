'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addToCart, MarketplaceProduct } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Minus, Plus, ShoppingCart, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

interface AddToCartSectionProps {
  product: MarketplaceProduct;
}

export function AddToCartSection({ product }: AddToCartSectionProps) {
  const [quantity, setQuantity] = useState(1);
  const [successMessage, setSuccessMessage] = useState(false);
  const queryClient = useQueryClient();
  const { token, isAuthenticated, loginAsDemoBuyer } = useAuth();

  const maxStock = product.availableQuantity || 0;
  const isOutOfStock = maxStock <= 0 || product.status !== 'ACTIVE';

  const mutation = useMutation({
    mutationFn: () => addToCart(product.id, quantity, token || undefined),
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

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      await loginAsDemoBuyer();
    }
    mutation.mutate();
  };

  if (isOutOfStock) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-center space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Currently Unavailable</span>
        </div>
        <p className="text-xs text-muted-foreground">
          This produce is currently out of stock or archived by the farmer. Check back soon for the next harvest batch.
        </p>
      </div>
    );
  }

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
    </div>
  );
}
