'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart,
} from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { RoleGuard } from '@/components/auth/role-guard';

export default function CartPage() {
  return (
    <RoleGuard allowedRoles={['BUYER']}>
      <CartPageContent />
    </RoleGuard>
  );
}

function CartPageContent() {
  const mounted = useIsMounted();
  const queryClient = useQueryClient();
  const { token, user, isAuthenticated, isLoading: authLoading } = useAuth();

  const isBuyer = user?.role === 'BUYER';

  const {
    data: cartResponse,
    isLoading: cartLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['cart', token],
    queryFn: () => fetchCart(token || undefined),
    enabled: mounted && isAuthenticated && !!token && isBuyer,
  });

  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) => {
      setUpdatingItemId(productId);
      return updateCartItemQuantity(productId, quantity, token || undefined);
    },
    onSettled: () => {
      setUpdatingItemId(null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (productId: string) => removeCartItem(productId, token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearCartMutation = useMutation({
    mutationFn: () => clearCart(token || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const cartData = cartResponse?.data;
  const items = cartData?.items || [];
  const subtotal = cartData?.subtotal || 0;
  const itemCount = cartData?.itemCount || 0;

  const hasUnavailableItems = items.some((item) => !item.isAvailable);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      <MarketplaceNavbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-[#DFD8CB]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#556448] block mb-1">
              Procurement Management
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B]">
              Direct Sourcing Cart
            </h1>
            <p className="text-xs text-[#6B7260] mt-1">
              Review reserved crop batches, quantities, and direct producer settlement rates before contract checkout.
            </p>
          </div>

          {mounted && items.length > 0 && isBuyer && (
            <button
              onClick={() => clearCartMutation.mutate()}
              disabled={clearCartMutation.isPending}
              className="h-8 px-3 text-xs font-semibold uppercase tracking-wider text-[#8B4513] border border-[#D5CEBF] bg-[#FFFFFF] rounded hover:bg-[#F2EFE7] disabled:opacity-50"
            >
              Clear Cart
            </button>
          )}
        </div>

        {/* Loading State */}
        {(!mounted || authLoading || (cartLoading && isBuyer)) && (
          <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
            <p className="text-sm font-serif font-bold text-[#1E221B]">
              Loading Sourcing Cart & Reserved Lots...
            </p>
          </div>
        )}

        {/* Error State */}
        {mounted && isError && !cartLoading && (
          <div className="rounded-lg border border-[#E5B5B5] bg-[#FDF2F2] p-8 text-center space-y-3 max-w-lg mx-auto my-6">
            <h3 className="font-serif font-bold text-base text-[#9B1C1C]">
              Unable to Load Cart
            </h3>
            <p className="text-xs text-[#771D1D]">
              {(error as Error)?.message || 'An error occurred while fetching your procurement cart.'}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2] rounded"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty Cart */}
        {mounted && !cartLoading && !isError && isBuyer && items.length === 0 && (
          <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
            <h2 className="text-xl font-serif font-bold text-[#1E221B]">
              Your Sourcing Cart is Empty
            </h2>
            <p className="mt-2 text-xs text-[#6B7260] max-w-sm mx-auto leading-relaxed">
              You have not added any harvest batches to your procurement sheet yet. Explore the marketplace to connect directly with verified producers.
            </p>
            <Link href="/marketplace" className="inline-block mt-6">
              <button className="h-10 px-6 text-xs font-bold uppercase tracking-wider bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] rounded transition-colors">
                Browse Marketplace Listings
              </button>
            </Link>
          </div>
        )}

        {/* Cart Contents */}
        {mounted && !cartLoading && !isError && isBuyer && items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Items Column */}
            <div className="lg:col-span-8 space-y-4">
              {hasUnavailableItems && (
                <div className="rounded border border-[#CCD8C4] bg-[#F0F5EC] p-3 text-xs text-[#284021]">
                  Some items in your cart have exceeded available harvest stock. Please adjust quantities before proceeding.
                </div>
              )}

              {items.map((item) => {
                const isUpdating = updatingItemId === item.productId;

                return (
                  <div
                    key={item.id}
                    className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    {/* Item Thumbnail & Info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative h-20 w-20 shrink-0 rounded bg-[#EAE4D6] border border-[#DFD8CB] overflow-hidden">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] text-[#7A8070]">
                            Batch Photo
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link href={`/marketplace/products/${item.productId}`}>
                          <h3 className="font-serif font-bold text-base text-[#1E221B] hover:text-[#233D22] truncate">
                            {item.productName}
                          </h3>
                        </Link>
                        <p className="text-xs text-[#6B7260] mt-0.5">
                          Producer: {item.seller?.businessName || 'Verified Collective'}
                        </p>
                        <p className="text-xs text-[#6B7260]">
                          Mandi: {item.seller?.farmLocation || 'India'}
                        </p>
                        <p className="text-xs font-serif font-bold text-[#1E221B] mt-1">
                          ₹{item.unitPrice.toLocaleString('en-IN')} / {item.unit.toLowerCase()}
                        </p>
                      </div>
                    </div>

                    {/* Quantity & Actions */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3">
                      <div className="flex items-center rounded border border-[#DFD8CB] bg-[#FFFFFF]">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantityMutation.mutate({
                              productId: item.productId,
                              quantity: item.quantity - 1,
                            })
                          }
                          disabled={item.quantity <= 1 || isUpdating}
                          className="h-7 w-7 text-xs font-bold text-[#1E221B] hover:bg-[#F2EFE7] disabled:opacity-40"
                        >
                          -
                        </button>
                        <span className="w-10 text-center text-xs font-bold text-[#1E221B]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantityMutation.mutate({
                              productId: item.productId,
                              quantity: item.quantity + 1,
                            })
                          }
                          disabled={item.quantity >= item.availableStock || isUpdating}
                          className="h-7 w-7 text-xs font-bold text-[#1E221B] hover:bg-[#F2EFE7] disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-serif font-bold text-[#1E221B] block">
                          ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeItemMutation.mutate(item.productId)}
                          disabled={removeItemMutation.isPending}
                          className="text-[11px] font-semibold text-[#8B4513] hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary Column */}
            <div className="lg:col-span-4">
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-4">
                <h2 className="font-serif font-bold text-lg text-[#1E221B]">
                  Procurement Summary
                </h2>

                <div className="space-y-2 text-xs text-[#5D6352] pt-3 border-t border-[#ECE5D8]">
                  <div className="flex justify-between">
                    <span>Reserved Batches</span>
                    <span className="font-semibold text-[#1E221B]">{itemCount} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Farmgate Subtotal</span>
                    <span className="font-semibold text-[#1E221B]">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Freight Tariff</span>
                    <span className="text-[#233D22] font-semibold">Calculated at Checkout</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Escrow Service Fee</span>
                    <span className="text-[#233D22] font-semibold">0% (Platform Subsidized)</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#ECE5D8] flex justify-between items-baseline">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#1E221B]">Estimated Total</span>
                  <span className="text-xl font-serif font-bold text-[#1E221B]">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                <Link href="/checkout" className="block pt-2">
                  <button
                    disabled={hasUnavailableItems}
                    className="w-full h-11 bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                  >
                    Proceed to Trade Checkout →
                  </button>
                </Link>

                <div className="pt-2 border-t border-[#ECE5D8] text-[10px] text-[#6B7260] space-y-1">
                  <p>• 100% Escrow deposit held until weighbridge receipt validation</p>
                  <p>• Automated GST e-Way bills generated upon dispatch</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DFD8CB] bg-[#FAF8F2] py-8 text-center text-xs text-[#6B7260]">
        <div className="max-w-7xl mx-auto px-4">
          <p>Aroha Agricultural Marketplace Direct Sourcing Cart</p>
        </div>
      </footer>
    </div>
  );
}
