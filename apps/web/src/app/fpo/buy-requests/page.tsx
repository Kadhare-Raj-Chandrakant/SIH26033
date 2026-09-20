'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFpoBuyRequests,
  postFpoBuyRequest,
  FpoBuyRequest,
} from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  ShoppingCart,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Package,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

export default function FpoBuyRequestsPage() {
  const queryClient = useQueryClient();
  const { user, token, isAuthenticated } = useAuth();

  const [commodity, setCommodity] = useState('Tomato');
  const [requiredQuantity, setRequiredQuantity] = useState<number>(500);
  const [targetPrice, setTargetPrice] = useState<number>(1900);
  const [deliveryCity, setDeliveryCity] = useState('Pune');
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(250);
  const [qualityRequirements, setQualityRequirements] = useState('Firm, Grade A table variety');
  const [notes, setNotes] = useState('Institutional delivery needed for processing factory');

  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Institutional Bulk Procurement</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            FPO Wholesale Procurement RFQ
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Publish bulk demand orders for accredited Farmer Producer Organisations. FPOs pool smallholder harvests into commercial lots and match directly with your contract terms.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Sourcing Form */}
          <div className="lg:col-span-2">
            <Card className="border-border/80 bg-card rounded-2xl shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                  <span>Post Sourcing Requirement</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Provide quantity, ceiling target price, and destination hub. FPOs will match sealed lots meeting your specifications.
                </CardDescription>
              </CardHeader>

              <CardContent>
                {formSuccess && (
                  <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div>
                      <span className="font-semibold block">Requirement Posted to FPO Network!</span>
                      <span className="text-[11px] text-muted-foreground">
                        Your bulk procurement order is now open for algorithmic matching with accredited FPO aggregation batches.
                      </span>
                    </div>
                  </div>
                )}

                {formError && (
                  <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Commodity *</label>
                      <Input
                        required
                        placeholder="e.g. Tomato, Potato, Onion, Wheat"
                        value={commodity}
                        onChange={(e) => setCommodity(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Required Volume (Quintals) *</label>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={requiredQuantity}
                        onChange={(e) => setRequiredQuantity(Number(e.target.value))}
                        className="h-9 text-xs"
                      />
                      <span className="text-[10px] text-muted-foreground">e.g. 500 Quintals (50 Metric Tonnes)</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Target Price (₹/Quintal)</label>
                      <Input
                        type="number"
                        min="1"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(Number(e.target.value))}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Delivery City / Hub</label>
                      <Input
                        placeholder="e.g. Pune, Nashik, Mumbai"
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-foreground">Max Sourcing Radius (km)</label>
                      <Input
                        type="number"
                        value={maxDistanceKm}
                        onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Quality & Grade Specifications</label>
                    <Input
                      placeholder="e.g. Firm red, Grade A, moisture under 12%, uniform sizing"
                      value={qualityRequirements}
                      onChange={(e) => setQualityRequirements(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-foreground">Logistics / Contract Notes</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Immediate delivery required; payment processed via platform escrow on receipt."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-between border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground">
                      FPOs with sealed lots ≥50% match will receive notifications.
                    </span>
                    <Button
                      type="submit"
                      disabled={postMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-sm"
                    >
                      {postMutation.isPending ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <span>Post Procurement Order</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sourcing Benefits Card */}
          <div>
            <Card className="border-border/80 bg-card rounded-2xl p-5 shadow-sm space-y-4 text-xs">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span>Wholesale Aggregation Advantage</span>
              </h3>

              <div className="space-y-3 text-muted-foreground leading-relaxed">
                <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                  <span className="font-semibold text-foreground block mb-1">Direct Farmgate Quality</span>
                  <span>Avoid multi-tier mandi degradation. Crops are aggregated directly from vetted farmer members under uniform standards.</span>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                  <span className="font-semibold text-foreground block mb-1">Algorithmic Batch Matching</span>
                  <span>Platform matches your volume with sealed cooperative lots based on geography, price ceiling, and quantity.</span>
                </div>

                <div className="p-3 rounded-lg bg-muted/40 border border-border/40">
                  <span className="font-semibold text-foreground block mb-1">Integrated Carrier Fulfillment</span>
                  <span>Matched contracts automatically spawn platform Orders tracked end-to-end via MockLogisticsProvider.</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Open Buy Requests Table */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">
            Active Institutional Procurement Demands ({requests.length})
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <Card className="p-8 text-center border-border/70 rounded-xl">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground">No active procurement requests</p>
              <p className="text-xs text-muted-foreground mt-1">
                Post the first institutional buying requirement using the form above.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 font-semibold text-foreground">
                    <th className="p-3.5">Commodity</th>
                    <th className="p-3.5">Required Volume</th>
                    <th className="p-3.5">Filled Volume</th>
                    <th className="p-3.5">Target Price</th>
                    <th className="p-3.5">Destination</th>
                    <th className="p-3.5">Buyer</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-muted-foreground">
                  {Array.isArray(requests) && requests.map((req) => (
                    <tr key={req.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 font-bold text-foreground">
                        {req.commodity}
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">
                        {req.requiredQuantity} Quintals
                      </td>
                      <td className="p-3.5 text-emerald-600 font-medium">
                        {req.filledQuantity} Q ({Math.round((req.filledQuantity / req.requiredQuantity) * 100)}%)
                      </td>
                      <td className="p-3.5 font-mono">
                        {req.targetPrice ? `₹${req.targetPrice}/Q` : 'Negotiable'}
                      </td>
                      <td className="p-3.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          <span>{req.deliveryCity || 'Any'}</span>
                        </span>
                      </td>
                      <td className="p-3.5 text-[11px] truncate max-w-[140px]">
                        {req.buyer?.buyerProfile?.businessName || req.buyer?.email || 'Institutional Buyer'}
                      </td>
                      <td className="p-3.5 text-right">
                        <Badge
                          variant="outline"
                          className={
                            req.status === 'FULLY_MATCHED'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : req.status === 'PARTIALLY_MATCHED'
                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          }
                        >
                          {req.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
