'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  CheckCircle2,
  Building2,
  MapPin,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  AlertCircle,
  Users,
  Target,
  Scale,
} from 'lucide-react';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import {
  createBuyerRequirement,
  getOpenBuyerRequirements,
  matchSellersForBuyer,
  BuyerRequirement,
  SellerMatchItem,
} from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

const COMMODITIES = [
  'Tomato',
  'Onion',
  'Potato',
  'Wheat',
  'Rice',
  'Cotton',
  'Soyabean',
  'Maize',
];

const CITIES = [
  'Pune',
  'Mumbai',
  'Nashik',
  'Nagpur',
  'Ahmednagar',
  'Kolhapur',
  'Aurangabad',
  'Indore',
  'Bengaluru',
];

export default function BuyerSourcingPage() {
  return (
    <RoleGuard allowedRoles={['BUYER']}>
      <BuyerSourcingContent />
    </RoleGuard>
  );
}

function BuyerSourcingContent() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  // Form State for Posting Requirement
  const [commodity, setCommodity] = useState<string>('Tomato');
  const [requiredQuantity, setRequiredQuantity] = useState<number>(100);
  const [targetPrice, setTargetPrice] = useState<number>(2200);
  const [deliveryCity, setDeliveryCity] = useState<string>('Pune');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(150);
  const [notes, setNotes] = useState<string>('Grade A produce preferred, dry transit packaging.');
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Active Open Requirements Query
  const {
    data: requirements,
  } = useQuery<BuyerRequirement[]>({
    queryKey: ['buyer-requirements', commodity],
    queryFn: () => getOpenBuyerRequirements(commodity),
    staleTime: 30000,
  });

  // Matched Sellers Query
  const {
    data: matchedSellers,
    isLoading: isMatchingLoading,
    refetch: refetchMatches,
  } = useQuery<SellerMatchItem[]>({
    queryKey: ['matched-sellers', commodity, requiredQuantity, targetPrice, deliveryCity, maxDistanceKm],
    queryFn: () =>
      matchSellersForBuyer({
        commodity,
        requiredQuantity,
        maxBudgetPerUnit: targetPrice || undefined,
        deliveryLocation: { city: deliveryCity },
        maxDistanceKm,
      }),
    staleTime: 60000,
  });

  // Mutation: Post Requirement
  const postRequirementMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Authentication required to post buyer requirement');
      }
      return createBuyerRequirement(
        {
          commodity,
          requiredQuantity,
          targetPrice,
          deliveryLocation: deliveryCity,
          maxDistanceKm,
          notes,
          unit: 'quintal',
        },
        token || undefined,
      );
    },
    onSuccess: () => {
      setFormFeedback({
        type: 'success',
        message: 'Procurement requirement posted successfully! Matched producers have been indexed.',
      });
      queryClient.invalidateQueries({ queryKey: ['buyer-requirements'] });
      refetchMatches();
    },
    onError: (err: Error) => {
      setFormFeedback({
        type: 'error',
        message: err.message || 'Failed to post procurement requirement.',
      });
    },
  });

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B]">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 max-w-6xl">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#DFD8CB] pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#233D22]/10 text-[#233D22]">
                <Target className="h-3 w-3" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#233D22]">
                Direct Sourcing & Farmgate Matching
              </span>
            </div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-[#1E221B]">
              Buyer Procurement Hub
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[#5D6352] max-w-2xl leading-relaxed">
              Publish institutional commodity requirements and let the matching engine score verified farmers and FPOs based on batch availability, freight proximity, and target price feasibility.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/marketplace">
              <Button variant="outline" size="sm" className="text-xs border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B] hover:bg-[#EFE9DC] rounded">
                Browse Full Catalog
              </Button>
            </Link>
            <Link href="/seller/intelligence">
              <Button size="sm" className="bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] text-xs font-semibold rounded">
                Mandi Intelligence
              </Button>
            </Link>
          </div>
        </div>

        {/* Post Requirement & Live Matching Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Post Requirement Form (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="rounded-md border border-[#DFD8CB] bg-[#FCFAF6] p-5 space-y-4 sticky top-24">
              <div className="flex items-center justify-between border-b border-[#DFD8CB] pb-3">
                <h2 className="text-base font-serif font-bold text-[#1E221B] flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-[#233D22]" />
                  <span>Post Procurement Order</span>
                </h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F4F0E6] text-[#5D6352] border border-[#DFD8CB]">
                  Institutional / Retail
                </span>
              </div>

              {formFeedback && (
                <div
                  className={`p-3 rounded text-xs flex items-start gap-2 ${
                    formFeedback.type === 'success'
                      ? 'bg-[#233D22]/10 text-[#233D22] border border-[#233D22]/20'
                      : 'bg-[#9A3412]/10 text-[#9A3412] border border-[#9A3412]/20'
                  }`}
                >
                  {formFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#233D22]" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#9A3412]" />
                  )}
                  <span>{formFeedback.message}</span>
                </div>
              )}

              <div className="space-y-3.5 text-xs">
                {/* Commodity */}
                <div>
                  <label className="block font-semibold text-[#1E221B] mb-1">
                    Commodity Needed
                  </label>
                  <select
                    value={commodity}
                    onChange={(e) => setCommodity(e.target.value)}
                    className="w-full h-9 px-3 rounded border border-[#DFD8CB] bg-[#F7F5EE] text-xs font-medium text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                  >
                    {COMMODITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Required Quantity & Target Budget */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1E221B] mb-1">
                      Required Quantity (q)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={requiredQuantity}
                      onChange={(e) => setRequiredQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full h-9 px-3 rounded border border-[#DFD8CB] bg-[#F7F5EE] text-xs font-medium text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1E221B] mb-1">
                      Target Ceiling (₹/q)
                    </label>
                    <input
                      type="number"
                      min={100}
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(Number(e.target.value) || 0)}
                      className="w-full h-9 px-3 rounded border border-[#DFD8CB] bg-[#F7F5EE] text-xs font-medium text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                    />
                  </div>
                </div>

                {/* Delivery Location & Max Distance */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#1E221B] mb-1">
                      Destination City
                    </label>
                    <select
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      className="w-full h-9 px-3 rounded border border-[#DFD8CB] bg-[#F7F5EE] text-xs font-medium text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#1E221B] mb-1">
                      Max Transit (km)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      value={maxDistanceKm}
                      onChange={(e) => setMaxDistanceKm(Number(e.target.value) || 100)}
                      className="w-full h-9 px-3 rounded border border-[#DFD8CB] bg-[#F7F5EE] text-xs font-medium text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                    />
                  </div>
                </div>

                {/* Notes / Specs */}
                <div>
                  <label className="block font-semibold text-[#1E221B] mb-1">
                    Quality Specifications / Delivery Notes
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 rounded border border-[#DFD8CB] bg-[#F7F5EE] text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                  />
                </div>
              </div>

              <Button
                onClick={() => postRequirementMutation.mutate()}
                disabled={postRequirementMutation.isPending}
                className="w-full bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] font-semibold text-xs py-2 rounded transition-colors"
              >
                {postRequirementMutation.isPending ? 'Publishing Order...' : 'Publish Procurement Requirement'}
              </Button>

              <p className="text-[11px] text-[#5D6352] text-center">
                Published orders are indexed directly with verified farmers and FPOs in regional freight range.
              </p>
            </div>
          </div>

          {/* Right Column: Matched Sellers & Inventory (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="border-b border-[#DFD8CB] pb-3">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-base font-serif font-bold text-[#1E221B] flex items-center gap-2">
                  <Scale className="h-4 w-4 text-[#233D22]" />
                  <span>Matched Regional Farm Inventory</span>
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#F4F0E6] text-[#233D22] border border-[#DFD8CB]">
                  {matchedSellers?.length || 0} Matches Found
                </span>
              </div>
              <p className="text-xs text-[#5D6352]">
                Ranked by volume capacity, price competitiveness, road distance, and producer fulfillment reliability.
              </p>
            </div>

            {isMatchingLoading && (
              <div className="rounded-md border border-[#DFD8CB] bg-[#FCFAF6] p-10 text-center">
                <div className="inline-block h-6 w-6 border-2 border-[#233D22] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold text-[#1E221B]">
                  Matching regional farm inventories against your required volume and transit radius...
                </p>
              </div>
            )}

            {!isMatchingLoading && (!matchedSellers || matchedSellers.length === 0) && (
              <div className="rounded-md border border-[#DFD8CB] bg-[#FCFAF6] p-10 text-center">
                <PackageCheck className="h-8 w-8 text-[#5D6352]/40 mx-auto mb-2" />
                <h3 className="font-serif font-bold text-[#1E221B] text-sm">No Matching Inventory Within Range</h3>
                <p className="text-xs text-[#5D6352] max-w-md mx-auto mt-1">
                  No active listings match {commodity} within {maxDistanceKm} km of {deliveryCity} under target budget. Try widening transit radius or ceiling price.
                </p>
              </div>
            )}

            {matchedSellers && matchedSellers.length > 0 && (
              <div className="space-y-4">
                {matchedSellers.map((match) => (
                  <div
                    key={match.productId}
                    className="border border-[#DFD8CB] rounded-md bg-[#FCFAF6] p-4 space-y-3"
                  >
                    {/* Top Bar: Producer & Match Score */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif font-bold text-[#1E221B] text-base">
                            {match.productName}
                          </h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F4F0E6] text-[#233D22] border border-[#DFD8CB]">
                            {match.sellerType}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#233D22]/10 text-[#233D22] flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            {match.verificationStatus}
                          </span>
                        </div>
                        <span className="text-xs text-[#5D6352] flex items-center gap-1.5 mt-0.5">
                          <Building2 className="h-3 w-3" />
                          {match.businessName || match.sellerName} •{' '}
                          <MapPin className="h-3 w-3 text-[#233D22]" />
                          {match.location || 'Regional Farm'} ({match.distanceKm} km away)
                        </span>
                      </div>

                      <div className="flex flex-col items-end">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded ${
                            match.matchScore >= 80
                              ? 'bg-[#233D22] text-[#F7F5EE]'
                              : match.matchScore >= 60
                              ? 'bg-[#BD8728] text-[#F7F5EE]'
                              : 'bg-[#F4F0E6] text-[#1E221B] border border-[#DFD8CB]'
                          }`}
                        >
                          {match.matchScore}/100 Match
                        </span>
                      </div>
                    </div>

                    {/* Economics & Stock */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="rounded bg-[#F4F0E6] p-2.5 border border-[#DFD8CB]">
                        <span className="text-[#5D6352] block text-[10px] uppercase font-bold tracking-wider">Direct Price</span>
                        <span className="font-bold text-[#1E221B] text-sm">
                          ₹{match.unitPrice}/{match.unit}
                        </span>
                      </div>
                      <div className="rounded bg-[#F4F0E6] p-2.5 border border-[#DFD8CB]">
                        <span className="text-[#5D6352] block text-[10px] uppercase font-bold tracking-wider">Available Stock</span>
                        <span className="font-bold text-[#1E221B] text-sm">
                          {match.availableQuantity} {match.unit}
                        </span>
                      </div>
                      <div className="rounded bg-[#F4F0E6] p-2.5 border border-[#DFD8CB] col-span-2 sm:col-span-1">
                        <span className="text-[#5D6352] block text-[10px] uppercase font-bold tracking-wider">Estimated Transit</span>
                        <span className="font-bold text-[#1E221B] text-sm">
                          {match.distanceKm} km
                        </span>
                      </div>
                    </div>

                    {/* Score Breakdown Pills */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D6352] block">
                        Compatibility Scoring:
                      </span>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        <span className="rounded bg-[#F4F0E6] px-2 py-0.5 text-[#5D6352] border border-[#DFD8CB]">
                          Volume: {match.scoreBreakdown.quantityFulfillment}%
                        </span>
                        <span className="rounded bg-[#F4F0E6] px-2 py-0.5 text-[#5D6352] border border-[#DFD8CB]">
                          Price: {match.scoreBreakdown.priceCompetitiveness}%
                        </span>
                        <span className="rounded bg-[#F4F0E6] px-2 py-0.5 text-[#5D6352] border border-[#DFD8CB]">
                          Distance: {match.scoreBreakdown.distanceLogistics}%
                        </span>
                        <span className="rounded bg-[#F4F0E6] px-2 py-0.5 text-[#5D6352] border border-[#DFD8CB]">
                          Trust: {match.scoreBreakdown.sellerReliability}%
                        </span>
                      </div>
                    </div>

                    {/* Reasons */}
                    <div className="rounded bg-[#F4F0E6] border border-[#DFD8CB] p-2.5 space-y-1">
                      {match.reasons.map((reason, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-xs text-[#1E221B]">
                          <CheckCircle2 className="h-3 w-3 text-[#233D22] shrink-0" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action CTA */}
                    <div className="pt-2 flex justify-end">
                      <Link href={`/marketplace/products/${match.productId}`}>
                        <Button size="sm" className="bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] text-xs font-semibold rounded gap-1">
                          <span>View Product & Purchase</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Open Requirements Board */}
            <div className="pt-6 border-t border-[#DFD8CB]">
              <h3 className="text-sm font-serif font-bold text-[#1E221B] mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-[#233D22]" />
                <span>Active Sourcing Board ({requirements?.length || 0})</span>
              </h3>
              <p className="text-xs text-[#5D6352] mb-3">
                Open procurement requests visible to verified producers and aggregator FPOs across the region.
              </p>

              {requirements && requirements.length > 0 ? (
                <div className="space-y-2.5">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className="rounded border border-[#DFD8CB] bg-[#FCFAF6] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#1E221B] text-sm">
                            {req.requiredQuantity} {req.unit} of {req.commodity}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F4F0E6] text-[#5D6352] border border-[#DFD8CB]">
                            {req.status}
                          </span>
                        </div>
                        <span className="text-[#5D6352] flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-[#233D22]" />
                          Delivery to {req.deliveryLocation || 'Designated Warehouse'}
                          {req.targetPrice ? ` • Target: ₹${req.targetPrice}/${req.unit}` : ''}
                        </span>
                        {req.notes && (
                          <p className="text-[#5D6352] mt-1 text-[11px] italic">
                            &quot;{req.notes}&quot;
                          </p>
                        )}
                      </div>

                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#F4F0E6] text-[#1E221B] border border-[#DFD8CB] shrink-0 self-start sm:self-auto">
                        Posted by {req.buyer?.businessName || 'Verified Buyer'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded border border-[#DFD8CB] bg-[#FCFAF6] text-center text-xs text-[#5D6352]">
                  No other active procurement requests currently listed for {commodity}.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
