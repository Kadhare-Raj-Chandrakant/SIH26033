'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Info,
  Users,
  Store,
  Layers,
  Scale,
  Building2,
  TrendingUp,
  ShieldCheck,
  Check,
  Edit3,
  Loader2,
} from 'lucide-react';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  fetchAddresses,
  getFarmerMandiIntelligence,
  getFpoBulkIntelligence,
  getSmartAllocation,
  getBestTimeToSell,
  matchBuyersForFarmer,
  SmartAllocationResult,
  BestTimeToSellResult,
  FarmerMandiIntelligenceResult,
  FpoBulkIntelligenceResult,
  BuyerMatchItem,
} from '@/lib/api';
import { fetchMyOrganization, fetchFpos } from '@/lib/api/fpo';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

const COMMODITIES = [
  'Tomato',
  'Onion',
  'Potato',
  'Wheat',
  'Rice',
  'Mustard',
  'Soybean',
  'Cotton',
  'Turmeric',
];

export default function SellerIntelligencePage() {
  return (
    <RoleGuard allowedRoles={['FARMER', 'FPO', 'ADMIN']}>
      <SellerIntelligenceContent />
    </RoleGuard>
  );
}

function SellerIntelligenceContent() {
  const { token, user } = useAuth();

  const [selectedCommodity, setSelectedCommodity] = useState<string>('Tomato');
  const [quantity, setQuantity] = useState<number>(50);
  const [minPrice, setMinPrice] = useState<number>(1400);
  const [activeTab, setActiveTab] = useState<'mandi' | 'bulk_rfqs' | 'allocation' | 'timing' | 'buyers'>('mandi');

  const [isEditingOrigin, setIsEditingOrigin] = useState<boolean>(false);
  const [customDistrict, setCustomDistrict] = useState<string>('');
  const [customState, setCustomState] = useState<string>('');

  const { data: addressData } = useQuery({
    queryKey: ['farmer-addresses', token],
    queryFn: () => fetchAddresses(token || undefined),
    enabled: !!token,
  });

  const defaultAddr = addressData?.data?.find((a) => a.isDefault) || addressData?.data?.[0];
  const registeredDistrict = defaultAddr?.district || defaultAddr?.city || 'Nashik';
  const registeredState = defaultAddr?.state || 'Maharashtra';

  const effectiveDistrict = customDistrict.trim() || registeredDistrict;
  const effectiveState = customState.trim() || registeredState;

  const {
    data: mandiData,
    isLoading: isMandiLoading,
    isError: isMandiError,
    refetch: refetchMandi,
  } = useQuery<FarmerMandiIntelligenceResult>({
    queryKey: ['farmer-mandi-intelligence', selectedCommodity, quantity, effectiveState, effectiveDistrict, token],
    queryFn: () =>
      getFarmerMandiIntelligence(
        {
          commodity: selectedCommodity,
          quantityQuintals: quantity,
          state: effectiveState,
          district: effectiveDistrict,
        },
        token || undefined,
      ),
    staleTime: 60000,
  });

  const { data: fposList } = useQuery({
    queryKey: ['fpos-list-intelligence'],
    queryFn: () => fetchFpos(),
    staleTime: 60000,
  });

  const { data: myFpo } = useQuery({
    queryKey: ['my-fpo-org', token],
    queryFn: () => fetchMyOrganization(token || undefined),
    enabled: !!token && (user?.role === 'FPO' || user?.role === 'ADMIN'),
    retry: false,
  });

  const fpoId = myFpo?.id || fposList?.[0]?.id;

  const {
    data: bulkData,
    isLoading: isBulkLoading,
  } = useQuery<FpoBulkIntelligenceResult>({
    queryKey: ['fpo-bulk-intelligence', fpoId, selectedCommodity, token],
    queryFn: () =>
      getFpoBulkIntelligence(fpoId!, selectedCommodity, token || undefined),
    enabled: !!fpoId,
    staleTime: 60000,
  });

  const {
    data: allocationData,
    isLoading: isAllocationLoading,
    isError: isAllocationError,
    refetch: refetchAllocation,
  } = useQuery<SmartAllocationResult>({
    queryKey: ['smart-allocation', selectedCommodity, quantity, effectiveDistrict, minPrice, token],
    queryFn: () =>
      getSmartAllocation(
        {
          commodity: selectedCommodity,
          quantity,
          sellerLocation: { city: effectiveDistrict, state: effectiveState },
          minAcceptablePrice: minPrice || undefined,
          includeMandis: true,
          includeDirectBuyers: true,
          includePlatformListing: true,
        },
        token || undefined,
      ),
    staleTime: 60000,
  });

  const {
    data: timingData,
    isLoading: isTimingLoading,
  } = useQuery<BestTimeToSellResult>({
    queryKey: ['best-time-to-sell', selectedCommodity, effectiveDistrict],
    queryFn: () =>
      getBestTimeToSell({
        commodity: selectedCommodity,
        market: `${effectiveDistrict} APMC`,
      }),
    staleTime: 60000,
  });

  const {
    data: buyerMatches,
    isLoading: isBuyersLoading,
  } = useQuery<BuyerMatchItem[]>({
    queryKey: ['matched-buyers', selectedCommodity, quantity, effectiveDistrict, token],
    queryFn: () =>
      matchBuyersForFarmer(
        {
          commodity: selectedCommodity,
          quantity,
          location: { city: effectiveDistrict, state: effectiveState },
        },
        token || undefined,
      ),
    staleTime: 60000,
  });

  const recommendedOption = allocationData?.recommendedOption;

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B] flex flex-col font-sans">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 max-w-6xl flex-1">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DFD8CB] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C8D9C8] bg-[#EDF3ED] px-3 py-1 text-xs font-semibold text-[#233D22] mb-2">
              <Scale className="h-3.5 w-3.5 text-[#3B532B]" />
              <span>Aroha Price Intelligence & Net Realization Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
              Producer Price & Market Arbitrage Advisory
            </h1>
            <p className="mt-1 text-xs text-[#5D6352] max-w-2xl">
              Transparent economic waterfalls evaluating farmgate origin, road logistics deductions, APMC candidate mandis, and institutional bulk buyer RFQs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/fpo/buy-requests">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B] hover:bg-[#EBE7DC]">
                <Building2 className="h-3.5 w-3.5 text-[#233D22]" />
                <span>Bulk RFQs</span>
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs rounded-md">
                Marketplace
              </Button>
            </Link>
          </div>
        </div>

        {/* Input Parameters Bar */}
        <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5D6352] flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#233D22]" />
              Arbitrage Calculation Parameters
            </span>
            <span className="text-[11px] text-[#233D22] font-semibold flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified APMC Modal Rate Benchmarks
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E221B] mb-1.5">
                Target Commodity
              </label>
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] text-sm font-medium text-[#1E221B] focus:outline-none"
              >
                {COMMODITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E221B] mb-1.5">
                Batch Volume (Quintals)
              </label>
              <input
                type="number"
                min={1}
                max={5000}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-full h-10 px-3 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] text-sm font-medium text-[#1E221B] focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-[#1E221B]">
                  Farmgate Origin
                </label>
                <button
                  type="button"
                  onClick={() => setIsEditingOrigin(!isEditingOrigin)}
                  className="text-[11px] text-[#233D22] font-medium flex items-center gap-0.5 hover:underline"
                >
                  <Edit3 className="h-2.5 w-2.5" />
                  <span>{isEditingOrigin ? 'Use Default' : 'Override'}</span>
                </button>
              </div>

              {!isEditingOrigin ? (
                <div className="h-10 px-3 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] flex items-center justify-between text-xs font-medium text-[#1E221B]">
                  <span className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 text-[#3B532B] shrink-0" />
                    <span className="font-semibold">{effectiveDistrict}</span>, {effectiveState}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-[#FCFAF6] border-[#DFD8CB] text-[#5D6352]">
                    {defaultAddr ? 'Registered' : 'Demo Hub'}
                  </Badge>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="District"
                    value={customDistrict}
                    onChange={(e) => setCustomDistrict(e.target.value)}
                    className="w-1/2 h-10 px-2 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] text-xs font-medium text-[#1E221B]"
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={customState}
                    onChange={(e) => setCustomState(e.target.value)}
                    className="w-1/2 h-10 px-2 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] text-xs font-medium text-[#1E221B]"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1E221B] mb-1.5">
                Min Target Price (₹/q)
              </label>
              <input
                type="number"
                min={0}
                value={minPrice}
                onChange={(e) => setMinPrice(Number(e.target.value) || 0)}
                className="w-full h-10 px-3 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] text-sm font-medium text-[#1E221B] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#DFD8CB] pb-3 overflow-x-auto text-xs">
          {[
            { id: 'mandi', label: 'Local Mandi Intelligence' },
            { id: 'bulk_rfqs', label: 'FPO Bulk Buyer RFQs' },
            { id: 'allocation', label: 'Multi-Channel Allocation' },
            { id: 'timing', label: 'Sell Timing Forecast' },
            { id: 'buyers', label: `Matched Direct Buyers (${buyerMatches?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap border ${
                activeTab === tab.id
                  ? 'bg-[#233D22] text-white border-[#233D22]'
                  : 'bg-[#FCFAF6] text-[#5D6352] border-[#DFD8CB] hover:text-[#1E221B] hover:bg-[#F2EFE8]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: LOCAL MANDI INTELLIGENCE */}
        {activeTab === 'mandi' && (
          <div className="space-y-6">
            {isMandiLoading && (
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Evaluating local APMC candidate mandis in {effectiveDistrict} with road freight rates...
                </p>
              </div>
            )}

            {isMandiError && !isMandiLoading && (
              <div className="p-8 text-center bg-[#FDF2F2] border border-[#D98282] rounded-lg">
                <AlertTriangle className="h-8 w-8 text-[#8C2323] mx-auto mb-2" />
                <h3 className="text-sm font-serif font-bold text-[#1E221B]">Mandi Intelligence Service Unavailable</h3>
                <p className="text-xs text-[#5D6352] mt-1">Unable to connect to live mandi pricing service.</p>
                <Button size="sm" onClick={() => refetchMandi()} className="mt-3 text-xs bg-[#233D22] hover:bg-[#1a2d19] text-white rounded-md">
                  Retry Calculation
                </Button>
              </div>
            )}

            {mandiData && (
              <>
                {mandiData.candidates.length === 0 && (
                  <div className="rounded-lg border border-dashed border-[#DFD8CB] bg-[#FCFAF6] p-10 text-center space-y-3">
                    <Info className="h-8 w-8 text-[#9A6818] mx-auto" />
                    <h3 className="text-base font-serif font-bold text-[#1E221B]">No Mandi Intelligence Available</h3>
                    <p className="text-xs text-[#5D6352] max-w-lg mx-auto">
                      {mandiData.recommendationRationale}
                    </p>
                  </div>
                )}

                {/* Hero Card: Recommended Mandi & Net Realization Waterfall */}
                {mandiData.recommendedMandi && (
                  <div className="rounded-lg border border-[#C8D9C8] bg-[#FCFAF6] p-6 space-y-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-[#233D22] text-white font-bold px-2.5 py-0.5 text-xs rounded">
                            Recommended APMC Winner
                          </Badge>
                          <Badge variant="outline" className="text-xs bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                            {mandiData.recommendedMandi.commodity} ({mandiData.recommendedMandi.variety})
                          </Badge>
                          <span className="text-xs text-[#5D6352]">
                            Farm Origin: <strong className="text-[#1E221B]">{mandiData.farmerOrigin.district}, {mandiData.farmerOrigin.state}</strong>
                          </span>
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-[#1E221B]">
                          {mandiData.recommendedMandi.marketName}
                        </h2>
                        <p className="text-xs text-[#5D6352] mt-1">
                          {mandiData.recommendationRationale}
                        </p>
                      </div>

                      <div className="text-right bg-[#EDF3ED] border border-[#C8D9C8] rounded-lg p-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#233D22] block">
                          Net Realization
                        </span>
                        <div className="text-3xl font-serif font-bold text-[#233D22] mt-0.5">
                          ₹{mandiData.recommendedMandi.estimatedNetRealizationPerQuintal.toLocaleString('en-IN')}/q
                        </div>
                        <span className="text-[11px] text-[#5D6352] mt-0.5 block">
                          Total Net: ₹{mandiData.recommendedMandi.totalNetRealization.toLocaleString('en-IN')} ({mandiData.quantityQuintals} Quintals)
                        </span>
                      </div>
                    </div>

                    {/* Transparent Arithmetic Waterfall Breakdown */}
                    <div className="rounded-lg border border-[#E0D9CB] bg-[#F4F0E6] p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1E221B] block mb-2">
                        Transparent Arithmetic Net Realization Waterfall
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                        <div className="p-2.5 rounded bg-[#FCFAF6] border border-[#DFD8CB]">
                          <span className="text-[10px] text-[#5D6352] block">Modal Price</span>
                          <span className="text-sm font-bold text-[#1E221B] block mt-0.5">
                            ₹{mandiData.recommendedMandi.modalPrice}/q
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-[#FCFAF6] border border-[#DFD8CB]">
                          <span className="text-[10px] text-[#8C2323] block">- Freight ({mandiData.recommendedMandi.roadDistanceKm} km)</span>
                          <span className="text-sm font-bold text-[#8C2323] block mt-0.5">
                            -₹{mandiData.recommendedMandi.freightPerQuintal}/q
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-[#FCFAF6] border border-[#DFD8CB]">
                          <span className="text-[10px] text-[#8C2323] block">- Handling Fee</span>
                          <span className="text-sm font-bold text-[#8C2323] block mt-0.5">
                            -₹{mandiData.recommendedMandi.handlingPerQuintal}/q
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-[#FCFAF6] border border-[#DFD8CB]">
                          <span className="text-[10px] text-[#8C2323] block">- Loading Fee</span>
                          <span className="text-sm font-bold text-[#8C2323] block mt-0.5">
                            -₹{mandiData.recommendedMandi.loadingPerQuintal}/q
                          </span>
                        </div>
                        <div className="p-2.5 rounded bg-[#233D22] text-white font-bold col-span-2 sm:col-span-1">
                          <span className="text-[10px] text-[#C8D9C8] block">= Net Realization</span>
                          <span className="text-sm font-bold block mt-0.5">
                            ₹{mandiData.recommendedMandi.estimatedNetRealizationPerQuintal}/q
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Side-by-Side Candidates Comparison */}
                {mandiData.candidates.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-serif font-bold text-[#1E221B]">
                        Evaluated Local APMC Candidates in {effectiveDistrict} ({mandiData.candidates.length})
                      </h3>
                      <span className="text-xs text-[#5D6352]">
                        Formula: {mandiData.calculationFormula}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      {mandiData.candidates.map((candidate) => (
                        <Card
                          key={candidate.mandiId}
                          className={`rounded-lg border transition-colors ${
                            candidate.isRecommended
                              ? 'border-[#233D22] bg-[#FCFAF6]'
                              : 'border-[#DFD8CB] bg-[#FCFAF6]'
                          }`}
                        >
                          <div className="p-5 space-y-4">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                                      candidate.isRecommended
                                        ? 'bg-[#233D22] text-white'
                                        : 'bg-[#F7F5EE] border border-[#DFD8CB] text-[#5D6352]'
                                    }`}
                                  >
                                    Option {candidate.marketOption}
                                  </Badge>
                                  {candidate.isRecommended && (
                                    <span className="text-[11px] font-semibold text-[#233D22] flex items-center gap-0.5">
                                      <Check className="h-3 w-3" /> Winner
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-serif font-bold text-[#1E221B] text-sm mt-1.5 leading-snug">
                                  {candidate.marketName}
                                </h4>
                                <span className="text-[11px] text-[#5D6352] block mt-0.5">
                                  {candidate.district}, {candidate.state} • {candidate.roadDistanceKm} km
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-xs text-[#5D6352] block">Modal Rate</span>
                                <span className="text-base font-bold text-[#1E221B]">
                                  ₹{candidate.modalPrice}/q
                                </span>
                              </div>
                            </div>

                            <Separator className="bg-[#DFD8CB]" />

                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between text-[#5D6352]">
                                <span>Road Distance:</span>
                                <span className="font-medium text-[#1E221B]">{candidate.roadDistanceKm} km</span>
                              </div>
                              <div className="flex justify-between text-[#5D6352]">
                                <span>Freight Tariff:</span>
                                <span className="font-medium text-[#8C2323]">-₹{candidate.freightPerQuintal}/q</span>
                              </div>
                              <div className="flex justify-between text-[#5D6352]">
                                <span>Handling & Loading:</span>
                                <span className="font-medium text-[#8C2323]">
                                  -₹{candidate.handlingPerQuintal + candidate.loadingPerQuintal}/q
                                </span>
                              </div>
                              <div className="flex justify-between text-[#5D6352] border-t border-[#DFD8CB] pt-1">
                                <span>Total Deductions:</span>
                                <span className="font-bold text-[#8C2323]">-₹{candidate.totalDeductionsPerQuintal}/q</span>
                              </div>
                              <div className="flex justify-between items-center bg-[#F7F5EE] border border-[#DFD8CB] p-2 rounded font-bold">
                                <span className="text-[#1E221B]">Net Realization:</span>
                                <span className="text-[#233D22] text-sm font-bold">
                                  ₹{candidate.estimatedNetRealizationPerQuintal}/q
                                </span>
                              </div>
                            </div>

                            <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-3 text-xs">
                              <span className="font-semibold text-[#1E221B] block mb-0.5">
                                Economic Assessment:
                              </span>
                              <p className="text-[#5D6352] text-[11px] leading-relaxed">
                                {candidate.economicTradeoff}
                              </p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: FPO BULK BUYER RFQ INTELLIGENCE */}
        {activeTab === 'bulk_rfqs' && (
          <div className="space-y-6">
            {isBulkLoading && (
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Analyzing institutional RFQs against cooperative aggregated volume...
                </p>
              </div>
            )}

            {!fpoId && !isBulkLoading && (
              <div className="rounded-lg border border-dashed border-[#DFD8CB] bg-[#FCFAF6] p-10 text-center space-y-3">
                <Building2 className="h-8 w-8 text-[#233D22] mx-auto" />
                <h3 className="text-base font-serif font-bold text-[#1E221B]">FPO Collective Access Required</h3>
                <p className="text-xs text-[#5D6352] max-w-lg mx-auto">
                  Bulk Buyer RFQ intelligence aggregates volume across accredited member cooperatives. You are currently not registered as an administrator of an approved FPO organization.
                </p>
                <div className="pt-2">
                  <Link href="/fpo/buy-requests">
                    <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs rounded-md">
                      Explore Institutional Buy Requests
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {bulkData && (
              <>
                <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className="bg-[#233D22] text-white font-bold text-xs rounded">
                          FPO Aggregation Hub
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                          {bulkData.fpo.district}, {bulkData.fpo.state}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-serif font-bold text-[#1E221B]">
                        {bulkData.fpo.name}
                      </h2>
                      <p className="text-xs text-[#5D6352] mt-0.5">
                        Aggregated Available Capacity: <strong className="text-[#1E221B]">{bulkData.fpoCapacityQuintals} Quintals</strong> ({bulkData.commodity})
                      </p>
                    </div>

                    <div className="bg-[#EDF3ED] border border-[#C8D9C8] rounded-lg p-4 sm:max-w-md">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#233D22] block mb-1">
                        Procurement Advisory
                      </span>
                      <p className="text-xs text-[#1E221B] font-medium leading-relaxed">
                        {bulkData.sideBySideComparisonSummary}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1E221B] mb-4">
                    Institutional RFQ Decision Matrix for {bulkData.commodity} ({bulkData.rfqs.length} Opportunities)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {bulkData.rfqs.map((rfq) => (
                      <Card
                        key={rfq.rfqId}
                        className={`flex flex-col justify-between overflow-hidden border rounded-lg ${
                          rfq.isEconomicallyRecommended
                            ? 'border-[#233D22] bg-[#FCFAF6]'
                            : 'border-[#DFD8CB] bg-[#FCFAF6]'
                        }`}
                      >
                        <div className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1">
                                <Badge
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    rfq.isEconomicallyRecommended
                                      ? 'bg-[#233D22] text-white'
                                      : 'bg-[#F7F5EE] border border-[#DFD8CB] text-[#5D6352]'
                                  }`}
                                >
                                  Scenario {rfq.scenario}
                                </Badge>
                                {rfq.isEconomicallyRecommended && (
                                  <Badge className="bg-[#233D22] text-white text-[9px] px-1.5 py-0 rounded">
                                    Optimal
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-serif font-bold text-[#1E221B] text-sm leading-snug">
                                {rfq.buyerName}
                              </h4>
                              <span className="text-[11px] text-[#5D6352] block">
                                {rfq.buyerType}
                              </span>
                            </div>

                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold rounded ${
                                rfq.capacityStatus === 'FULLY_FULFILLABLE'
                                  ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                                  : rfq.capacityStatus === 'PARTIALLY_FULFILLABLE'
                                  ? 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                                  : 'border-[#D98282] bg-[#FDF2F2] text-[#8C2323]'
                              }`}
                            >
                              {rfq.capacityStatus === 'FULLY_FULFILLABLE'
                                ? 'Fulfillable'
                                : rfq.capacityStatus === 'PARTIALLY_FULFILLABLE'
                                ? 'Partial'
                                : 'Infeasible'}
                            </Badge>
                          </div>

                          <Separator className="bg-[#DFD8CB]" />

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[#5D6352]">Volume Needed:</span>
                              <span className="font-bold text-[#1E221B]">{rfq.requiredQuantity} Q</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#5D6352]">Target Budget:</span>
                              <span className="font-bold text-[#1E221B]">₹{rfq.targetPriceInrPerQuintal}/q</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#5D6352]">Destination:</span>
                              <span className="font-medium text-[#1E221B]">{rfq.deliveryCity}, {rfq.deliveryState}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[#5D6352]">Road Distance:</span>
                              <span className="font-medium text-[#1E221B]">{rfq.roadDistanceKm} km</span>
                            </div>
                            <div className="flex justify-between text-[#8C2323]">
                              <span>Logistics Deductions:</span>
                              <span className="font-semibold">-₹{rfq.estimatedLogisticsCostPerQuintal}/q</span>
                            </div>
                            <div className="flex justify-between items-center bg-[#F7F5EE] border border-[#DFD8CB] p-2 rounded font-bold">
                              <span className="text-[#1E221B]">Net Realization:</span>
                              <span className="text-[#233D22] text-sm font-bold">
                                ₹{rfq.estimatedNetPerQuintal}/q
                              </span>
                            </div>
                          </div>

                          <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-3 text-xs">
                            <span className="font-semibold text-[#1E221B] block mb-0.5 text-[11px]">
                              Decision Rationale:
                            </span>
                            <p className="text-[#5D6352] text-[11px] leading-relaxed">
                              {rfq.tradeoffExplanation}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 bg-[#F7F5EE] border-t border-[#DFD8CB]">
                          <Link href={`/fpo/buy-requests`}>
                            <Button size="sm" variant={rfq.isEconomicallyRecommended ? 'default' : 'outline'} className={`w-full text-xs rounded-md ${rfq.isEconomicallyRecommended ? 'bg-[#233D22] hover:bg-[#1a2d19] text-white' : 'border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B]'}`}>
                              {rfq.capacityStatus === 'FULLY_FULFILLABLE' ? 'Review & Fulfill Contract' : 'View Capacity Options'}
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 3: SMART ALLOCATION */}
        {activeTab === 'allocation' && (
          <div className="space-y-6">
            {isAllocationLoading && (
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Evaluating mandi rates, direct buyers, logistics tariffs, and net realization...
                </p>
              </div>
            )}

            {isAllocationError && !isAllocationLoading && (
              <div className="p-8 text-center bg-[#FDF2F2] border border-[#D98282] rounded-lg">
                <AlertTriangle className="h-8 w-8 text-[#8C2323] mx-auto mb-2" />
                <h3 className="text-sm font-serif font-bold text-[#1E221B]">Intelligence Service Offline</h3>
                <p className="text-xs text-[#5D6352] mt-1">Unable to connect to multi-channel allocation engine.</p>
                <Button size="sm" onClick={() => refetchAllocation()} className="mt-3 text-xs bg-[#233D22] hover:bg-[#1a2d19] text-white rounded-md">
                  Retry Calculation
                </Button>
              </div>
            )}

            {allocationData && recommendedOption && (
              <>
                <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge className="bg-[#233D22] text-white font-bold text-xs rounded">
                          Optimal Channel
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                          {recommendedOption.channelType}
                        </Badge>
                      </div>
                      <h2 className="text-xl font-serif font-bold text-[#1E221B]">
                        {recommendedOption.channelName}
                      </h2>
                      <p className="text-xs text-[#5D6352] mt-0.5">
                        Destination: {recommendedOption.destinationLocation}
                      </p>
                    </div>

                    <div className="text-right bg-[#EDF3ED] border border-[#C8D9C8] rounded-lg p-4">
                      <span className="text-xs text-[#5D6352]">Estimated Net Realization</span>
                      <div className="text-2xl font-serif font-bold text-[#233D22]">
                        ₹{recommendedOption.perUnitNetRealization.toLocaleString('en-IN')}/q
                      </div>
                      <span className="text-[11px] text-[#5D6352]">
                        Total Batch: ₹{recommendedOption.estimatedNetRealization.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-[#DFD8CB]" />

                  <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-4 text-xs text-[#1E221B] leading-relaxed">
                    <span className="font-bold block mb-1">Recommendation Summary:</span>
                    {allocationData.recommendationRationale}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1E221B] mb-4">
                    Evaluated Channels ({allocationData.rankedOptions.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {allocationData.rankedOptions.map((opt) => (
                      <Card key={`${opt.channelName}-${opt.rank}`} className="border border-[#DFD8CB] bg-[#FCFAF6] p-4 space-y-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-serif font-bold text-[#1E221B]">{opt.channelName}</span>
                            <span className="text-[11px] text-[#5D6352] block">{opt.channelType}</span>
                          </div>
                          <Badge variant="outline" className={`text-[10px] rounded ${opt.rank === 1 ? 'bg-[#233D22] text-white border-[#233D22]' : 'bg-[#F7F5EE] border-[#DFD8CB] text-[#5D6352]'}`}>
                            Rank #{opt.rank}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-[#5D6352]">
                            <span>Gross Offer:</span>
                            <span className="font-medium text-[#1E221B]">₹{opt.expectedGrossPricePerUnit}/q</span>
                          </div>
                          <div className="flex justify-between text-[#5D6352]">
                            <span>Logistics:</span>
                            <span className="text-[#8C2323]">-₹{opt.logisticsCost}/q</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-[#DFD8CB] pt-1">
                            <span>Net Realization:</span>
                            <span className="text-[#233D22]">₹{opt.perUnitNetRealization}/q</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 4: BEST TIME TO SELL */}
        {activeTab === 'timing' && (
          <div className="space-y-6">
            {isTimingLoading && (
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Analyzing APMC arrival volume and 14-day price trajectory...
                </p>
              </div>
            )}

            {timingData && (
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className="text-xs px-2.5 py-1 font-bold bg-[#233D22] text-white rounded">
                        Recommendation: {timingData.recommendation}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                        Commodity: {timingData.commodity}
                      </Badge>
                    </div>
                    <h2 className="text-xl font-serif font-bold text-[#1E221B]">
                      {timingData.recommendationSummary}
                    </h2>
                  </div>

                  <div className="text-right bg-[#F4F0E6] rounded border border-[#E0D9CB] p-4">
                    <span className="text-xs text-[#5D6352]">Current Spot Benchmark</span>
                    <div className="text-2xl font-serif font-bold text-[#1E221B]">
                      ₹{timingData.currentPrice.toLocaleString('en-IN')}/q
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-4">
                    <span className="text-xs text-[#5D6352] block font-medium">Spot Modal Rate</span>
                    <span className="text-xl font-serif font-bold text-[#1E221B] mt-1 block">₹{timingData.currentPrice}/q</span>
                  </div>
                  <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-4">
                    <span className="text-xs text-[#5D6352] block font-medium">+7 Days Forward Projection</span>
                    <span className="text-xl font-serif font-bold text-[#1E221B] mt-1 block">
                      {timingData.forwardProjections.horizon7DaysPrice ? `₹${timingData.forwardProjections.horizon7DaysPrice}/q` : 'Data Unavailable'}
                    </span>
                  </div>
                  <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-4">
                    <span className="text-xs text-[#5D6352] block font-medium">+14 Days Forward Projection</span>
                    <span className="text-xl font-serif font-bold text-[#1E221B] mt-1 block">
                      {timingData.forwardProjections.horizon14DaysPrice ? `₹${timingData.forwardProjections.horizon14DaysPrice}/q` : 'Data Unavailable'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: MATCHED DIRECT BUYERS */}
        {activeTab === 'buyers' && (
          <div className="space-y-6">
            {isBuyersLoading && (
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Matching verified institutional buyers by demand, transit distance, and volume...
                </p>
              </div>
            )}

            {!isBuyersLoading && (!buyerMatches || buyerMatches.length === 0) && (
              <div className="rounded-lg border border-dashed border-[#DFD8CB] bg-[#FCFAF6] p-12 text-center">
                <Users className="h-10 w-10 text-[#8C867A] mx-auto mb-3" />
                <h3 className="font-serif font-bold text-[#1E221B] text-sm">No Active Buyer Requirements Found</h3>
                <p className="text-xs text-[#5D6352] max-w-md mx-auto mt-1">
                  There are currently no open procurement requirements for {selectedCommodity} within transit range.
                </p>
              </div>
            )}

            {buyerMatches && buyerMatches.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {buyerMatches.map((match) => (
                  <Card key={match.requirementId} className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-serif font-bold text-[#1E221B] text-base">
                              {match.businessName || match.buyerName}
                            </span>
                            <Badge variant="outline" className="text-[10px] bg-[#F7F5EE] border-[#DFD8CB] text-[#5D6352]">
                              {match.buyerType}
                            </Badge>
                          </div>
                          <span className="text-xs text-[#5D6352] flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 text-[#3B532B]" />
                            {match.deliveryLocation || 'Verified Destination'} ({match.distanceKm} km from {effectiveDistrict})
                          </span>
                        </div>

                        <Badge className="bg-[#233D22] text-white text-xs font-bold px-2 py-0.5 rounded">
                          {match.matchScore}/100 Match
                        </Badge>
                      </div>

                      <Separator className="bg-[#DFD8CB]" />

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[#5D6352] block">Required Volume:</span>
                          <span className="font-semibold text-[#1E221B]">
                            {match.requiredQuantity} {match.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#5D6352] block">Target Budget:</span>
                          <span className="font-semibold text-[#1E221B]">
                            {match.targetPrice ? `₹${match.targetPrice}/${match.unit}` : 'Negotiable'}
                          </span>
                        </div>
                      </div>

                      <div className="rounded border border-[#DFD8CB] bg-[#F7F5EE] p-3 space-y-1">
                        {match.reasons.map((reason, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-[#1E221B]">
                            <CheckCircle2 className="h-3 w-3 text-[#233D22] shrink-0" />
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
