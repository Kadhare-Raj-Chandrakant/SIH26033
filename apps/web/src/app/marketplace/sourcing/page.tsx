'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle,
  CheckCircle2,
  Building2,
  MapPin,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  PackageCheck,
  AlertCircle,
  Users,
  Target,
} from 'lucide-react';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  createBuyerRequirement,
  getOpenBuyerRequirements,
  matchSellersForBuyer,
  demoLoginBuyer,
  BuyerRequirement,
  SellerMatchItem,
} from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';

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
      let authToken = token;
      if (!authToken) {
        const demoAuth = await demoLoginBuyer();
        authToken = demoAuth.token;
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
        authToken,
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
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600/10 text-emerald-600">
                <Target className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Direct Sourcing & Producer Matching
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Buyer Procurement Hub
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Publish bulk commodity requirements and let the AI matching engine rank verified farmers and FPOs based on batch availability, freight proximity, and target price feasibility.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/marketplace">
              <Button variant="outline" size="sm" className="text-xs">
                Browse Full Catalog
              </Button>
            </Link>
            <Link href="/seller/intelligence">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                Farmer Intelligence
              </Button>
            </Link>
          </div>
        </div>

        {/* Post Requirement & Live Matching Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Post Requirement Form (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm space-y-5 sticky top-24">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <PlusCircle className="h-4 w-4 text-emerald-600" />
                  Post Bulk Requirement
                </h2>
                <Badge variant="outline" className="text-[10px]">
                  Institutional & Retail
                </Badge>
              </div>

              {formFeedback && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                    formFeedback.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                      : 'bg-destructive/10 text-destructive border border-destructive/20'
                  }`}
                >
                  {formFeedback.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                  )}
                  <span>{formFeedback.message}</span>
                </div>
              )}

              <div className="space-y-4 text-xs">
                {/* Commodity */}
                <div>
                  <label className="block font-semibold text-foreground mb-1.5">
                    Commodity Needed
                  </label>
                  <select
                    value={commodity}
                    onChange={(e) => setCommodity(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {COMMODITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Required Quantity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-foreground mb-1.5">
                      Required Quantity (q)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={requiredQuantity}
                      onChange={(e) => setRequiredQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-foreground mb-1.5">
                      Target Budget (₹/q)
                    </label>
                    <input
                      type="number"
                      min={100}
                      value={targetPrice}
                      onChange={(e) => setTargetPrice(Number(e.target.value) || 0)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Delivery Location & Max Distance */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-foreground mb-1.5">
                      Delivery Destination
                    </label>
                    <select
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      {CITIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-foreground mb-1.5">
                      Max Transit (km)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={1000}
                      value={maxDistanceKm}
                      onChange={(e) => setMaxDistanceKm(Number(e.target.value) || 100)}
                      className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Notes / Specs */}
                <div>
                  <label className="block font-semibold text-foreground mb-1.5">
                    Procurement Specifications / Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-background text-xs font-normal text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <Button
                onClick={() => postRequirementMutation.mutate()}
                disabled={postRequirementMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl shadow-sm"
              >
                {postRequirementMutation.isPending ? 'Publishing Requirement...' : 'Publish Sourcing Requirement'}
              </Button>

              <p className="text-[11px] text-muted-foreground text-center">
                Published requirements are instantly matched with verified farmers and FPOs in regional range.
              </p>
            </div>
          </div>

          {/* Right Column: Matched Sellers & Inventory (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Instant Matched Producers & Harvest
                </h2>
                <Badge variant="outline" className="text-xs">
                  {matchedSellers?.length || 0} Matches Found
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Ranked by multi-factor compatibility: quantity fulfillment, price competitiveness, estimated geographic distance, and producer reliability.
              </p>
            </div>

            {isMatchingLoading && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  Scoring available farm inventories against required volume and transit distance...
                </p>
              </div>
            )}

            {!isMatchingLoading && (!matchedSellers || matchedSellers.length === 0) && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <PackageCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-bold text-foreground text-sm">No Matching Inventory Within Range</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  No active listings match {commodity} within {maxDistanceKm} km of {deliveryCity} under target budget. Try increasing max transit distance or target budget.
                </p>
              </div>
            )}

            {matchedSellers && matchedSellers.length > 0 && (
              <div className="space-y-4">
                {matchedSellers.map((match) => (
                  <Card
                    key={match.productId}
                    className="border border-border/80 shadow-sm hover:border-emerald-500/50 transition-all overflow-hidden"
                  >
                    <CardContent className="p-5 space-y-4">
                      {/* Top Bar: Producer & Match Score */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-foreground text-base">
                              {match.productName}
                            </h3>
                            <Badge
                              variant={match.sellerType === 'FPO' ? 'fpo' : 'farmer'}
                              className="text-[10px]"
                            >
                              {match.sellerType}
                            </Badge>
                            <Badge variant="farmer" className="text-[10px] py-0.5">
                              <ShieldCheck className="mr-1 h-3 w-3 text-emerald-600" />
                              {match.verificationStatus}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Building2 className="h-3 w-3" />
                            {match.businessName || match.sellerName} •{' '}
                            <MapPin className="h-3 w-3 text-emerald-600" />
                            {match.location || 'Regional Farm'} ({match.distanceKm} km away)
                          </span>
                        </div>

                        <div className="flex flex-col items-end">
                          <Badge
                            className={`text-xs font-bold px-2.5 py-1 ${
                              match.matchScore >= 80
                                ? 'bg-emerald-600 text-white'
                                : match.matchScore >= 60
                                ? 'bg-amber-500 text-zinc-950'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {match.matchScore}/100 Match
                          </Badge>
                        </div>
                      </div>

                      <Separator />

                      {/* Economics & Stock */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div className="rounded-xl bg-muted/20 p-3">
                          <span className="text-muted-foreground block text-[11px]">Direct Price</span>
                          <span className="font-bold text-foreground text-sm">
                            ₹{match.unitPrice}/{match.unit}
                          </span>
                        </div>
                        <div className="rounded-xl bg-muted/20 p-3">
                          <span className="text-muted-foreground block text-[11px]">Available Stock</span>
                          <span className="font-bold text-foreground text-sm">
                            {match.availableQuantity} {match.unit}
                          </span>
                        </div>
                        <div className="rounded-xl bg-muted/20 p-3 col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground block text-[11px]">Estimated Distance</span>
                          <span className="font-bold text-foreground text-sm">
                            {match.distanceKm} km
                          </span>
                        </div>
                      </div>

                      {/* Score Breakdown Pills */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Scoring Vectors:
                        </span>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                            Volume: {match.scoreBreakdown.quantityFulfillment}%
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                            Price: {match.scoreBreakdown.priceCompetitiveness}%
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                            Distance: {match.scoreBreakdown.distanceLogistics}%
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                            Trust: {match.scoreBreakdown.sellerReliability}%
                          </span>
                        </div>
                      </div>

                      {/* Reasons */}
                      <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3 space-y-1">
                        {match.reasons.map((reason, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>

                      {/* Action CTA */}
                      <div className="pt-2 flex justify-end">
                        <Link href={`/marketplace/products/${match.productId}`}>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1">
                            <span>View Product & Purchase</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Open Requirements Board */}
            <div className="pt-6 border-t border-border">
              <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                Active Marketplace Sourcing Board ({requirements?.length || 0})
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Open procurement requests visible to verified producers and aggregator FPOs across the region.
              </p>

              {requirements && requirements.length > 0 ? (
                <div className="space-y-3">
                  {requirements.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-xl border border-border/60 bg-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground text-sm">
                            {req.requiredQuantity} {req.unit} of {req.commodity}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {req.status}
                          </Badge>
                        </div>
                        <span className="text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          Delivery to {req.deliveryLocation || 'Designated Warehouse'}
                          {req.targetPrice ? ` • Target: ₹${req.targetPrice}/${req.unit}` : ''}
                        </span>
                        {req.notes && (
                          <p className="text-muted-foreground mt-1 text-[11px] italic">
                            &quot;{req.notes}&quot;
                          </p>
                        )}
                      </div>

                      <Badge variant="secondary" className="text-[10px] shrink-0 self-start sm:self-auto">
                        Posted by {req.buyer?.businessName || 'Verified Buyer'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-border/40 bg-muted/10 text-center text-xs text-muted-foreground">
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
