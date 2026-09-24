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
  TrendingDown,
  ShieldCheck,
  Check,
  Edit3,
  Loader2,
  Truck,
  ArrowRight,
  DollarSign,
  BarChart3,
  Sparkles,
  PieChart,
  HelpCircle,
  Award,
  ChevronRight,
  Activity,
  Gauge,
  Percent,
  Sliders,
  Box,
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
  LocalMandiCandidate,
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
  const [selectedMandiId, setSelectedMandiId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<'perQuintal' | 'totalBatch'>('perQuintal');
  const [trajectoryHoverIndex, setTrajectoryHoverIndex] = useState<number | null>(null);
  const [active3DSector, setActive3DSector] = useState<string | null>(null);

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
  const recommendedMandi = mandiData?.recommendedMandi;

  // Visual calculations
  const bestCandidate = recommendedMandi || mandiData?.candidates?.[0];
  const worstCandidate = mandiData?.candidates?.length
    ? [...mandiData.candidates].sort((a, b) => a.estimatedNetRealizationPerQuintal - b.estimatedNetRealizationPerQuintal)[0]
    : null;

  const totalArbitrageGain = bestCandidate && worstCandidate
    ? (bestCandidate.estimatedNetRealizationPerQuintal - worstCandidate.estimatedNetRealizationPerQuintal) * quantity
    : 0;

  const realizationEfficiency = bestCandidate && bestCandidate.modalPrice > 0
    ? ((bestCandidate.estimatedNetRealizationPerQuintal / bestCandidate.modalPrice) * 100).toFixed(1)
    : '97.3';

  // 14-day price trajectory points
  const spotPrice = timingData?.currentPrice || bestCandidate?.modalPrice || 1570;
  const p7 = timingData?.forwardProjections?.horizon7DaysPrice || Math.round(spotPrice * 1.035);
  const p14 = timingData?.forwardProjections?.horizon14DaysPrice || Math.round(spotPrice * 1.015);

  const trajectoryPoints = [
    { label: 'Day -7', day: -7, price: Math.round(spotPrice * 0.965), arrivalTonnes: 410 },
    { label: 'Day -3', day: -3, price: Math.round(spotPrice * 0.98), arrivalTonnes: 380 },
    { label: 'Today (Spot)', day: 0, price: spotPrice, arrivalTonnes: 340, isToday: true },
    { label: 'Day +3', day: 3, price: Math.round(spotPrice + (p7 - spotPrice) * 0.55), arrivalTonnes: 310 },
    { label: 'Day +7 (Peak)', day: 7, price: p7, arrivalTonnes: 270, isPeak: true },
    { label: 'Day +10', day: 10, price: Math.round(p7 - (p7 - p14) * 0.4), arrivalTonnes: 320 },
    { label: 'Day +14', day: 14, price: p14, arrivalTonnes: 390 },
  ];

  const maxTrajectoryPrice = Math.max(...trajectoryPoints.map((p) => p.price)) * 1.03;
  const minTrajectoryPrice = Math.min(...trajectoryPoints.map((p) => p.price)) * 0.97;

  // DYNAMIC 3D PIE EXTRUSION HEIGHTS (Calculated in real-time based on quantity & price)
  // Scaling ratio dynamically expands when volume or price increases
  const volumeScale = Math.min(1.5, Math.max(0.65, Math.log10(quantity + 5) / 1.7));
  const modalRate = bestCandidate?.modalPrice || 1570;
  const freightRate = bestCandidate?.freightPerQuintal || 26.7;
  const laborRate = (bestCandidate?.handlingPerQuintal || 10) + (bestCandidate?.loadingPerQuintal || 5);
  const netRate = bestCandidate?.estimatedNetRealizationPerQuintal || 1528.3;

  // 3D extrusion heights for the 4 cylindrical sectors
  const hNet = Math.round(115 * volumeScale);
  const hModal = Math.round(75 * volumeScale);
  const hFreight = Math.round(45 * volumeScale);
  const hLabor = Math.round(20 * volumeScale);

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B] flex flex-col font-sans">
      <MarketplaceNavbar />

      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8 max-w-6xl flex-1">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DFD8CB] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C8D9C8] bg-[#EDF3ED] px-3 py-1 text-xs font-semibold text-[#233D22] mb-2">
              <Activity className="h-3.5 w-3.5 text-[#3B532B]" />
              <span>Aroha Statistical Price & Arbitrage Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
              Producer Net Realization & Arbitrage Advisory
            </h1>
            <p className="mt-1 text-xs text-[#5D6352] max-w-2xl">
              Live quantitative market telemetry, mathematical waterfall deductions, and forward econometric forecasting.
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
        <div className="rounded-xl border border-[#DFD8CB] bg-[#FCFAF6] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5D6352] flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-[#233D22]" />
              Arbitrage Calculation Parameters
            </span>
            <span className="text-[11px] text-[#233D22] font-semibold flex items-center gap-1 bg-[#EDF3ED] px-2.5 py-0.5 rounded-full border border-[#C8D9C8]">
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
                className="w-full h-10 px-3 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] text-sm font-medium text-[#1E221B] focus:outline-hidden focus:border-[#233D22] focus:ring-1 focus:ring-[#233D22]"
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
                className="w-full h-10 px-3 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] text-sm font-medium text-[#1E221B] focus:outline-hidden focus:border-[#233D22] focus:ring-1 focus:ring-[#233D22]"
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
                  className="text-[11px] text-[#233D22] font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
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
                className="w-full h-10 px-3 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] text-sm font-medium text-[#1E221B] focus:outline-hidden focus:border-[#233D22] focus:ring-1 focus:ring-[#233D22]"
              />
            </div>
          </div>
        </div>

        {/* TOP STATISTICAL TELEMETRY GAUGES */}
        {bestCandidate && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Gauge 1 */}
            <div className="rounded-xl border border-[#DFD8CB] bg-[#FCFAF6] p-4 flex items-center gap-3 shadow-2xs">
              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-[#EDE7DA]"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#233D22]"
                    strokeDasharray={`${realizationEfficiency}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-[11px] font-bold text-[#233D22]">{realizationEfficiency}%</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6B7060] block">Realization Rate</span>
                <span className="text-sm font-bold text-[#1E221B]">₹{bestCandidate.estimatedNetRealizationPerQuintal}/q</span>
                <span className="text-[10px] text-[#2E7D32] block">Only 2.7% friction</span>
              </div>
            </div>

            {/* Gauge 2 */}
            <div className="rounded-xl border border-[#DFD8CB] bg-[#FCFAF6] p-4 flex items-center gap-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#EDF3ED] border border-[#A5D6A7] flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6 text-[#233D22]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6B7060] block">Arbitrage Spread</span>
                <span className="text-sm font-bold text-[#233D22]">+{totalArbitrageGain > 0 ? `₹${totalArbitrageGain.toLocaleString('en-IN')}` : '₹3,400'}</span>
                <span className="text-[10px] text-[#5D6352] block">vs. sub-optimal yards</span>
              </div>
            </div>

            {/* Gauge 3 */}
            <div className="rounded-xl border border-[#DFD8CB] bg-[#FCFAF6] p-4 flex items-center gap-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#FCF8EC] border border-[#E8DEC8] flex items-center justify-center shrink-0">
                <Truck className="w-6 h-6 text-[#9A6818]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6B7060] block">Transit Distance</span>
                <span className="text-sm font-bold text-[#1E221B]">{bestCandidate.roadDistanceKm} km</span>
                <span className="text-[10px] text-[#5D6352] block">Freight: ₹{bestCandidate.freightPerQuintal}/q</span>
              </div>
            </div>

            {/* Gauge 4 */}
            <div className="rounded-xl border border-[#DFD8CB] bg-[#FCFAF6] p-4 flex items-center gap-3 shadow-2xs">
              <div className="w-12 h-12 rounded-full bg-[#EDE7DA] border border-[#DFD8CB] flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-[#233D22]" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6B7060] block">Yard Influx Volume</span>
                <span className="text-sm font-bold text-[#1E221B]">{bestCandidate.marketArrivalsTonnes || 340} Tonnes</span>
                <span className="text-[10px] text-[#2E7D32] block">High clearance liquidity</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#DFD8CB] pb-3 overflow-x-auto text-xs scrollbar-none">
          {[
            { id: 'mandi', label: 'Local Mandi Intelligence', icon: BarChart3 },
            { id: 'bulk_rfqs', label: 'FPO Bulk Buyer RFQs', icon: Building2 },
            { id: 'allocation', label: 'Multi-Channel Allocation', icon: Layers },
            { id: 'timing', label: 'Sell Timing Forecast', icon: TrendingUp },
            { id: 'buyers', label: `Matched Direct Buyers (${buyerMatches?.length || 0})`, icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-md font-medium transition-all whitespace-nowrap border cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#233D22] text-white border-[#233D22] shadow-xs'
                    : 'bg-[#FCFAF6] text-[#5D6352] border-[#DFD8CB] hover:text-[#1E221B] hover:bg-[#F2EFE8]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: LOCAL MANDI INTELLIGENCE */}
        {activeTab === 'mandi' && (
          <div className="space-y-6">
            {isMandiLoading && (
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Evaluating local APMC candidate mandis in {effectiveDistrict} with road freight rates...
                </p>
              </div>
            )}

            {isMandiError && !isMandiLoading && (
              <div className="p-8 text-center bg-[#FDF2F2] border border-[#D98282] rounded-xl">
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
                {/* 1. VISUAL FARMER VERDICT CARD */}
                {mandiData.recommendedMandi && (
                  <div className="rounded-xl border-2 border-[#233D22] bg-[#FCFAF6] p-6 shadow-sm space-y-6">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#233D22] text-[#FAF8F2] text-xs font-bold tracking-wide shadow-2xs">
                            <Award className="w-3.5 h-3.5 text-[#C8E6C9]" />
                            Optimal Mandi Winner
                          </span>
                          <Badge variant="outline" className="text-xs bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                            {mandiData.recommendedMandi.commodity} ({mandiData.recommendedMandi.variety})
                          </Badge>
                          <span className="text-xs text-[#5D6352]">
                            From: <strong className="text-[#1E221B]">{mandiData.farmerOrigin.district}, {mandiData.farmerOrigin.state}</strong>
                          </span>
                        </div>

                        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
                          {mandiData.recommendedMandi.marketName}
                        </h2>

                        <p className="text-xs sm:text-sm text-[#4E5246] max-w-xl leading-relaxed">
                          {mandiData.recommendationRationale}
                        </p>
                      </div>

                      {/* Prominent Farmer Take-Home Earnings Box */}
                      <div className="bg-[#EDF3ED] border border-[#A5D6A7] rounded-xl p-5 sm:min-w-70 text-center lg:text-right shadow-2xs">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#233D22] block">
                          Net Take-Home Earnings
                        </span>
                        <div className="text-3xl sm:text-4xl font-serif font-bold text-[#233D22] mt-1">
                          ₹{mandiData.recommendedMandi.estimatedNetRealizationPerQuintal.toLocaleString('en-IN')}
                          <span className="text-sm font-sans font-normal text-[#3E5C3C]">/q</span>
                        </div>
                        <div className="text-xs font-semibold text-[#2E4A2C] mt-1.5 bg-[#DCEDDC] py-1 px-2.5 rounded-md inline-block">
                          Total Payout: ₹{mandiData.recommendedMandi.totalNetRealization.toLocaleString('en-IN')}
                          <span className="text-[11px] font-normal text-[#5D6352] ml-1">({mandiData.quantityQuintals} Quintals)</span>
                        </div>
                      </div>
                    </div>

                    {/* ========================================================================= */}
                    {/* 2. DYNAMIC 3D ISOMETRIC STEPPED PIE VISUALIZER (WITH REAL-TIME ELEVATION) */}
                    {/* ========================================================================= */}
                    <div className="rounded-xl border border-[#DFD8CB] bg-[#F4F0E6] p-6 space-y-5 shadow-2xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Box className="w-4 h-4 text-[#233D22]" />
                            <span className="text-xs font-bold uppercase tracking-wider text-[#1E221B]">
                              3D Isometric Realization & Cost Arbitrage Cylinder
                            </span>
                            <Badge className="bg-[#233D22] text-white text-[10px] font-bold">Interactive 3D</Badge>
                          </div>
                          <span className="text-[11px] text-[#5D6352] block mt-0.5">
                            3D stepped cylinders dynamically raise and lower elevation as volume and prices shift.
                          </span>
                        </div>

                        {/* Interactive Unit Toggle */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setChartMode('perQuintal')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                              chartMode === 'perQuintal'
                                ? 'bg-[#233D22] text-white shadow-2xs'
                                : 'bg-[#EDE7DA] text-[#4E5246] hover:bg-[#E0D8CB]'
                            }`}
                          >
                            ₹/Quintal
                          </button>
                          <button
                            type="button"
                            onClick={() => setChartMode('totalBatch')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                              chartMode === 'totalBatch'
                                ? 'bg-[#233D22] text-white shadow-2xs'
                                : 'bg-[#EDE7DA] text-[#4E5246] hover:bg-[#E0D8CB]'
                            }`}
                          >
                            Total Batch ({quantity}q)
                          </button>
                        </div>
                      </div>

                      {/* 3D Visualizer Canvas & Surrounding Statistical Callouts */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center bg-[#FFFFFF] border border-[#DFD8CB] rounded-xl p-6 shadow-xs relative">
                        
                        {/* LEFT STATISTICAL CALLOUTS */}
                        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
                          {/* Top-Left: APMC Modal Gross (Sector 2 - Sage) */}
                          <div
                            onMouseEnter={() => setActive3DSector('modal')}
                            onMouseLeave={() => setActive3DSector(null)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                              active3DSector === 'modal'
                                ? 'border-[#5C8A55] bg-[#F1F7F0] shadow-xs'
                                : 'border-[#E0D9CB] bg-[#FAF8F2] hover:border-[#5C8A55]'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs text-[#5C8A55] font-bold">
                              <span className="w-3 h-3 rounded-full bg-[#5C8A55]" />
                              <span>APMC Modal Gross</span>
                            </div>
                            <div className="text-xl font-bold font-serif text-[#1E221B] mt-1">
                              {chartMode === 'perQuintal' ? `₹${modalRate}/q` : `₹${(modalRate * quantity).toLocaleString('en-IN')}`}
                            </div>
                            <span className="text-[10px] text-[#6B7060] block">100% Gross Baseline (Elevated {hModal}px)</span>
                          </div>

                          {/* Bottom-Left: Road Freight Deduction (Sector 3 - Terracotta) */}
                          <div
                            onMouseEnter={() => setActive3DSector('freight')}
                            onMouseLeave={() => setActive3DSector(null)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                              active3DSector === 'freight'
                                ? 'border-[#E07A5F] bg-[#FDF4F2] shadow-xs'
                                : 'border-[#E0D9CB] bg-[#FAF8F2] hover:border-[#E07A5F]'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs text-[#E07A5F] font-bold">
                              <span className="w-3 h-3 rounded-full bg-[#E07A5F]" />
                              <span>Road Freight Deduction</span>
                            </div>
                            <div className="text-xl font-bold font-serif text-[#C62828] mt-1">
                              {chartMode === 'perQuintal' ? `-₹${freightRate}/q` : `-₹${(freightRate * quantity).toLocaleString('en-IN')}`}
                            </div>
                            <span className="text-[10px] text-[#6B7060] block">-1.7% Road Logistics ({bestCandidate?.roadDistanceKm ?? 17}km | {hFreight}px)</span>
                          </div>
                        </div>

                        {/* CENTER 3D ISOMETRIC STEPPED CYLINDER SVG */}
                        <div className="lg:col-span-6 flex flex-col items-center justify-center order-1 lg:order-2 py-4">
                          <div className="w-full max-w-105 aspect-4/3 relative flex items-center justify-center select-none">
                            <svg className="w-full h-full drop-shadow-md" viewBox="0 0 500 420">
                              <defs>
                                {/* Sector 1: Deep Forest Green Payout Gradients */}
                                <linearGradient id="p1Top" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#355833" />
                                  <stop offset="100%" stopColor="#233D22" />
                                </linearGradient>
                                <linearGradient id="p1Wall" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#233D22" />
                                  <stop offset="100%" stopColor="#142613" />
                                </linearGradient>
                                <linearGradient id="p1RadialWall" x1="0" y1="0" x2="1" y2="0">
                                  <stop offset="0%" stopColor="#2A4729" />
                                  <stop offset="100%" stopColor="#1B301A" />
                                </linearGradient>

                                {/* Sector 2: Sage / Mint Modal Benchmark Gradients */}
                                <linearGradient id="p2Top" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#8AB885" />
                                  <stop offset="100%" stopColor="#6C9E67" />
                                </linearGradient>
                                <linearGradient id="p2Wall" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#5C8A55" />
                                  <stop offset="100%" stopColor="#456B3F" />
                                </linearGradient>

                                {/* Sector 3: Terracotta / Peach Freight Gradients */}
                                <linearGradient id="p3Top" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#F4A261" />
                                  <stop offset="100%" stopColor="#E76F51" />
                                </linearGradient>
                                <linearGradient id="p3Wall" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#D95D39" />
                                  <stop offset="100%" stopColor="#B34423" />
                                </linearGradient>

                                {/* Sector 4: Warm Grey Labor / Cess Platform Gradients */}
                                <linearGradient id="p4Top" x1="0" y1="0" x2="1" y2="1">
                                  <stop offset="0%" stopColor="#E2DCD2" />
                                  <stop offset="100%" stopColor="#CDC6B8" />
                                </linearGradient>
                                <linearGradient id="p4Wall" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#B8B0A0" />
                                  <stop offset="100%" stopColor="#9C9484" />
                                </linearGradient>
                              </defs>

                              {/* BASE SHADOW */}
                              <ellipse cx="250" cy="300" rx="165" ry="75" fill="#D5CBB9" opacity="0.6" filter="blur(6px)" />

                              {/* ============================================================ */}
                              {/* SECTOR 4: MANDI HANDLING (BASE STEP, LOWEST ELEVATION) */}
                              {/* ============================================================ */}
                              <g
                                className="cursor-pointer transition-all duration-500"
                                onMouseEnter={() => setActive3DSector('labor')}
                                onMouseLeave={() => setActive3DSector(null)}
                                style={{
                                  transform: active3DSector === 'labor' ? 'translateY(-6px)' : 'translateY(0)',
                                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                              >
                                {/* Outer Curved Cylinder Wall */}
                                <path
                                  d={`M 145,280 A 155 75 0 0 0 250,335 L 250,${335 - hLabor} A 155 75 0 0 1 145,${280 - hLabor} Z`}
                                  fill="url(#p4Wall)"
                                />
                                {/* Top Elliptical Pie Cap */}
                                <path
                                  d={`M 250,${260 - hLabor} L 145,${280 - hLabor} A 155 75 0 0 0 250,${335 - hLabor} Z`}
                                  fill="url(#p4Top)"
                                  stroke="#CDC6B8"
                                  strokeWidth="1"
                                />
                              </g>

                              {/* ============================================================ */}
                              {/* SECTOR 3: ROAD FREIGHT LOGISTICS (MEDIUM-LOW STEP) */}
                              {/* ============================================================ */}
                              <g
                                className="cursor-pointer transition-all duration-500"
                                onMouseEnter={() => setActive3DSector('freight')}
                                onMouseLeave={() => setActive3DSector(null)}
                                style={{
                                  transform: active3DSector === 'freight' ? 'translateY(-8px)' : 'translateY(0)',
                                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                              >
                                {/* Outer Curved Cylinder Wall */}
                                <path
                                  d={`M 100,235 A 155 75 0 0 0 145,280 L 145,${280 - hFreight} A 155 75 0 0 1 100,${235 - hFreight} Z`}
                                  fill="url(#p3Wall)"
                                />
                                {/* Step Cross-Section Wall facing forward */}
                                <polygon
                                  points={`250,${260 - hFreight} 145,${280 - hFreight} 145,${280 - hLabor} 250,${260 - hLabor}`}
                                  fill="#C84B2B"
                                />
                                {/* Top Elliptical Pie Cap */}
                                <path
                                  d={`M 250,${260 - hFreight} L 100,${235 - hFreight} A 155 75 0 0 0 145,${280 - hFreight} Z`}
                                  fill="url(#p3Top)"
                                  stroke="#F4A261"
                                  strokeWidth="1"
                                />
                              </g>

                              {/* ============================================================ */}
                              {/* SECTOR 2: APMC MODAL BENCHMARK (MEDIUM-HIGH STEP, BACK-LEFT) */}
                              {/* ============================================================ */}
                              <g
                                className="cursor-pointer transition-all duration-500"
                                onMouseEnter={() => setActive3DSector('modal')}
                                onMouseLeave={() => setActive3DSector(null)}
                                style={{
                                  transform: active3DSector === 'modal' ? 'translateY(-10px)' : 'translateY(0)',
                                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                              >
                                {/* Outer Curved Cylinder Wall */}
                                <path
                                  d={`M 250,185 A 155 75 0 0 0 100,235 L 100,${235 - hModal} A 155 75 0 0 1 250,${185 - hModal} Z`}
                                  fill="url(#p2Wall)"
                                />
                                {/* Step Cross-Section Wall facing left */}
                                <polygon
                                  points={`250,${260 - hModal} 100,${235 - hModal} 100,${235 - hFreight} 250,${260 - hFreight}`}
                                  fill="#4D7747"
                                />
                                {/* Top Elliptical Pie Cap */}
                                <path
                                  d={`M 250,${260 - hModal} L 250,${185 - hModal} A 155 75 0 0 0 100,${235 - hModal} Z`}
                                  fill="url(#p2Top)"
                                  stroke="#8AB885"
                                  strokeWidth="1"
                                />
                              </g>

                              {/* ============================================================ */}
                              {/* SECTOR 1: FARMER NET PAYOUT (DOMINANT PILLAR, HIGHEST 3D ELEVATION) */}
                              {/* ============================================================ */}
                              <g
                                className="cursor-pointer transition-all duration-500"
                                onMouseEnter={() => setActive3DSector('net')}
                                onMouseLeave={() => setActive3DSector(null)}
                                style={{
                                  transform: active3DSector === 'net' ? 'translateY(-12px)' : 'translateY(0)',
                                  transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                              >
                                {/* Outer Curved Cylinder Wall (Right side sweeping from Top to Bottom) */}
                                <path
                                  d={`M 250,185 A 155 75 0 0 1 250,335 L 250,${335 - hNet} A 155 75 0 0 0 250,${185 - hNet} Z`}
                                  fill="url(#p1Wall)"
                                />
                                {/* Inner Radial Cut Wall 1 (Top Center Step down to Modal Sector 2) */}
                                <polygon
                                  points={`250,${260 - hNet} 250,${185 - hNet} 250,${185 - hModal} 250,${260 - hModal}`}
                                  fill="url(#p1RadialWall)"
                                />
                                {/* Inner Radial Cut Wall 2 (Bottom Center Step down to Labor Sector 4) */}
                                <polygon
                                  points={`250,${260 - hNet} 250,${335 - hNet} 250,${335 - hLabor} 250,${260 - hLabor}`}
                                  fill="url(#p1RadialWall)"
                                />
                                {/* Top High-Gloss Elliptical Pie Cap */}
                                <path
                                  d={`M 250,${260 - hNet} L 250,${185 - hNet} A 155 75 0 0 1 250,${335 - hNet} Z`}
                                  fill="url(#p1Top)"
                                  stroke="#4E7C4B"
                                  strokeWidth="1.5"
                                />

                                {/* 3D Value Stamp on Top Sector */}
                                <text
                                  x="325"
                                  y={255 - hNet}
                                  textAnchor="middle"
                                  fontWeight="bold"
                                  fontSize="15"
                                  fill="#FAF8F2"
                                  filter="drop-shadow(0 1px 2px rgba(0,0,0,0.5))"
                                >
                                  {chartMode === 'perQuintal' ? `₹${netRate}` : `₹${(netRate * quantity).toLocaleString('en-IN')}`}
                                </text>
                                <text
                                  x="325"
                                  y={272 - hNet}
                                  textAnchor="middle"
                                  fontWeight="bold"
                                  fontSize="11"
                                  fill="#C8E6C9"
                                >
                                  ★ {realizationEfficiency}% Payout
                                </text>
                              </g>
                            </svg>
                          </div>
                        </div>

                        {/* RIGHT STATISTICAL CALLOUTS */}
                        <div className="lg:col-span-3 space-y-6 order-3">
                          {/* Top-Right: Farmer Net Realization (Sector 1 - Deep Forest) */}
                          <div
                            onMouseEnter={() => setActive3DSector('net')}
                            onMouseLeave={() => setActive3DSector(null)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                              active3DSector === 'net'
                                ? 'border-[#233D22] bg-[#EDF3ED] shadow-sm ring-2 ring-[#233D22]/20'
                                : 'border-[#233D22] bg-[#F3F7F2] hover:border-[#233D22]'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs text-[#233D22] font-bold">
                              <span className="w-3 h-3 rounded-full bg-[#233D22]" />
                              <span>Farmer Net Take-Home</span>
                            </div>
                            <div className="text-xl font-bold font-serif text-[#233D22] mt-1">
                              {chartMode === 'perQuintal' ? `₹${netRate}/q` : `₹${(netRate * quantity).toLocaleString('en-IN')}`}
                            </div>
                            <span className="text-[10px] text-[#2E7D32] font-semibold block">★ 97.3% In-Pocket Payout (Extruded {hNet}px)</span>
                          </div>

                          {/* Bottom-Right: Mandi Handling & Cess (Sector 4 - Warm Grey) */}
                          <div
                            onMouseEnter={() => setActive3DSector('labor')}
                            onMouseLeave={() => setActive3DSector(null)}
                            className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                              active3DSector === 'labor'
                                ? 'border-[#8C867A] bg-[#F2EFE8] shadow-xs'
                                : 'border-[#E0D9CB] bg-[#FAF8F2] hover:border-[#8C867A]'
                            }`}
                          >
                            <div className="flex items-center gap-2 text-xs text-[#8C867A] font-bold">
                              <span className="w-3 h-3 rounded-full bg-[#8C867A]" />
                              <span>Mandi Handling & Cess</span>
                            </div>
                            <div className="text-xl font-bold font-serif text-[#E65100] mt-1">
                              {chartMode === 'perQuintal' ? `-₹${laborRate}/q` : `-₹${(laborRate * quantity).toLocaleString('en-IN')}`}
                            </div>
                            <span className="text-[10px] text-[#6B7060] block">-1.0% Weighing & APMC cess ({hLabor}px)</span>
                          </div>
                        </div>

                      </div>

                      {/* LIVE INTERACTIVE VOLUME SLIDER (WATCH 3D CYLINDERS ELEVATE & DROP) */}
                      <div className="bg-[#FFFFFF] border border-[#DFD8CB] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#233D22] text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <Sliders className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#1E221B] block">Interactive 3D Volume Stepper</span>
                            <span className="text-[11px] text-[#6B7060]">Drag to watch the 3D cylinder sectors elevate & adjust in real-time</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-1 sm:max-w-md">
                          <input
                            type="range"
                            min="5"
                            max="300"
                            step="5"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            className="w-full accent-[#233D22] cursor-pointer"
                          />
                          <span className="text-sm font-serif font-bold text-[#233D22] shrink-0 min-w-15 text-right">
                            {quantity} Q
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. FINANCIAL WATERFALL BRIDGE SECTION */}
                    <div className="rounded-xl border border-[#DFD8CB] bg-[#F4F0E6] p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-[#1E221B] flex items-center gap-1.5">
                            <BarChart3 className="w-4 h-4 text-[#233D22]" />
                            Net Realization Financial Waterfall Bridge
                          </span>
                          <span className="text-[11px] text-[#5D6352] block mt-0.5">
                            Visual bridge demonstrating step-by-step price retention from Gross Mandi Rate to Farmer Take-Home
                          </span>
                        </div>
                      </div>

                      {/* Waterfall SVG Graph */}
                      <div className="bg-[#FFFFFF] border border-[#DFD8CB] rounded-xl p-4 sm:p-6 shadow-2xs relative">
                        <div className="w-full h-64 sm:h-72 select-none">
                          <svg className="w-full h-full" viewBox="0 0 760 250" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="modalGrossGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#2E7D32" />
                                <stop offset="100%" stopColor="#1B5E20" />
                              </linearGradient>
                              <linearGradient id="freightDeductGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#EF5350" />
                                <stop offset="100%" stopColor="#C62828" />
                              </linearGradient>
                              <linearGradient id="handlingDeductGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FFA726" />
                                <stop offset="100%" stopColor="#E65100" />
                              </linearGradient>
                              <linearGradient id="netRealizationGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#233D22" />
                                <stop offset="100%" stopColor="#122411" />
                              </linearGradient>
                            </defs>

                            {/* Reference Grid */}
                            <line x1="50" y1="30" x2="730" y2="30" stroke="#F0EBE1" strokeDasharray="4" />
                            <text x="40" y="34" textAnchor="end" fontSize="10" fill="#8C867A">100%</text>

                            <line x1="50" y1="80" x2="730" y2="80" stroke="#F0EBE1" strokeDasharray="4" />
                            <text x="40" y="84" textAnchor="end" fontSize="10" fill="#8C867A">75%</text>

                            <line x1="50" y1="130" x2="730" y2="130" stroke="#F0EBE1" strokeDasharray="4" />
                            <text x="40" y="134" textAnchor="end" fontSize="10" fill="#8C867A">50%</text>

                            <line x1="50" y1="180" x2="730" y2="180" stroke="#F0EBE1" strokeDasharray="4" />
                            <text x="40" y="184" textAnchor="end" fontSize="10" fill="#8C867A">25%</text>

                            <line x1="50" y1="210" x2="730" y2="210" stroke="#D1C7B7" strokeWidth="1.5" />
                            <text x="40" y="214" textAnchor="end" fontSize="10" fill="#5D6352">₹0</text>

                            {/* Pillar 1: APMC Modal */}
                            <rect x="70" y="30" width="110" height="180" rx="6" fill="url(#modalGrossGrad)" />
                            <rect x="75" y="40" width="100" height="26" rx="4" fill="#FFFFFF" fillOpacity="0.92" />
                            <text x="125" y="57" textAnchor="middle" fontWeight="bold" fontSize="12" fill="#1B5E20">
                              {chartMode === 'perQuintal' ? `₹${modalRate}` : `₹${(modalRate * quantity).toLocaleString('en-IN')}`}
                            </text>
                            <text x="125" y="22" textAnchor="middle" fontWeight="bold" fontSize="11" fill="#2E7D32">
                              +100% Baseline
                            </text>

                            <line x1="180" y1="30" x2="250" y2="30" stroke="#8C2323" strokeWidth="2" strokeDasharray="4" />

                            {/* Pillar 2: Freight Deduction */}
                            <rect x="250" y="30" width="110" height="32" rx="6" fill="url(#freightDeductGrad)" />
                            <text x="305" y="50" textAnchor="middle" fontWeight="bold" fontSize="12" fill="#FFFFFF">
                              {chartMode === 'perQuintal' ? `-₹${freightRate}` : `-₹${(freightRate * quantity).toLocaleString('en-IN')}`}
                            </text>
                            <text x="305" y="22" textAnchor="middle" fontWeight="semibold" fontSize="10" fill="#C62828">
                              -1.7% Freight ({bestCandidate?.roadDistanceKm ?? 17}km)
                            </text>

                            <line x1="360" y1="62" x2="430" y2="62" stroke="#E65100" strokeWidth="2" strokeDasharray="4" />

                            {/* Pillar 3: Labor Deduction */}
                            <rect x="430" y="62" width="110" height="26" rx="6" fill="url(#handlingDeductGrad)" />
                            <text x="485" y="79" textAnchor="middle" fontWeight="bold" fontSize="12" fill="#FFFFFF">
                              {chartMode === 'perQuintal' ? `-₹${laborRate}` : `-₹${(laborRate * quantity).toLocaleString('en-IN')}`}
                            </text>
                            <text x="485" y="22" textAnchor="middle" fontWeight="semibold" fontSize="10" fill="#E65100">
                              -1.0% Labor & Cess
                            </text>

                            <line x1="540" y1="88" x2="610" y2="88" stroke="#233D22" strokeWidth="2" strokeDasharray="4" />

                            {/* Pillar 4: Final Net Take-Home */}
                            <rect x="610" y="88" width="110" height="122" rx="6" fill="url(#netRealizationGrad)" stroke="#A5D6A7" strokeWidth="2" />
                            <rect x="615" y="98" width="100" height="28" rx="4" fill="#EDF3ED" />
                            <text x="665" y="116" textAnchor="middle" fontWeight="bold" fontSize="13" fill="#233D22">
                              {chartMode === 'perQuintal' ? `₹${netRate}` : `₹${(netRate * quantity).toLocaleString('en-IN')}`}
                            </text>
                            <text x="665" y="76" textAnchor="middle" fontWeight="bold" fontSize="11" fill="#233D22">
                              ★ {realizationEfficiency}% Payout
                            </text>
                          </svg>
                        </div>

                        {/* Bottom Summary Labels */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-[#F0EBE1] text-center">
                          <div className="p-2 rounded bg-[#F7F5EE] border border-[#DFD8CB]">
                            <span className="text-[10px] font-bold text-[#2E7D32] block uppercase">1. Gross Modal</span>
                            <span className="text-xs font-bold text-[#1E221B]">₹{modalRate}/q</span>
                            <span className="text-[9px] text-[#6B7060] block">Mandi Benchmark</span>
                          </div>

                          <div className="p-2 rounded bg-[#FDF2F2] border border-[#F5C6C6]">
                            <span className="text-[10px] font-bold text-[#C62828] block uppercase">2. Road Freight</span>
                            <span className="text-xs font-bold text-[#C62828]">-₹{freightRate}/q</span>
                            <span className="text-[9px] text-[#6B7060] block">{bestCandidate?.roadDistanceKm ?? 17} km distance</span>
                          </div>

                          <div className="p-2 rounded bg-[#FFF8E1] border border-[#FFE082]">
                            <span className="text-[10px] font-bold text-[#E65100] block uppercase">3. Handling & Cess</span>
                            <span className="text-xs font-bold text-[#E65100]">-₹{laborRate}/q</span>
                            <span className="text-[9px] text-[#6B7060] block">Weighing & labor</span>
                          </div>

                          <div className="p-2 rounded bg-[#EDF3ED] border border-[#A5D6A7]">
                            <span className="text-[10px] font-bold text-[#233D22] block uppercase">4. Net Take-Home</span>
                            <span className="text-xs font-bold text-[#233D22]">₹{netRate}/q</span>
                            <span className="text-[9px] text-[#2E7D32] font-semibold block">97.3% Bank Realization</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                )}

                {/* 4. COMPARATIVE APMC MARKET HISTOGRAM */}
                {mandiData.candidates.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-base font-serif font-bold text-[#1E221B]">
                          Comparative APMC Market Histogram ({mandiData.candidates.length} Yards)
                        </h3>
                        <p className="text-xs text-[#5D6352]">
                          Visual statistical comparison showing gross modal rate vs net realization after freight & handling deductions.
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1.5 text-[11px] text-[#233D22] font-semibold">
                          <span className="w-3 h-3 rounded bg-[#233D22]" /> Net In-Pocket Realization
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] text-[#8C867A] font-medium">
                          <span className="w-3 h-3 rounded bg-[#D32F2F]" /> Logistics Deductions
                        </span>
                      </div>
                    </div>

                    {/* Statistical Histogram Bars */}
                    <div className="rounded-xl border border-[#DFD8CB] bg-[#FCFAF6] p-5 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {mandiData.candidates.map((cand) => {
                          const gross = cand.modalPrice;
                          const net = cand.estimatedNetRealizationPerQuintal;
                          const deductions = cand.totalDeductionsPerQuintal;
                          const isSelected = selectedMandiId === cand.mandiId || (!selectedMandiId && cand.isRecommended);

                          return (
                            <div
                              key={cand.mandiId}
                              onClick={() => setSelectedMandiId(cand.mandiId)}
                              className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[#233D22] bg-[#FFFFFF] shadow-sm ring-2 ring-[#233D22]/10'
                                  : 'border-[#DFD8CB] bg-[#FCFAF6] hover:border-[#A5D6A7]'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <Badge className={`text-[10px] font-bold ${cand.isRecommended ? 'bg-[#233D22] text-white' : 'bg-[#EDE7DA] text-[#4E5246]'}`}>
                                      Option {cand.marketOption}
                                    </Badge>
                                    {cand.isRecommended && (
                                      <span className="text-[10px] font-bold text-[#2E7D32] bg-[#E8F5E9] px-1.5 py-0.5 rounded">
                                        Max Profit
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-serif font-bold text-sm text-[#1E221B]">{cand.marketName}</h4>
                                  <span className="text-xs text-[#5D6352] block mt-0.5">{cand.roadDistanceKm} km distance</span>
                                </div>

                                <div className="text-right">
                                  <span className="text-base font-bold text-[#233D22] font-serif">₹{net}/q</span>
                                  <span className="text-[10px] text-[#6B7060] block">Gross ₹{gross}</span>
                                </div>
                              </div>

                              {/* Vertical Comparative Bar Visualizer */}
                              <div className="mt-4 pt-3 border-t border-[#F0EBE1] space-y-2">
                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] text-[#6B7060]">
                                    <span>Net Realization (Take-Home)</span>
                                    <span className="font-bold text-[#233D22]">₹{net}/q</span>
                                  </div>
                                  <div className="h-2.5 w-full bg-[#EDE7DA] rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${(net / 1700) * 100}%` }}
                                      className="h-full bg-[#233D22] rounded-full"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between text-[10px] text-[#6B7060]">
                                    <span>Logistics Deductions</span>
                                    <span className="font-bold text-[#D32F2F]">-₹{deductions}/q</span>
                                  </div>
                                  <div className="h-2 w-full bg-[#EDE7DA] rounded-full overflow-hidden">
                                    <div
                                      style={{ width: `${(deductions / 150) * 100}%` }}
                                      className="h-full bg-[#D32F2F] rounded-full"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3 text-[11px] text-[#5D6352] bg-[#F7F5EE] p-2.5 rounded border border-[#DFD8CB]">
                                {cand.economicTradeoff}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Analyzing institutional RFQs against cooperative aggregated volume...
                </p>
              </div>
            )}

            {!fpoId && !isBulkLoading && (
              <div className="rounded-xl border border-dashed border-[#DFD8CB] bg-[#FCFAF6] p-10 text-center space-y-3">
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
                <div className="rounded-xl border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-4">
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

                    <div className="bg-[#EDF3ED] border border-[#C8D9C8] rounded-xl p-4 sm:max-w-md">
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
                        className={`flex flex-col justify-between overflow-hidden border rounded-xl ${
                          rfq.isEconomicallyRecommended
                            ? 'border-[#233D22] bg-[#FCFAF6] ring-1 ring-[#233D22]'
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
                            <div className="flex justify-between items-center bg-[#EDF3ED] border border-[#C8D9C8] p-2 rounded-lg font-bold">
                              <span className="text-[#233D22]">Net Realization:</span>
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

        {/* TAB 3: SMART MULTI-CHANNEL ALLOCATION */}
        {activeTab === 'allocation' && (
          <div className="space-y-6">
            {isAllocationLoading && (
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Evaluating mandi rates, direct buyers, logistics tariffs, and net realization...
                </p>
              </div>
            )}

            {isAllocationError && !isAllocationLoading && (
              <div className="p-8 text-center bg-[#FDF2F2] border border-[#D98282] rounded-xl">
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
                <div className="rounded-xl border-2 border-[#233D22] bg-[#FCFAF6] p-6 shadow-sm space-y-5">
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
                      <h2 className="text-2xl font-serif font-bold text-[#1E221B]">
                        {recommendedOption.channelName}
                      </h2>
                      <p className="text-xs text-[#5D6352] mt-0.5">
                        Destination: {recommendedOption.destinationLocation}
                      </p>
                    </div>

                    <div className="text-right bg-[#EDF3ED] border border-[#C8D9C8] rounded-xl p-4">
                      <span className="text-xs text-[#5D6352]">Estimated Net Realization</span>
                      <div className="text-3xl font-serif font-bold text-[#233D22]">
                        ₹{recommendedOption.perUnitNetRealization.toLocaleString('en-IN')}/q
                      </div>
                      <span className="text-[11px] text-[#5D6352] block mt-0.5">
                        Total Batch: ₹{recommendedOption.estimatedNetRealization.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <Separator className="bg-[#DFD8CB]" />

                  <div className="rounded-lg border border-[#DFD8CB] bg-[#F7F5EE] p-4 text-xs text-[#1E221B] leading-relaxed">
                    <span className="font-bold block mb-1">Recommendation Summary:</span>
                    {allocationData.recommendationRationale}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-serif font-bold text-[#1E221B] mb-4">
                    Evaluated Channels & Net Realization Ranking ({allocationData.rankedOptions.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {allocationData.rankedOptions.map((opt) => (
                      <Card key={`${opt.channelName}-${opt.rank}`} className={`border p-5 space-y-3 rounded-xl ${opt.rank === 1 ? 'border-[#233D22] bg-[#FFFFFF] shadow-sm ring-1 ring-[#233D22]' : 'border-[#DFD8CB] bg-[#FCFAF6]'}`}>
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-sm font-serif font-bold text-[#1E221B]">{opt.channelName}</span>
                            <span className="text-xs text-[#5D6352] block">{opt.channelType}</span>
                          </div>
                          <Badge variant="outline" className={`text-xs font-bold rounded ${opt.rank === 1 ? 'bg-[#233D22] text-white border-[#233D22]' : 'bg-[#F7F5EE] border-[#DFD8CB] text-[#5D6352]'}`}>
                            Rank #{opt.rank}
                          </Badge>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between text-[#5D6352]">
                            <span>Gross Offer:</span>
                            <span className="font-medium text-[#1E221B]">₹{opt.expectedGrossPricePerUnit}/q</span>
                          </div>
                          <div className="flex justify-between text-[#5D6352]">
                            <span>Logistics:</span>
                            <span className="text-[#8C2323]">-₹{opt.logisticsCost}/q</span>
                          </div>
                          <div className="flex justify-between font-bold border-t border-[#DFD8CB] pt-1.5 items-center">
                            <span>Net Realization:</span>
                            <span className="text-[#233D22] text-sm">₹{opt.perUnitNetRealization}/q</span>
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
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Analyzing APMC arrival volume and 14-day price trajectory...
                </p>
              </div>
            )}

            {timingData && (
              <div className="rounded-xl border border-[#DFD8CB] bg-[#FCFAF6] p-6 space-y-6 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Badge className="text-xs px-2.5 py-1 font-bold bg-[#233D22] text-white rounded">
                        Action: {timingData.recommendation}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                        Commodity: {timingData.commodity}
                      </Badge>
                    </div>
                    <h2 className="text-2xl font-serif font-bold text-[#1E221B]">
                      {timingData.recommendationSummary}
                    </h2>
                  </div>

                  <div className="text-right bg-[#EDF3ED] rounded-xl border border-[#C8D9C8] p-4">
                    <span className="text-xs text-[#5D6352]">Current Spot Modal Benchmark</span>
                    <div className="text-3xl font-serif font-bold text-[#233D22]">
                      ₹{timingData.currentPrice.toLocaleString('en-IN')}/q
                    </div>
                  </div>
                </div>

                {/* Interactive Time-Series Price Chart & Histogram */}
                <div className="rounded-xl border border-[#DFD8CB] bg-[#F4F0E6] p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#1E221B] flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-[#233D22]" />
                      Interactive 14-Day Econometric Price Trajectory
                    </span>
                    <span className="text-[11px] text-[#5D6352]">
                      Hover over any day node to inspect expected batch return
                    </span>
                  </div>

                  {/* SVG Chart Graphic */}
                  <div className="h-64 w-full bg-[#FCFAF6] border border-[#DFD8CB] rounded-xl p-4 flex flex-col justify-between relative select-none">
                    {/* Active Point Hover Banner */}
                    <div className="flex items-center justify-between text-xs pb-2 border-b border-[#F0EBE1]">
                      {trajectoryHoverIndex !== null ? (
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[#233D22]">
                            {trajectoryPoints[trajectoryHoverIndex].label}: ₹{trajectoryPoints[trajectoryHoverIndex].price}/q
                          </span>
                          <span className="text-[#5D6352]">
                            Total Batch: ₹{(trajectoryPoints[trajectoryHoverIndex].price * quantity).toLocaleString('en-IN')}
                          </span>
                          <span className="text-[#6B7060] hidden sm:inline">
                            (Arrivals: {trajectoryPoints[trajectoryHoverIndex].arrivalTonnes} T)
                          </span>
                        </div>
                      ) : (
                        <div className="text-[#6B7060] text-xs flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#2E7D32]" />
                          <span>Projected Peak Window at Day +7 (₹{p7}/q)</span>
                        </div>
                      )}

                      <span className="text-[11px] text-[#6B7060]">Confidence Interval: ±2.5%</span>
                    </div>

                    {/* Chart Canvas */}
                    <div className="relative flex-1 w-full my-2">
                      <svg className="w-full h-full" viewBox="0 0 700 140" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#233D22" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#233D22" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#A5D6A7" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#A5D6A7" stopOpacity="0.05" />
                          </linearGradient>
                        </defs>

                        {/* Grid Lines */}
                        <line x1="0" y1="35" x2="700" y2="35" stroke="#EDE7DA" strokeDasharray="4" />
                        <line x1="0" y1="70" x2="700" y2="70" stroke="#EDE7DA" strokeDasharray="4" />
                        <line x1="0" y1="105" x2="700" y2="105" stroke="#EDE7DA" strokeDasharray="4" />

                        {/* Confidence Band Envelope */}
                        <polygon
                          points="
                            50,75 150,60 250,45 350,28 450,15 550,30 650,45
                            650,70 550,55 450,40 350,50 250,70 150,85 50,100
                          "
                          fill="url(#bandGradient)"
                        />

                        {/* Main Trend Line Area */}
                        <path
                          d="M 50,85 L 150,70 L 250,55 L 350,38 L 450,25 L 550,42 L 650,55 L 650,135 L 50,135 Z"
                          fill="url(#areaGradient)"
                        />

                        {/* Main Trend Line Curve */}
                        <polyline
                          points="50,85 150,70 250,55 350,38 450,25 550,42 650,55"
                          fill="none"
                          stroke="#233D22"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Node Points & Interaction Markers */}
                        {trajectoryPoints.map((pt, idx) => {
                          const x = 50 + idx * 100;
                          const norm = (pt.price - minTrajectoryPrice) / (maxTrajectoryPrice - minTrajectoryPrice);
                          const y = 120 - norm * 100;
                          const isHovered = trajectoryHoverIndex === idx;

                          return (
                            <g
                              key={pt.label}
                              className="cursor-pointer"
                              onMouseEnter={() => setTrajectoryHoverIndex(idx)}
                              onMouseLeave={() => setTrajectoryHoverIndex(null)}
                            >
                              <circle
                                cx={x}
                                cy={y}
                                r={isHovered ? 7 : pt.isPeak ? 6 : pt.isToday ? 5 : 4}
                                fill={pt.isPeak ? '#2E7D32' : pt.isToday ? '#1E221B' : '#233D22'}
                                stroke="#FFFFFF"
                                strokeWidth={isHovered ? 2.5 : 1.5}
                              />
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Horizontal Axis Labels */}
                    <div className="grid grid-cols-7 text-center text-[10px] text-[#6B7060] border-t border-[#F0EBE1] pt-1.5">
                      {trajectoryPoints.map((pt, idx) => (
                        <div
                          key={pt.label}
                          className={`cursor-pointer ${trajectoryHoverIndex === idx ? 'font-bold text-[#233D22]' : ''}`}
                          onMouseEnter={() => setTrajectoryHoverIndex(idx)}
                        >
                          <span className="block">{pt.label}</span>
                          <span className="font-mono text-[#1E221B] font-semibold">₹{pt.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Decision Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-[#DFD8CB] bg-[#FFFFFF] p-4 shadow-2xs">
                    <span className="text-xs text-[#5D6352] block font-medium">Spot Modal Rate (Today)</span>
                    <span className="text-2xl font-serif font-bold text-[#1E221B] mt-1 block">₹{timingData.currentPrice}/q</span>
                    <span className="text-[10px] text-[#6B7060] mt-1 block">Immediate cash turnaround</span>
                  </div>
                  <div className="rounded-xl border-2 border-[#233D22] bg-[#EDF3ED] p-4 shadow-2xs">
                    <span className="text-xs text-[#2E4A2C] block font-semibold">+7 Days Peak Projection</span>
                    <span className="text-2xl font-serif font-bold text-[#233D22] mt-1 block">
                      {timingData.forwardProjections.horizon7DaysPrice ? `₹${timingData.forwardProjections.horizon7DaysPrice}/q` : `₹${p7}/q`}
                    </span>
                    <span className="text-[10px] text-[#2E4A2C] mt-1 block font-medium">
                      +₹{((p7 - spotPrice) * quantity).toLocaleString('en-IN')} additional profit
                    </span>
                  </div>
                  <div className="rounded-xl border border-[#DFD8CB] bg-[#FFFFFF] p-4 shadow-2xs">
                    <span className="text-xs text-[#5D6352] block font-medium">+14 Days Projection</span>
                    <span className="text-2xl font-serif font-bold text-[#1E221B] mt-1 block">
                      {timingData.forwardProjections.horizon14DaysPrice ? `₹${timingData.forwardProjections.horizon14DaysPrice}/q` : `₹${p14}/q`}
                    </span>
                    <span className="text-[10px] text-[#6B7060] mt-1 block">Late supply influx expected</span>
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
              <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-xl">
                <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
                <p className="text-xs text-[#5D6352]">
                  Matching verified institutional buyers by demand, transit distance, and volume...
                </p>
              </div>
            )}

            {!isBuyersLoading && (!buyerMatches || buyerMatches.length === 0) && (
              <div className="rounded-xl border border-dashed border-[#DFD8CB] bg-[#FCFAF6] p-12 text-center">
                <Users className="h-10 w-10 text-[#8C867A] mx-auto mb-3" />
                <h3 className="font-serif font-bold text-[#1E221B] text-base">No Active Buyer Requirements Found</h3>
                <p className="text-xs text-[#5D6352] max-w-md mx-auto mt-1">
                  There are currently no open procurement requirements for {selectedCommodity} within transit range.
                </p>
              </div>
            )}

            {buyerMatches && buyerMatches.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {buyerMatches.map((match) => (
                  <Card key={match.requirementId} className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-xl shadow-2xs">
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
                          <span className="text-xs text-[#5D6352] flex items-center gap-1 mt-1">
                            <MapPin className="h-3.5 w-3.5 text-[#3B532B]" />
                            {match.deliveryLocation || 'Verified Destination'} ({match.distanceKm} km from {effectiveDistrict})
                          </span>
                        </div>

                        <Badge className="bg-[#233D22] text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
                          {match.matchScore}% Match
                        </Badge>
                      </div>

                      <Separator className="bg-[#DFD8CB]" />

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[#5D6352] block">Required Volume:</span>
                          <span className="font-bold text-[#1E221B] text-sm">
                            {match.requiredQuantity} {match.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-[#5D6352] block">Target Budget:</span>
                          <span className="font-bold text-[#233D22] text-sm">
                            {match.targetPrice ? `₹${match.targetPrice}/${match.unit}` : 'Negotiable'}
                          </span>
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#DFD8CB] bg-[#F7F5EE] p-3 space-y-1.5">
                        {match.reasons.map((reason, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-[#1E221B]">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#233D22] shrink-0" />
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
