'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchCart,
  fetchAddresses,
  createAddress,
  createOrder,
  Address,
} from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

export default function CheckoutPage() {
  return (
    <RoleGuard allowedRoles={['BUYER']}>
      <CheckoutPageContent />
    </RoleGuard>
  );
}

function CheckoutPageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Fetch cart
  const { data: cartResponse, isLoading: cartLoading } = useQuery({
    queryKey: ['cart', token],
    queryFn: () => fetchCart(token || undefined),
    enabled: isAuthenticated && !!token && user?.role === 'BUYER',
  });

  // Fetch addresses
  const {
    data: addressesResponse,
    isLoading: addressesLoading,
    refetch: refetchAddresses,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => fetchAddresses(token || undefined),
    enabled: isAuthenticated,
  });

  // Create address mutation
  const createAddressMutation = useMutation({
    mutationFn: () => createAddress(addressForm, token || undefined),
    onSuccess: (data) => {
      refetchAddresses();
      setSelectedAddressId(data.data.id);
      setShowNewAddressForm(false);
      setAddressForm({
        name: '',
        phone: '',
        addressLine: '',
        city: '',
        state: '',
        pincode: '',
      });
    },
  });

  // Place order mutation
  const placeOrderMutation = useMutation({
    mutationFn: (addressId: string) => createOrder(addressId, token || undefined),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      const firstOrderId = response.data.order?.id || response.data.orders?.[0]?.id;
      if (firstOrderId) {
        router.push(`/orders/${firstOrderId}`);
      } else {
        router.push('/orders');
      }
    },
  });

  const cartData = cartResponse?.data;
  const items = cartData?.items || [];
  const subtotal = cartData?.subtotal || 0;
  const addresses: Address[] = addressesResponse?.data || [];
  const hasUnavailableItems = items.some((item) => !item.isAvailable);

  // Auto-select default address
  if (!selectedAddressId && addresses.length > 0) {
    const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
    setSelectedAddressId(defaultAddr.id);
  }

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.name || !addressForm.phone || !addressForm.addressLine || !addressForm.city || !addressForm.pincode) {
      return;
    }
    createAddressMutation.mutate();
  };

  const handlePlaceOrder = () => {
    if (!selectedAddressId) return;
    placeOrderMutation.mutate(selectedAddressId);
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 max-w-5xl">
        {/* Navigation breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href="/cart"
            className="flex items-center gap-1 font-medium hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Cart
          </Link>
          <span>/</span>
          <span className="font-semibold text-foreground">Order Review & Confirmation</span>
        </nav>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
          Order Review & Confirmation
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mb-8">
          Review your direct farm produce selection and confirm your delivery destination.
        </p>

        {/* Loading state */}
        {(authLoading || cartLoading || addressesLoading) && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-7 space-y-4">
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-56 w-full rounded-2xl" />
            </div>
            <div className="md:col-span-5">
              <Skeleton className="h-72 w-full rounded-2xl" />
            </div>
          </div>
        )}

        {/* Content */}
        {!cartLoading && !addressesLoading && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Column: Shipping Address & Item Review */}
            <div className="md:col-span-7 space-y-6">
              {/* 1. Shipping Address Selection */}
              <Card className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    Delivery Destination
                  </h2>

                  {!showNewAddressForm && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewAddressForm(true)}
                      className="text-xs gap-1 h-8"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Address</span>
                    </Button>
                  )}
                </div>

                {/* Existing addresses list */}
                {!showNewAddressForm && addresses.length > 0 && (
                  <div className="space-y-3">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`cursor-pointer rounded-xl border p-4 transition-all ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-sm'
                              : 'border-border/70 bg-card hover:border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">
                                  {addr.name}
                                </span>
                                <Badge variant="secondary" className="text-[10px] py-0">
                                  {addr.type}
                                </Badge>
                                {addr.isDefault && (
                                  <span className="text-[10px] font-semibold text-emerald-600">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {addr.addressLine}, {addr.city}, {addr.state} - {addr.pincode}
                              </p>
                              <p className="text-xs text-muted-foreground">Phone: {addr.phone}</p>
                            </div>

                            <div className="h-5 w-5 shrink-0 rounded-full border border-border flex items-center justify-center">
                              {isSelected && (
                                <div className="h-3 w-3 rounded-full bg-emerald-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* No addresses notice */}
                {!showNewAddressForm && addresses.length === 0 && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-900 dark:text-amber-200">
                    <p className="font-bold">No Delivery Address Registered</p>
                    <p className="mt-1">
                      Please add a shipping address below before confirming your purchase.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowNewAddressForm(true)}
                      className="mt-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    >
                      Add Address Now
                    </Button>
                  </div>
                )}

                {/* New address form */}
                {showNewAddressForm && (
                  <form onSubmit={handleAddressSubmit} className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Recipient Name *
                        </label>
                        <Input
                          required
                          value={addressForm.name}
                          onChange={(e) =>
                            setAddressForm((p) => ({ ...p, name: e.target.value }))
                          }
                          placeholder="e.g. Ramesh Patel"
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">
                          Contact Phone *
                        </label>
                        <Input
                          required
                          value={addressForm.phone}
                          onChange={(e) =>
                            setAddressForm((p) => ({ ...p, phone: e.target.value }))
                          }
                          placeholder="+919876543210"
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Street Address / Premises *
                      </label>
                      <Input
                        required
                        value={addressForm.addressLine}
                        onChange={(e) =>
                          setAddressForm((p) => ({ ...p, addressLine: e.target.value }))
                        }
                        placeholder="Plot No, Street, Landmark"
                        className="mt-1 h-9 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">City *</label>
                        <Input
                          required
                          value={addressForm.city}
                          onChange={(e) =>
                            setAddressForm((p) => ({ ...p, city: e.target.value }))
                          }
                          placeholder="City"
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">State *</label>
                        <Input
                          required
                          value={addressForm.state}
                          onChange={(e) =>
                            setAddressForm((p) => ({ ...p, state: e.target.value }))
                          }
                          placeholder="State"
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">PIN *</label>
                        <Input
                          required
                          value={addressForm.pincode}
                          onChange={(e) =>
                            setAddressForm((p) => ({ ...p, pincode: e.target.value }))
                          }
                          placeholder="PIN Code"
                          className="mt-1 h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={createAddressMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                      >
                        {createAddressMutation.isPending ? 'Saving...' : 'Save & Select Address'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowNewAddressForm(false)}
                        className="text-xs h-9"
                      >
                        Cancel
                      </Button>
                    </div>

                    {createAddressMutation.isError && (
                      <p className="text-xs text-destructive">
                        {createAddressMutation.error?.message || 'Failed to save address'}
                      </p>
                    )}
                  </form>
                )}
              </Card>

              {/* 2. Items in Order Review */}
              <Card className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm space-y-4">
                <h2 className="text-base font-bold text-foreground">Produce Review</h2>
                <div className="divide-y divide-border/40">
                  {items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {item.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} {item.unit} × ₹{item.unitPrice.toFixed(2)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Producer: {item.seller.businessName || 'Verified Producer'}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold text-foreground">
                          ₹{item.lineTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Right Column: Order Confirmation Summary */}
            <div className="md:col-span-5">
              <Card className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5 sticky top-24">
                <h2 className="text-base font-bold text-foreground">Purchasing Summary</h2>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Items Count:</span>
                    <span className="font-semibold text-foreground">{items.length} items</span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Produce Subtotal:</span>
                    <span className="font-bold text-foreground">₹{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Platform Commission:</span>
                    <span className="font-semibold text-emerald-600">₹0.00 (Zero Intermediary)</span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-foreground">Total Payable</span>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold text-foreground">
                      ₹{subtotal.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      Snapshotted upon confirmation
                    </span>
                  </div>
                </div>

                {/* Important Notice: No Fake Payment */}
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1 text-xs text-emerald-900 dark:text-emerald-300">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Direct Farm Order Placement</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Confirming this order locks the produce stock and creates verified purchase records with the respective producers. Payment settlements and fulfillment follow milestone workflows.
                  </p>
                </div>

                {/* Confirm Order Button */}
                <Button
                  onClick={handlePlaceOrder}
                  disabled={!selectedAddressId || items.length === 0 || hasUnavailableItems || placeOrderMutation.isPending}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-md shadow-emerald-600/20"
                >
                  {placeOrderMutation.isPending ? (
                    <span>Placing Order...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Confirm Order</span>
                    </>
                  )}
                </Button>

                {hasUnavailableItems && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Your cart contains out-of-stock items. Please return to cart to remove them.</span>
                  </div>
                )}

                {placeOrderMutation.isError && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{placeOrderMutation.error?.message || 'Failed to place order'}</span>
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
