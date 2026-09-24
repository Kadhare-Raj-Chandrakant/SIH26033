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
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';
import { ShoppingBag, AlertCircle, MapPin } from 'lucide-react';

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

  const { data: cartResponse, isLoading: cartLoading } = useQuery({
    queryKey: ['cart', token],
    queryFn: () => fetchCart(token || undefined),
    enabled: isAuthenticated && !!token && user?.role === 'BUYER',
  });

  const {
    data: addressesResponse,
    isLoading: addressesLoading,
    refetch: refetchAddresses,
  } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => fetchAddresses(token || undefined),
    enabled: isAuthenticated,
  });

  const createAddressMutation = useMutation({
    mutationFn: () =>
      createAddress(
        {
          ...addressForm,
          type: 'WAREHOUSE',
          country: 'India',
        },
        token || undefined,
      ),
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

  if (!selectedAddressId && addresses.length > 0) {
    const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
    setSelectedAddressId(defaultAddr.id);
  }

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !addressForm.name ||
      !addressForm.phone ||
      !addressForm.addressLine ||
      !addressForm.city ||
      !addressForm.state ||
      !addressForm.pincode
    ) {
      return;
    }
    createAddressMutation.mutate();
  };

  const handlePlaceOrder = () => {
    if (!selectedAddressId) return;
    placeOrderMutation.mutate(selectedAddressId);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      <MarketplaceNavbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Navigation Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-[#6B7260]">
          <Link href="/cart" className="hover:text-[#1E221B] font-medium">
            ← Back to Cart
          </Link>
          <span>/</span>
          <span className="font-bold text-[#1E221B]">Trade Settlement & Escrow Commitment</span>
        </nav>

        <div className="mb-8 pb-4 border-b border-[#DFD8CB]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#556448] block mb-1">
            B2B Commercial Contract
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B]">
            Trade Settlement & Escrow Commitment
          </h1>
          <p className="text-xs text-[#6B7260] mt-1">
            Review delivery destination, weighbridge inspection terms, and authorize payment into secure escrow.
          </p>
        </div>

        {/* Loading State */}
        {(authLoading || cartLoading || addressesLoading) && (
          <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
            <p className="text-sm font-serif font-bold text-[#1E221B]">
              Preparing Trade Settlement Manifest...
            </p>
          </div>
        )}

        {/* Content */}
        {!cartLoading && !addressesLoading && items.length === 0 && (
          <div className="rounded-xl border border-[#DFD8CB] bg-[#FCFAF6] p-10 text-center space-y-4 max-w-md mx-auto my-8">
            <div className="w-12 h-12 rounded-full bg-[#E8F0E2] text-[#233D22] mx-auto flex items-center justify-center">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-lg text-[#1E221B]">Your Trade Cart is Empty</h2>
            <p className="text-xs text-[#6B7260]">
              You have no active commodity batches reserved for settlement. Browse verified producer lots to initialize contract settlement.
            </p>
            <div className="pt-2">
              <Link href="/marketplace">
                <button className="px-6 py-2.5 bg-[#233D22] text-[#FAF8F2] text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#1B2F1A] transition-colors shadow-xs">
                  Browse Marketplace Batches ➔
                </button>
              </Link>
            </div>
          </div>
        )}

        {!cartLoading && !addressesLoading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Left Column: Address & Lot Review */}
            <div className="md:col-span-7 space-y-6">
              {/* Delivery Destination */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-serif font-bold text-[#1E221B]">
                    Delivery Destination & Warehouse
                  </h2>

                  {!showNewAddressForm && (
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(true)}
                      className="h-8 px-3 text-xs font-semibold uppercase tracking-wider border border-[#DFD8CB] bg-[#FFFFFF] rounded text-[#233D22] hover:bg-[#F2EFE7]"
                    >
                      + Add Location
                    </button>
                  )}
                </div>

                {/* Empty address state when none exist */}
                {!showNewAddressForm && addresses.length === 0 && (
                  <div className="p-6 border border-dashed border-[#DFD8CB] rounded-lg bg-[#FAF8F2] text-center space-y-3">
                    <MapPin className="w-8 h-8 text-[#6B7260] mx-auto opacity-60" />
                    <p className="text-xs text-[#5D6352] max-w-sm mx-auto">
                      No delivery destination on file. Add your receiving warehouse or APMC terminal gate to authorize trade settlement.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(true)}
                      className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2] rounded-md hover:bg-[#1B2F1A] transition-colors"
                    >
                      + Add Delivery Destination
                    </button>
                  </div>
                )}

                {/* Existing addresses */}
                {!showNewAddressForm && addresses.length > 0 && (
                  <div className="space-y-3">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddressId === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-4 rounded border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#233D22] bg-[#F0F5EE] ring-1 ring-[#233D22]'
                              : 'border-[#DFD8CB] bg-[#FFFFFF] hover:bg-[#F7F5EE]'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-[#1E221B]">
                                  {addr.name}
                                </span>
                                {addr.isDefault && (
                                  <span className="text-[10px] font-bold uppercase bg-[#E8F0E2] text-[#233D22] px-1.5 py-0.2 rounded">
                                    Primary Hub
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#5D6352]">{addr.addressLine}</p>
                              <p className="text-xs text-[#5D6352]">
                                {addr.city}, {addr.state} - {addr.pincode}
                              </p>
                              <p className="text-[11px] text-[#7A8070]">Phone: {addr.phone}</p>
                            </div>
                            <div className="mt-1">
                              <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-[#233D22] bg-[#233D22]' : 'border-[#C8C0AF]'
                              }`}>
                                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* New Address Form */}
                {showNewAddressForm && (
                  <form onSubmit={handleAddressSubmit} className="space-y-3 pt-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-[#52594B] block mb-1">
                          Facility / Receiver Name
                        </label>
                        <input
                          type="text"
                          required
                          value={addressForm.name}
                          onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                          placeholder="e.g. Central Flour Mill"
                          className="w-full h-8 px-2.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-[#52594B] block mb-1">
                          Contact Phone
                        </label>
                        <input
                          type="tel"
                          required
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                          placeholder="9876543210"
                          className="w-full h-8 px-2.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#52594B] block mb-1">
                        Street Address & Warehouse Gate
                      </label>
                      <input
                        type="text"
                        required
                        value={addressForm.addressLine}
                        onChange={(e) => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                        placeholder="Plot 42, Industrial Area, Gate 3"
                        className="w-full h-8 px-2.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-[#52594B] block mb-1">City</label>
                        <input
                          type="text"
                          required
                          value={addressForm.city}
                          onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                          placeholder="Nagpur"
                          className="w-full h-8 px-2.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-[#52594B] block mb-1">State</label>
                        <input
                          type="text"
                          required
                          value={addressForm.state}
                          onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                          placeholder="Maharashtra"
                          className="w-full h-8 px-2.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-[#52594B] block mb-1">PIN Code</label>
                        <input
                          type="text"
                          required
                          value={addressForm.pincode}
                          onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                          placeholder="440001"
                          className="w-full h-8 px-2.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                        />
                      </div>
                    </div>

                    {createAddressMutation.isError && (
                      <div className="p-2.5 rounded bg-[#FDF2F2] border border-[#F8B4B4] text-xs text-[#9B1C1C]">
                        {(createAddressMutation.error as Error)?.message || 'Failed to save delivery destination'}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={createAddressMutation.isPending}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#233D22] text-[#FAF8F2] rounded hover:bg-[#1B2F1A] transition-colors disabled:opacity-50"
                      >
                        {createAddressMutation.isPending ? 'Saving Destination...' : 'Save Destination'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm(false)}
                        className="px-4 py-2 text-xs font-semibold uppercase tracking-wider border border-[#DFD8CB] bg-[#FFFFFF] rounded text-[#6B7260]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Reserved Batches Itemized Review */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-4">
                <h2 className="text-base font-serif font-bold text-[#1E221B]">
                  Reserved Trade Batches ({items.length})
                </h2>

                <div className="divide-y divide-[#ECE5D8]">
                  {items.map((item) => (
                    <div key={item.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#1E221B] block">{item.productName}</span>
                        <span className="text-[11px] text-[#6B7260]">
                          Producer: {item.seller?.businessName || 'Verified Collective'} • {item.seller?.farmLocation || 'India'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#1E221B] block">
                          ₹{(item.unitPrice * item.quantity).toLocaleString('en-IN')}
                        </span>
                        <span className="text-[11px] text-[#7A8070]">
                          {item.quantity} {item.unit.toLowerCase()} @ ₹{item.unitPrice}/unit
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Settlement */}
            <div className="md:col-span-5 space-y-6">
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-4">
                <h2 className="text-base font-serif font-bold text-[#1E221B]">
                  Trade Contract Summary
                </h2>

                <div className="space-y-2 text-xs text-[#5D6352] pt-3 border-t border-[#ECE5D8]">
                  <div className="flex justify-between">
                    <span>Farmgate Value</span>
                    <span className="font-semibold text-[#1E221B]">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Logistics Freight Margin</span>
                    <span className="text-[#233D22] font-semibold">Included</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Assaying & Weighbridge Fee</span>
                    <span className="text-[#233D22] font-semibold">Platform Subsidized</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Banking Escrow Protection</span>
                    <span className="text-[#233D22] font-semibold">Active</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#ECE5D8] flex justify-between items-baseline">
                  <span className="font-bold text-xs uppercase tracking-wider text-[#1E221B]">Total Escrow Amount</span>
                  <span className="text-xl font-serif font-bold text-[#1E221B]">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {!selectedAddressId && items.length > 0 && (
                  <div className="p-3 bg-[#FEF3C7] border border-[#FCD34D] rounded text-xs text-[#92400E] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#B45309]" />
                    <span>Select or add a delivery warehouse destination to authorize escrow settlement.</span>
                  </div>
                )}

                {placeOrderMutation.isError && (
                  <div className="p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded text-xs text-[#9B1C1C]">
                    {(placeOrderMutation.error as Error)?.message || 'Trade settlement could not be initialized.'}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handlePlaceOrder}
                    disabled={!selectedAddressId || hasUnavailableItems || placeOrderMutation.isPending}
                    className="w-full h-11 bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] text-xs font-bold uppercase tracking-wider rounded transition-colors disabled:opacity-50"
                  >
                    {placeOrderMutation.isPending ? 'Committing Escrow...' : 'Confirm Trade & Fund Escrow →'}
                  </button>
                </div>

                <div className="pt-3 border-t border-[#ECE5D8] text-[10px] text-[#6B7260] space-y-1">
                  <p>• Funds remain in banking trustee escrow until destination receipt verification</p>
                  <p>• Automated digital assaying reports issued upon truck unloading</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DFD8CB] bg-[#FAF8F2] py-8 text-center text-xs text-[#6B7260]">
        <div className="max-w-7xl mx-auto px-4">
          <p>Aroha Agricultural Marketplace Trade Settlement & Escrow Gateway</p>
        </div>
      </footer>
    </div>
  );
}
