'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFpoBuyRequests,
  postFpoBuyRequest,
  fetchMyOrganization,
  FpoBuyRequest,
} from '@/lib/api/fpo';
import {
  getFpoBulkIntelligence,
  FpoBulkIntelligenceResult,
} from '@/lib/api';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2,
  ShoppingCart,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Package,
  Scale,
  Check,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

const BULK_COMMODITIES = [
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

export default function FpoBuyRequestsPage() {
  const queryClient = useQueryClient();
  const { user, token, isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<'compare' | 'browse'>('compare');
  const [bulkCommodity, setBulkCommodity] = useState<string>('Tomato');

  const [commodity, setCommodity] = useState('Tomato');
  const [requiredQuantity, setRequiredQuantity] = useState<number>(500);
  const [targetPrice, setTargetPrice] = useState<number>(1900);
  const [deliveryCity, setDeliveryCity] = useState('Pune');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(250);
  const [qualityRequirements, setQualityRequirements] = useState('Firm, Grade A table variety');
  const [notes, setNotes] = useState('Institutional delivery needed for processing factory');

  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1. Fetch user's FPO organization
  const { data: myFpo } = useQuery({
    queryKey: ['my-fpo-org', token],
    queryFn: () => fetchMyOrganization(token || undefined),
    enabled: !!token,
  });

  const fpoId = myFpo?.id;

  // 2. Query Module B: FPO Bulk Buyer Intelligence
  const {
    data: bulkIntelligence,
    isLoading: isBulkLoading,
  } = useQuery<FpoBulkIntelligenceResult>({
    queryKey: ['fpo-bulk-intelligence', fpoId, bulkCommodity, token],
    queryFn: () => getFpoBulkIntelligence(fpoId!, bulkCommodity, token || undefined),
    enabled: !!fpoId,
    staleTime: 60000,
  });

  // 3. Query all platform buy requests
  const { data: rawRequests = [], isLoading } = useQuery({
    queryKey: ['fpo-buy-requests'],
    queryFn: () => fetchFpoBuyRequests(),
  });
  const requests: FpoBuyRequest[] = Array.isArray(rawRequests)
    ? rawRequests
    : Array.isArray((rawRequests as any)?.data)
    ? (rawRequests as any).data
    : [];

  const postMutation = useMutation({
    mutationFn: () => {
      if (!commodity.trim()) throw new Error('Commodity name is required');
      if (requiredQuantity <= 0) throw new Error('Quantity must be greater than zero');

      return postFpoBuyRequest(
        {
          commodity: commodity.trim(),
          requiredQuantity,
          targetPrice: targetPrice || undefined,
          deliveryCity: deliveryCity.trim() || undefined,
          maxDistanceKm: maxDistanceKm || undefined,
          qualityRequirements: qualityRequirements.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        token || undefined,
      );
    },
    onSuccess: () => {
      setFormSuccess(true);
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ['fpo-buy-requests'] });
      setTimeout(() => setFormSuccess(false), 5000);
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      setFormError('Please sign in as a Buyer or FPO to post procurement requirements.');
      return;
    }
    postMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 border-b border-[#DFD8CB] pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#233D22]/10 text-[#233D22] mb-2">
              <Scale className="h-3 w-3" />
              <span>Institutional RFQ Decision Center</span>
            </div>
            <h1 className="text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
              FPO Bulk Sourcing & Matching
            </h1>
            <p className="text-xs sm:text-sm text-[#5D6352] mt-1 max-w-2xl">
              Side-by-side economic evaluation of competing institutional purchase orders against FPO member aggregation capacity, freight deductions, and net farmgate realization.
            </p>
          </div>

          <div className="flex items-center gap-1.5 border border-[#DFD8CB] p-1 rounded-md bg-[#FCFAF6]">
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'compare'
                  ? 'bg-[#233D22] text-[#F7F5EE]'
                  : 'text-[#5D6352] hover:text-[#1E221B]'
              }`}
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Compare RFQs</span>
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                activeTab === 'browse'
                  ? 'bg-[#233D22] text-[#F7F5EE]'
                  : 'text-[#5D6352] hover:text-[#1E221B]'
              }`}
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Post & Browse Demands</span>
            </button>
          </div>
        </div>

        {/* VIEW 1: SIDE-BY-SIDE RFQ MARKET INTELLIGENCE */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            {/* Commodity Selector Bar */}
            <div className="rounded-md border border-[#DFD8CB] bg-[#FCFAF6] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5D6352] whitespace-nowrap mr-1">
                  Commodity:
                </span>
                {BULK_COMMODITIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setBulkCommodity(c)}
                    className={`px-3 py-1 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
                      bulkCommodity === c
                        ? 'bg-[#233D22] text-[#F7F5EE]'
                        : 'bg-[#F4F0E6] text-[#5D6352] hover:text-[#1E221B] border border-[#DFD8CB]/60'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {bulkIntelligence && (
                <div className="flex items-center gap-2 text-xs text-[#5D6352] shrink-0 border-l border-[#DFD8CB] pl-4">
                  <Building2 className="h-3.5 w-3.5 text-[#233D22]" />
                  <span>
                    FPO: <strong className="text-[#1E221B]">{bulkIntelligence.fpo.name}</strong> ({bulkIntelligence.fpo.district})
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F4F0E6] text-[#233D22] border border-[#DFD8CB]">
                    Cap: {bulkIntelligence.fpoCapacityQuintals} Q
                  </span>
                </div>
              )}
            </div>

            {isBulkLoading && (
              <div className="rounded-md border border-[#DFD8CB] bg-[#FCFAF6] p-10 text-center">
                <div className="inline-block h-6 w-6 border-2 border-[#233D22] border-t-transparent rounded-full animate-spin mb-3" />
                <p className="text-xs font-semibold text-[#1E221B]">
                  Evaluating competing {bulkCommodity} RFQs across logistics tariffs and FPO capacity...
                </p>
              </div>
            )}

            {!fpoId && !isBulkLoading && (
              <div className="rounded-md border border-dashed border-[#DFD8CB] bg-[#FCFAF6] p-8 text-center space-y-2">
                <Building2 className="h-7 w-7 text-[#233D22] mx-auto" />
                <h3 className="text-sm font-bold text-[#1E221B]">FPO Collective Authorization Required</h3>
                <p className="text-xs text-[#5D6352] max-w-md mx-auto leading-relaxed">
                  Bulk Buyer Intelligence requires an authorized FPO organization context to evaluate capacity against institutional buyer contracts.
                </p>
              </div>
            )}

            {bulkIntelligence && (
              <>
                {/* Decision Advisory Summary Box */}
                <div
                  className={`rounded-md border p-4 space-y-2 ${
                    bulkIntelligence.recommendedRfq
                      ? 'border-[#233D22]/30 bg-[#233D22]/5'
                      : 'border-[#BD8728]/40 bg-[#BD8728]/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded text-[#F7F5EE] uppercase tracking-wider ${
                        bulkIntelligence.recommendedRfq ? 'bg-[#233D22]' : 'bg-[#BD8728]'
                      }`}
                    >
                      {bulkIntelligence.recommendedRfq
                        ? 'Market Intelligence Recommendation'
                        : 'Capacity Constraint Advisory'}
                    </span>
                    <span className="text-xs text-[#5D6352]">
                      Direct trade evaluation for {bulkIntelligence.commodity}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium text-[#1E221B] leading-relaxed">
                    {bulkIntelligence.sideBySideComparisonSummary}
                  </p>
                </div>

                {/* 4 Competing RFQ Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {bulkIntelligence.rfqs.map((rfq) => (
                    <div
                      key={rfq.rfqId}
                      className={`flex flex-col justify-between rounded-md border transition-colors bg-[#FCFAF6] ${
                        rfq.isEconomicallyRecommended
                          ? 'border-[#233D22]'
                          : 'border-[#DFD8CB]'
                      }`}
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1">
                              <span
                                className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                  rfq.isEconomicallyRecommended
                                    ? 'bg-[#233D22] text-[#F7F5EE]'
                                    : 'bg-[#F4F0E6] text-[#5D6352] border border-[#DFD8CB]'
                                }`}
                              >
                                Scenario {rfq.scenario}
                              </span>
                              {rfq.isEconomicallyRecommended && (
                                <span className="text-[10px] font-bold text-[#233D22] flex items-center gap-0.5">
                                  <Check className="h-3 w-3" /> Optimum
                                </span>
                              )}
                            </div>
                            <h4 className="font-serif font-bold text-[#1E221B] text-sm leading-snug">
                              {rfq.buyerName}
                            </h4>
                            <span className="text-[11px] text-[#5D6352] block">
                              {rfq.buyerType}
                            </span>
                          </div>

                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                              rfq.capacityStatus === 'FULLY_FULFILLABLE'
                                ? 'border-[#233D22]/30 bg-[#233D22]/10 text-[#233D22]'
                                : rfq.capacityStatus === 'PARTIALLY_FULFILLABLE'
                                ? 'border-[#BD8728]/30 bg-[#BD8728]/10 text-[#BD8728]'
                                : 'border-[#9A3412]/30 bg-[#9A3412]/10 text-[#9A3412]'
                            }`}
                          >
                            {rfq.capacityStatus === 'FULLY_FULFILLABLE'
                              ? 'Feasible'
                              : rfq.capacityStatus === 'PARTIALLY_FULFILLABLE'
                              ? 'Partial'
                              : 'Constrained'}
                          </span>
                        </div>

                        <div className="border-t border-[#DFD8CB] pt-2 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[#5D6352]">Volume:</span>
                            <span className="font-bold text-[#1E221B]">{rfq.requiredQuantity} Q</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5D6352]">Target Price:</span>
                            <span className="font-bold text-[#1E221B]">₹{rfq.targetPriceInrPerQuintal}/q</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5D6352]">Destination:</span>
                            <span className="text-[#1E221B] font-medium">{rfq.deliveryCity} ({rfq.roadDistanceKm} km)</span>
                          </div>
                          <div className="flex justify-between text-[#9A3412]">
                            <span>Freight / Deductions:</span>
                            <span className="font-medium">-₹{rfq.estimatedLogisticsCostPerQuintal}/q</span>
                          </div>
                          <div className="flex justify-between items-center bg-[#F4F0E6] p-2 rounded border border-[#DFD8CB]">
                            <span className="font-semibold text-[#1E221B]">Net Realization:</span>
                            <span className="text-[#233D22] text-sm font-bold">
                              ₹{rfq.estimatedNetPerQuintal}/q
                            </span>
                          </div>
                        </div>

                        <div className="rounded border border-[#DFD8CB] bg-[#F4F0E6]/50 p-2 text-xs">
                          <span className="font-bold text-[#1E221B] block mb-0.5 text-[10px] uppercase tracking-wider">
                            Economic Assessment:
                          </span>
                          <p className="text-[#5D6352] text-[11px] leading-relaxed">
                            {rfq.tradeoffExplanation}
                          </p>
                        </div>
                      </div>

                      <div className="p-3 bg-[#F4F0E6] border-t border-[#DFD8CB]">
                        <Button
                          size="sm"
                          className={`w-full text-xs font-semibold rounded ${
                            rfq.isEconomicallyRecommended
                              ? 'bg-[#233D22] text-[#F7F5EE] hover:bg-[#1E331D]'
                              : 'bg-transparent border border-[#DFD8CB] text-[#1E221B] hover:bg-[#EFE9DC]'
                          }`}
                        >
                          {rfq.capacityStatus === 'FULLY_FULFILLABLE' ? 'Accept RFQ Contract' : 'Review Lot Allocation'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* VIEW 2: POST & BROWSE ALL DEMANDS */}
        {activeTab === 'browse' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-4">
              {/* Sourcing Form */}
              <div className="lg:col-span-2">
                <div className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-md p-5 space-y-4">
                  <div className="border-b border-[#DFD8CB] pb-3">
                    <h2 className="text-base font-serif font-bold text-[#1E221B] flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-[#233D22]" />
                      <span>Post Sourcing Requirement</span>
                    </h2>
                    <p className="text-xs text-[#5D6352] mt-0.5">
                      Specify required volume, target price ceiling, and delivery destination. Verified FPOs will bid lots meeting your specifications.
                    </p>
                  </div>

                  {formSuccess && (
                    <div className="p-3.5 rounded bg-[#233D22]/10 border border-[#233D22]/20 text-[#233D22] text-xs flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[#233D22]" />
                      <div>
                        <span className="font-bold block">Requirement Posted to Aroha Exchange</span>
                        <span className="text-[11px] text-[#5D6352]">
                          Your requirement is now open for direct matching with accredited FPO aggregation batches.
                        </span>
                      </div>
                    </div>
                  )}

                  {formError && (
                    <div className="p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 text-[#9A3412] text-xs rounded flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-[#1E221B]">Target Commodity</label>
                        <select
                          value={commodity}
                          onChange={(e) => setCommodity(e.target.value)}
                          className="w-full h-9 rounded border border-[#DFD8CB] bg-[#F7F5EE] px-3 text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                        >
                          {BULK_COMMODITIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-[#1E221B]">Required Volume (Quintals)</label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="e.g. 200"
                          value={requiredQuantity || ''}
                          onChange={(e) => setRequiredQuantity(Number(e.target.value))}
                          className="h-9 text-xs rounded border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-[#1E221B]">Target Ceiling Price (₹/Quintal)</label>
                        <Input
                          type="number"
                          min={0}
                          placeholder="e.g. 1850"
                          value={targetPrice || ''}
                          onChange={(e) => setTargetPrice(Number(e.target.value))}
                          className="h-9 text-xs rounded border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-[#1E221B]">Delivery Destination City</label>
                        <Input
                          placeholder="e.g. Mumbai, Pune, Delhi"
                          value={deliveryCity}
                          onChange={(e) => setDeliveryCity(e.target.value)}
                          className="h-9 text-xs rounded border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Quality & Moisture Specifications</label>
                      <Input
                        placeholder="e.g. Firm red, Grade A, moisture under 12%, uniform sizing"
                        value={qualityRequirements}
                        onChange={(e) => setQualityRequirements(e.target.value)}
                        className="h-9 text-xs rounded border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Contract Terms & Logistics Notes</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Prompt delivery required; payment settled via Aroha escrow upon weighbridge validation."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded border border-[#DFD8CB] bg-[#F7F5EE] p-2 text-xs text-[#1E221B] focus:outline-none focus:border-[#233D22]"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between border-t border-[#DFD8CB]">
                      <span className="text-[11px] text-[#5D6352]">
                        Regional FPOs with verified stock receive priority match notifications.
                      </span>
                      <Button
                        type="submit"
                        disabled={postMutation.isPending}
                        className="bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] font-semibold text-xs px-4 py-2 rounded"
                      >
                        {postMutation.isPending ? 'Publishing...' : 'Publish Procurement Order'}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Aggregation Advantage Card */}
              <div>
                <div className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-md p-4 space-y-3 text-xs">
                  <h3 className="font-serif font-bold text-sm text-[#1E221B] flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-[#233D22]" />
                    <span>Wholesale Aggregation Model</span>
                  </h3>

                  <div className="space-y-2.5 text-[#5D6352] leading-relaxed">
                    <div className="p-2.5 rounded bg-[#F4F0E6] border border-[#DFD8CB]">
                      <span className="font-bold text-[#1E221B] block mb-0.5">Farmgate Grade Integrity</span>
                      <span>Bypass multi-tier mandi degradation. Crops are aggregated directly from vetted farmer members under uniform assaying.</span>
                    </div>

                    <div className="p-2.5 rounded bg-[#F4F0E6] border border-[#DFD8CB]">
                      <span className="font-bold text-[#1E221B] block mb-0.5">Algorithmic Batch Matching</span>
                      <span>The platform matches your volume against sealed cooperative lots based on geography, price ceiling, and quantity.</span>
                    </div>

                    <div className="p-2.5 rounded bg-[#F4F0E6] border border-[#DFD8CB]">
                      <span className="font-bold text-[#1E221B] block mb-0.5">Escrow-Backed Fulfillment</span>
                      <span>Matched contracts automatically spawn platform Orders tracked end-to-end with milestone-based settlement release.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Open Buy Requests Table */}
            <div className="space-y-3">
              <h2 className="text-sm font-serif font-bold text-[#1E221B]">
                Active Platform Sourcing Demands ({requests.length})
              </h2>

              {isLoading ? (
                <div className="rounded-md border border-[#DFD8CB] bg-[#FCFAF6] p-8 text-center text-xs text-[#5D6352]">
                  Loading active sourcing requests...
                </div>
              ) : requests.length === 0 ? (
                <div className="p-8 text-center border border-[#DFD8CB] rounded-md bg-[#FCFAF6]">
                  <Package className="mx-auto h-8 w-8 text-[#5D6352]/40 mb-2" />
                  <p className="text-xs font-semibold text-[#1E221B]">No active procurement demands currently open</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-[#DFD8CB] bg-[#FCFAF6]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#DFD8CB] bg-[#F4F0E6] font-bold text-[#1E221B] uppercase text-[10px] tracking-wider">
                        <th className="p-3">Commodity</th>
                        <th className="p-3">Required Volume</th>
                        <th className="p-3">Filled Volume</th>
                        <th className="p-3">Target Price</th>
                        <th className="p-3">Destination</th>
                        <th className="p-3">Buyer</th>
                        <th className="p-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DFD8CB] text-[#5D6352]">
                      {Array.isArray(requests) && requests.map((req) => (
                        <tr key={req.id} className="hover:bg-[#F4F0E6]/60 transition-colors">
                          <td className="p-3 font-bold text-[#1E221B]">
                            {req.commodity}
                          </td>
                          <td className="p-3 font-semibold text-[#1E221B]">
                            {req.requiredQuantity} Q
                          </td>
                          <td className="p-3 text-[#233D22] font-semibold">
                            {req.filledQuantity} Q ({Math.round((req.filledQuantity / req.requiredQuantity) * 100)}%)
                          </td>
                          <td className="p-3 font-mono text-[#1E221B]">
                            {req.targetPrice ? `₹${req.targetPrice}/Q` : 'Negotiable'}
                          </td>
                          <td className="p-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-[#233D22]" />
                              <span>{req.deliveryCity || 'Any'}</span>
                            </span>
                          </td>
                          <td className="p-3 text-[11px] truncate max-w-[140px]">
                            {req.buyer?.buyerProfile?.businessName || req.buyer?.email || 'Institutional Buyer'}
                          </td>
                          <td className="p-3 text-right">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                req.status === 'FULLY_MATCHED'
                                  ? 'border-[#233D22]/30 bg-[#233D22]/10 text-[#233D22]'
                                  : req.status === 'PARTIALLY_MATCHED'
                                  ? 'border-[#BD8728]/30 bg-[#BD8728]/10 text-[#BD8728]'
                                  : 'border-[#DFD8CB] bg-[#F4F0E6] text-[#5D6352]'
                              }`}
                            >
                              {req.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
