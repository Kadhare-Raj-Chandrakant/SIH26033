'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Users,
  Store,
  Layers,
  Sparkles,
  CloudSun,
  Scale,
} from 'lucide-react';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  getMarketIntelligence,
  getSmartAllocation,
  getBestTimeToSell,
  matchBuyersForFarmer,
  SmartAllocationResult,
  BestTimeToSellResult,
  CommodityMarketIntelligence,
  BuyerMatchItem,
} from '@/lib/api';

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
  'Nashik',
  'Mumbai',
  'Nagpur',
  'Ahmednagar',
  'Kolhapur',
  'Aurangabad',
  'Indore',
  'Bengaluru',
];

export default function SellerIntelligencePage() {
  const [selectedCommodity, setSelectedCommodity] = useState<string>('Tomato');
  const [quantity, setQuantity] = useState<number>(50);
  const [sellerCity, setSellerCity] = useState<string>('Pune');
  const [minPrice, setMinPrice] = useState<number>(1800);
  const [activeTab, setActiveTab] = useState<'allocation' | 'timing' | 'markets' | 'buyers'>('allocation');

  // Query 1: Smart Allocation
  const {
    data: allocationData,
    isLoading: isAllocationLoading,
    isError: isAllocationError,
    refetch: refetchAllocation,
  } = useQuery<SmartAllocationResult>({
    queryKey: ['smart-allocation', selectedCommodity, quantity, sellerCity, minPrice],
    queryFn: () =>
      getSmartAllocation({
        commodity: selectedCommodity,
        quantity,
        sellerLocation: { city: sellerCity },
        minAcceptablePrice: minPrice || undefined,
        includeMandis: true,
        includeDirectBuyers: true,
        includePlatformListing: true,
      }),
    staleTime: 60000,
  });

  // Query 2: Market Intelligence
  const {
    data: marketData,
    isLoading: isMarketLoading,
  } = useQuery<CommodityMarketIntelligence>({
    queryKey: ['market-intelligence', selectedCommodity, sellerCity],
    queryFn: () =>
      getMarketIntelligence(selectedCommodity, { city: sellerCity }),
    staleTime: 60000,
  });

  // Query 3: Best Time to Sell
  const {
    data: timingData,
    isLoading: isTimingLoading,
  } = useQuery<BestTimeToSellResult>({
    queryKey: ['best-time-to-sell', selectedCommodity, sellerCity],
    queryFn: () =>
      getBestTimeToSell({
        commodity: selectedCommodity,
        market: `${sellerCity} APMC`,
      }),
    staleTime: 60000,
  });

  // Query 4: Matched Direct Buyers
  const {
    data: buyerMatches,
    isLoading: isBuyersLoading,
  } = useQuery<BuyerMatchItem[]>({
    queryKey: ['matched-buyers', selectedCommodity, quantity, sellerCity],
    queryFn: () =>
      matchBuyersForFarmer({
        commodity: selectedCommodity,
        quantity,
        location: { city: sellerCity },
      }),
    staleTime: 60000,
  });

  const recommendedOption = allocationData?.recommendedOption;

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-zinc-950/50">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-600/10 text-emerald-600">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                SIH26033 Decision Intelligence
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              Farmer Selling & Channel Optimization
            </h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
              Evaluate real channel economics, transparent logistics deductions, APMC mandi benchmarks, and verified buyer demand before listing or dispatching harvest.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/seller/orders">
              <Button variant="outline" size="sm" className="text-xs">
                View Fulfillment Orders
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                Go to Marketplace
              </Button>
            </Link>
          </div>
        </div>

        {/* Input Parameters Bar */}
        <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-600" />
              Harvest & Origin Parameters
            </span>
            <span className="text-[11px] text-muted-foreground">
              Instant multi-channel optimization
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Commodity */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Commodity
              </label>
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {COMMODITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Harvest Volume (Quintals)
              </label>
              <input
                type="number"
                min={1}
                max={5000}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Origin Location */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Farm Origin City
              </label>
              <select
                value={sellerCity}
                onChange={(e) => setSellerCity(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Price */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Min Target Price (₹/q)
              </label>
              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('allocation')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'allocation'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Scale className="h-3.5 w-3.5" />
            Where Should I Sell? (Smart Allocation)
          </button>
          <button
            onClick={() => setActiveTab('timing')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'timing'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            When Should I Sell? (Sell Timing)
          </button>
          <button
            onClick={() => setActiveTab('markets')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'markets'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Store className="h-3.5 w-3.5" />
            APMC Mandi Comparison
          </button>
          <button
            onClick={() => setActiveTab('buyers')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'buyers'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Matched Bulk Buyers ({buyerMatches?.length || 0})
          </button>
        </div>

        {/* ---------------- TAB 1: SMART ALLOCATION ---------------- */}
        {activeTab === 'allocation' && (
          <div className="space-y-6">
            {isAllocationLoading && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  Evaluating Mandi rates, matched buyers, logistics tariffs, and net realization...
                </p>
              </div>
            )}

            {isAllocationError && !isAllocationLoading && (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <h3 className="text-sm font-bold text-foreground">Intelligence Service Offline</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Unable to connect to decision engine. Core marketplace listing remains operational.
                </p>
                <Button size="sm" onClick={() => refetchAllocation()} className="mt-3 text-xs">
                  Retry Calculation
                </Button>
              </div>
            )}

            {allocationData && recommendedOption && (
              <>
                {/* Highlighted Recommendation Banner */}
                <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-emerald-600 text-white text-xs px-2.5 py-0.5 font-bold">
                          TOP RECOMMENDED CHANNEL
                        </Badge>
                        <Badge variant="outline" className="text-xs font-medium">
                          {recommendedOption.channelType === 'MANDI'
                            ? 'Physical APMC Mandi'
                            : recommendedOption.channelType === 'DIRECT_BUYER'
                            ? 'Matched Direct Buyer'
                            : 'Direct Marketplace Listing'}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-black text-foreground">
                        {recommendedOption.channelName} ({recommendedOption.destinationLocation})
                      </h2>
                      <p className="mt-1 text-xs text-muted-foreground flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-emerald-600" />
                        Distance: {recommendedOption.distanceKm} km from {sellerCity} • Settlement: {recommendedOption.settlementTimeline}
                      </p>
                    </div>

                    <div className="flex items-baseline lg:items-end flex-col bg-background/80 backdrop-blur rounded-xl p-4 border border-border/80">
                      <span className="text-xs text-muted-foreground font-medium">
                        Estimated Net Realization
                      </span>
                      <div className="text-2xl font-black text-emerald-600">
                        ₹{recommendedOption.estimatedNetRealization.toLocaleString('en-IN')}
                      </div>
                      <span className="text-xs font-semibold text-foreground mt-0.5">
                        ₹{recommendedOption.perUnitNetRealization.toLocaleString('en-IN')}/quintal
                      </span>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Explainable Rationale */}
                  <div className="rounded-xl bg-background/90 p-4 border border-border/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-1">
                      Why this channel was chosen
                    </span>
                    <p className="text-xs text-foreground font-medium leading-relaxed">
                      {allocationData.recommendationRationale}
                    </p>
                  </div>
                </div>

                {/* Comparative Channel Cards */}
                <div>
                  <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                    <span>Ranked Channel Comparison</span>
                    <span className="text-xs font-normal text-muted-foreground">
                      (Evaluated across gross price, estimated freight, fees & taxes)
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {allocationData.rankedOptions.map((opt) => {
                      const isTop = opt.rank === 1;
                      return (
                        <Card
                          key={`${opt.channelType}-${opt.channelName}`}
                          className={`relative overflow-hidden transition-all border ${
                            isTop
                              ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
                              : 'border-border/80 hover:border-border'
                          }`}
                        >
                          <CardContent className="p-5 space-y-4">
                            {/* Header */}
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                  Option #{opt.rank}
                                </span>
                                <h4 className="font-bold text-foreground text-base leading-snug">
                                  {opt.channelName}
                                </h4>
                                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="h-3 w-3" />
                                  {opt.destinationLocation} ({opt.distanceKm} km)
                                </span>
                              </div>
                              <Badge
                                variant={
                                  opt.channelType === 'DIRECT_BUYER'
                                    ? 'farmer'
                                    : opt.channelType === 'PLATFORM_LISTING'
                                    ? 'success'
                                    : 'secondary'
                                }
                                className="text-[10px]"
                              >
                                {opt.channelType.replace('_', ' ')}
                              </Badge>
                            </div>

                            <Separator />

                            {/* Transparent Economics Waterfall */}
                            <div className="space-y-1.5 text-xs">
                              <div className="flex justify-between text-muted-foreground">
                                <span>Gross Expected Price:</span>
                                <span className="font-semibold text-foreground">
                                  ₹{opt.expectedGrossPricePerUnit}/q
                                </span>
                              </div>
                              <div className="flex justify-between text-muted-foreground">
                                <span>Total Gross Value:</span>
                                <span className="font-semibold text-foreground">
                                  ₹{opt.grossSellingValue.toLocaleString('en-IN')}
                                </span>
                              </div>

                              <div className="pt-2 space-y-1 text-muted-foreground border-t border-border/40">
                                <div className="flex justify-between text-destructive">
                                  <span>- Estimated Logistics ({opt.distanceKm} km):</span>
                                  <span>-₹{opt.logisticsCost.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between text-destructive">
                                  <span>- Handling / Packaging:</span>
                                  <span>-₹{opt.handlingCost.toLocaleString('en-IN')}</span>
                                </div>
                                  <div className="flex justify-between text-destructive">
                                    <span>
                                      {opt.channelType === 'MANDI' ? '- Mandi Cess / Tax:' : '- Platform Transaction Fee:'}
                                    </span>
                                    <span>-₹{opt.platformOrMandiFee.toLocaleString('en-IN')}</span>
                                  </div>
                              </div>

                              <div className="pt-2 border-t border-border flex justify-between items-baseline font-bold text-sm">
                                <span className="text-foreground">Estimated Net:</span>
                                <span className="text-emerald-600 font-extrabold text-base">
                                  ₹{opt.estimatedNetRealization.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                                <span>Net Realization / Quintal:</span>
                                <span className="text-foreground font-bold">
                                  ₹{opt.perUnitNetRealization.toLocaleString('en-IN')}/q
                                </span>
                              </div>
                            </div>

                            <Separator />

                            {/* Advantages & Disadvantages */}
                            <div className="space-y-2 text-[11px]">
                              {opt.advantages.slice(0, 2).map((adv, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                                  <span>{adv}</span>
                                </div>
                              ))}
                              {opt.disadvantages.slice(0, 1).map((dis, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  <span>{dis}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Hard Constraints Eliminated Candidates */}
                {allocationData.eliminatedCandidates && allocationData.eliminatedCandidates.length > 0 && (
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-3">
                      <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                      Channels Eliminated by Hard Constraints ({allocationData.eliminatedCandidates.length})
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {allocationData.eliminatedCandidates.map((elim, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-background/50 p-3 text-xs"
                        >
                          <XCircle className="h-4 w-4 text-zinc-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-foreground">
                              {elim.candidateName}
                            </span>{' '}
                            <span className="text-[10px] text-muted-foreground">
                              ({elim.channelType})
                            </span>
                            <p className="text-muted-foreground text-[11px] mt-0.5">
                              Elimination reason: {elim.reason}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mandatory Pre-Sale Settlement Distinction */}
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3 text-xs text-muted-foreground">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-foreground">
                      Pre-Sale Estimation vs Actual Settlement Distinction:
                    </span>{' '}
                    {allocationData.settlementDistinctionNotice}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------- TAB 2: BEST TIME TO SELL ---------------- */}
        {activeTab === 'timing' && (
          <div className="space-y-6">
            {isTimingLoading && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  Analyzing 14-day APMC arrival velocity and price trajectory...
                </p>
              </div>
            )}

            {timingData && (
              <>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant={
                            timingData.recommendation === 'Sell now'
                              ? 'success'
                              : timingData.recommendation === 'Consider selling soon'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-xs px-2.5 py-1 font-bold"
                        >
                          Recommendation: {timingData.recommendation}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Commodity: {timingData.commodity}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-bold text-foreground">
                        {timingData.recommendationSummary}
                      </h2>
                    </div>

                    <div className="text-right bg-muted/40 rounded-xl p-4 border border-border/60">
                      <span className="text-xs text-muted-foreground">Current APMC Benchmark</span>
                      <div className="text-2xl font-black text-foreground">
                        ₹{timingData.currentPrice.toLocaleString('en-IN')}/q
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* 7-day and 14-day Horizon Projections */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <span className="text-xs text-muted-foreground block font-medium">
                        Current Spot Modal Price
                      </span>
                      <span className="text-xl font-bold text-foreground mt-1 block">
                        ₹{timingData.currentPrice}/quintal
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 block">
                        Observed APMC benchmark
                      </span>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <span className="text-xs text-muted-foreground block font-medium">
                        +7 Days Forward Estimate
                      </span>
                      <span className="text-xl font-bold text-foreground mt-1 block">
                        {timingData.forwardProjections.horizon7DaysPrice
                          ? `₹${timingData.forwardProjections.horizon7DaysPrice}/quintal`
                          : 'Insufficient Data'}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 block">
                        Model projected trajectory
                      </span>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <span className="text-xs text-muted-foreground block font-medium">
                        +14 Days Forward Estimate
                      </span>
                      <span className="text-xl font-bold text-foreground mt-1 block">
                        {timingData.forwardProjections.horizon14DaysPrice
                          ? `₹${timingData.forwardProjections.horizon14DaysPrice}/quintal`
                          : 'Insufficient Data'}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 block">
                        Longer horizon advisory
                      </span>
                    </div>
                  </div>

                  {/* Supporting Factors */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                      Factors Influencing This Sell-Timing Advisory
                    </h4>
                    <div className="space-y-2">
                      {timingData.supportingFactors.map((factor, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 rounded-xl border border-border/40 bg-muted/10 p-3 text-xs"
                        >
                          <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-foreground font-medium">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Perishability Risk Assessment */}
                  <div className="rounded-xl border border-border/80 bg-background p-4 text-xs space-y-1">
                    <span className="font-bold text-foreground block">
                      Crop Perishability Risk Profile:
                    </span>
                    <p className="text-muted-foreground">
                      {timingData.perishabilityRiskAssessment}
                    </p>
                  </div>

                  {/* Model Limitations Notice */}
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 text-xs text-muted-foreground space-y-1">
                    <span className="font-semibold text-foreground block">
                      Model Limitations & Scope:
                    </span>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {timingData.limitations.map((lim, idx) => (
                        <li key={idx}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------- TAB 3: APMC MANDI COMPARISON ---------------- */}
        {activeTab === 'markets' && (
          <div className="space-y-6">
            {isMarketLoading && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  Gathering cross-market APMC arrivals and weather logs...
                </p>
              </div>
            )}

            {marketData && (
              <>
                {/* Stats Summary Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium">
                      APMC Reporting Mandis
                    </span>
                    <div className="text-2xl font-black text-foreground mt-1">
                      {marketData.totalMarketsReporting}
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Benchmark date: {marketData.reportingDate}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium">
                      Avg APMC Modal Price
                    </span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">
                      ₹{marketData.overallStats.avgModalPrice}/q
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Spread: ₹{marketData.overallStats.minModalPrice} – ₹{marketData.overallStats.maxModalPrice}
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium">
                      Total Market Arrivals
                    </span>
                    <div className="text-2xl font-black text-foreground mt-1">
                      {marketData.overallStats.totalArrivalsTonnes.toLocaleString()} T
                    </div>
                    <span className="text-[11px] text-muted-foreground font-medium text-amber-600">
                      Wholesale Absorption Proxy
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
                    <span className="text-xs text-muted-foreground font-medium">
                      Top Paying Mandi
                    </span>
                    <div className="text-lg font-bold text-foreground mt-1 truncate">
                      {marketData.overallStats.topPayingMarket}
                    </div>
                    <span className="text-[11px] text-emerald-600 font-semibold">
                      Max Price: ₹{marketData.overallStats.maxModalPrice}/q
                    </span>
                  </div>
                </div>

                {/* Mandi Table */}
                <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-border/60 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-foreground text-sm">
                        Cross-Mandi Price & Transport Matrix for {selectedCommodity}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Modal rates evaluated against estimated freight (straight-line geographic distance) from {sellerCity}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-muted/40 border-b border-border text-muted-foreground font-semibold">
                        <tr>
                          <th className="p-3">Mandi / District</th>
                          <th className="p-3 text-right">Modal Rate</th>
                          <th className="p-3 text-right">Min / Max</th>
                          <th className="p-3 text-right">Wholesale Arrivals</th>
                          <th className="p-3 text-right">Distance</th>
                          <th className="p-3 text-right">Est. Freight/q</th>
                          <th className="p-3 text-right">Net After Freight</th>
                          <th className="p-3 text-center">Agri-Weather</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {marketData.markets.map((m) => (
                          <tr key={`${m.market}-${m.district}`} className="hover:bg-muted/20">
                            <td className="p-3 font-semibold text-foreground">
                              {m.market}
                              <span className="block text-[11px] font-normal text-muted-foreground">
                                {m.district}, {m.state}
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-foreground">
                              ₹{m.modalPrice}/q
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              ₹{m.minPrice} – ₹{m.maxPrice}
                            </td>
                            <td className="p-3 text-right text-foreground font-medium">
                              {m.arrivals} Tonnes
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {m.distanceKm !== undefined ? `${m.distanceKm} km` : '—'}
                            </td>
                            <td className="p-3 text-right text-destructive font-medium">
                              {m.estimatedLogisticsCostPerUnit !== undefined
                                ? `-₹${m.estimatedLogisticsCostPerUnit}/q`
                                : '—'}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-600">
                              {m.estimatedNetAfterLogistics !== undefined
                                ? `₹${m.estimatedNetAfterLogistics}/q`
                                : `₹${m.modalPrice}/q`}
                            </td>
                            <td className="p-3 text-center">
                              {m.tempMean !== null ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <CloudSun className="h-3 w-3 text-amber-500" />
                                  {m.tempMean}°C
                                </span>
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Data Source Disclosures */}
                <div className="rounded-xl border border-border/60 bg-muted/10 p-4 text-xs text-muted-foreground space-y-2">
                  <span className="font-semibold text-foreground block">
                    Transparent Data Source Disclosures:
                  </span>
                  <p>• <strong>APMC Mandi Data:</strong> {marketData.dataSourceDisclosures.apmcMandi}</p>
                  <p>• <strong>Wholesale Arrival Distinction:</strong> {marketData.dataSourceDisclosures.wholesaleAbsorptionNotice}</p>
                  <p>• <strong>Live Platform Catalog:</strong> {marketData.dataSourceDisclosures.platformMarketplace}</p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---------------- TAB 4: MATCHED BULK BUYERS ---------------- */}
        {activeTab === 'buyers' && (
          <div className="space-y-6">
            {isBuyersLoading && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-emerald-600 border-r-transparent mb-3" />
                <p className="text-sm font-semibold text-foreground">
                  Matching registered buyers by commodity demand, estimated geographic distance, and quantity...
                </p>
              </div>
            )}

            {!isBuyersLoading && (!buyerMatches || buyerMatches.length === 0) && (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-bold text-foreground text-sm">No Active Buyer Requirements Found</h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                  There are currently no open procurement requirements for {selectedCommodity} within regional transit range. Check back soon or list directly on the marketplace.
                </p>
              </div>
            )}

            {buyerMatches && buyerMatches.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {buyerMatches.map((match) => (
                  <Card key={match.requirementId} className="border border-border/80 shadow-sm">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground text-base">
                              {match.businessName || match.buyerName}
                            </span>
                            <Badge variant="outline" className="text-[10px]">
                              {match.buyerType}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-emerald-600" />
                            {match.deliveryLocation || 'Verified Hub'} ({match.distanceKm} km from {sellerCity})
                          </span>
                        </div>

                        <div className="flex flex-col items-end">
                          <Badge
                            className={`text-xs font-bold px-2 py-0.5 ${
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

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Required Volume:</span>
                          <span className="font-semibold text-foreground">
                            {match.requiredQuantity} {match.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Target Budget:</span>
                          <span className="font-semibold text-foreground">
                            {match.targetPrice ? `₹${match.targetPrice}/${match.unit}` : 'Negotiable'}
                          </span>
                        </div>
                      </div>

                      {/* Score Breakdown Pills */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Compatibility Assessment:
                        </span>
                        <div className="flex flex-wrap gap-1.5 text-[11px]">
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                            Commodity: {match.scoreBreakdown.commodityCompatibility}%
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                            Quantity: {match.scoreBreakdown.quantityCompatibility}%
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                            Distance: {match.scoreBreakdown.locationDistance}%
                          </span>
                          <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">
                            Price: {match.scoreBreakdown.priceCompatibility}%
                          </span>
                        </div>
                      </div>

                      {/* Explainable Reasons */}
                      <div className="rounded-xl bg-muted/20 p-3 space-y-1">
                        {match.reasons.map((reason, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-foreground">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                            <span>{reason}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
