'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyOrganization,
  fetchFpoBatches,
  sealAggregationBatch,
  fetchMatchedBatches,
  matchBatchToBuyRequest,
  FpoAggregationBatch,
  MatchedBatchResult,
} from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  Sparkles,
  Lock,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Truck,
  TrendingUp,
  MapPin,
  Building2,
  DollarSign,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

export default function FpoAggregationPage() {
  return (
    <RoleGuard allowedRoles={['FPO', 'ADMIN']}>
      <FpoAggregationContent />
    </RoleGuard>
  );
}

function FpoAggregationContent() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const [actionError, setActionError] = useState<string | null>(null);
  const [matchSuccess, setMatchSuccess] = useState<{
    batchNumber: string;
    orderNumber: string;
  } | null>(null);

  const { data: myFpo, isLoading: loadingFpo } = useQuery({
    queryKey: ['my-fpo-org', token],
    queryFn: () => fetchMyOrganization(token || undefined),
    enabled: !!token,
  });

  // 1. Fetch Batches for this FPO
  const { data: rawBatches = [], isLoading: loadingBatches } = useQuery({
    queryKey: ['fpo-batches', myFpo?.id, token],
    queryFn: () => fetchFpoBatches(myFpo!.id, undefined, token || undefined),
    enabled: !!myFpo?.id && !!token,
  });
  const batches: FpoAggregationBatch[] = Array.isArray(rawBatches)
    ? rawBatches
    : Array.isArray((rawBatches as any)?.data)
    ? (rawBatches as any).data
    : [];

  // 2. Fetch Algorithmic Matched Buyer Requests
  const { data: rawMatches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ['fpo-matched-batches', myFpo?.id, token],
    queryFn: () => fetchMatchedBatches(myFpo!.id, token || undefined),
    enabled: !!myFpo?.id && !!token,
    refetchInterval: 10000,
  });
  const matchedResults: MatchedBatchResult[] = Array.isArray(rawMatches)
    ? rawMatches
    : Array.isArray((rawMatches as any)?.data)
    ? (rawMatches as any).data
    : [];

  // Mutation: Seal Batch
  const sealMutation = useMutation({
    mutationFn: (batchId: string) => sealAggregationBatch(batchId, token || undefined),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['fpo-batches'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-matched-batches'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-dashboard-stats'] });
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  // Mutation: Match Batch to Buyer
  const matchMutation = useMutation({
    mutationFn: ({ batchId, buyRequestId }: { batchId: string; buyRequestId: string }) =>
      matchBatchToBuyRequest(batchId, buyRequestId, token || undefined),
    onSuccess: (data) => {
      setActionError(null);
      setMatchSuccess({
        batchNumber: data.batch.batchNumber,
        orderNumber: data.order.orderNumber,
      });
      queryClient.invalidateQueries({ queryKey: ['fpo-batches'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-matched-batches'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-dashboard-stats'] });
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  if (loadingFpo) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-12 max-w-6xl space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!myFpo) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-16 text-center space-y-4">
          <p className="text-muted-foreground text-sm">Please register your FPO first.</p>
          <Link href="/fpo/register">
            <Button className="bg-emerald-600 text-white">Register FPO</Button>
          </Link>
        </div>
      </div>
    );
  }

  const openBatches = batches.filter((b) => b.status === 'OPEN');
  const sealedBatches = batches.filter((b) => b.status === 'SEALED');

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl space-y-8">
        <div>
          <Link
            href="/fpo/dashboard"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 mb-2"
          >
            ← Back to FPO Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Batch Aggregation & Buyer Matching
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {myFpo.name} — Seal aggregated member lots to trigger algorithmic matching with institutional bulk buyers.
              </p>
            </div>
            <Link href="/fpo/dashboard/listings">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
                <span>+ Create Batch from Listings</span>
              </Button>
            </Link>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {matchSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold block text-sm">
                  Batch {matchSuccess.batchNumber} Successfully Matched!
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Bulk order <strong>{matchSuccess.orderNumber}</strong> has been generated and queued in your Producer Fulfillment orders dashboard.
                </span>
              </div>
            </div>
            <Link href="/seller/orders">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
                <span>View in Seller Orders</span>
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* Section 1: Algorithmic Matched Buyer Opportunities */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base font-bold text-foreground">
                Matched Institutional Buyer Requests ({matchedResults.length})
              </h2>
            </div>
            <span className="text-xs text-muted-foreground">
              Evaluated on commodity match & ≥50% volume coverage
            </span>
          </div>

          {loadingMatches ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-40 rounded-xl" />
              <Skeleton className="h-40 rounded-xl" />
            </div>
          ) : matchedResults.length === 0 ? (
            <Card className="p-6 border-dashed border-border/80 bg-card text-center rounded-xl">
              <p className="text-xs font-semibold text-foreground">
                No active buyer matches at this moment
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 max-w-md mx-auto">
                Ensure you have batches in <strong>SEALED</strong> status. When buyers post bulk procurement demands matching your commodity and volume, they will appear here automatically.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.isArray(matchedResults) && matchedResults.map(({ batch, buyRequest, matchPercentage, remainingQuantity }) => (
                <Card
                  key={`${batch.id}-${buyRequest.id}`}
                  className="p-5 border-emerald-500/40 bg-card rounded-xl shadow-sm space-y-4 hover:border-emerald-500 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-foreground block">
                          {batch.commodity} wholesale contract
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          Batch: {batch.batchNumber} ({batch.totalQuantity} Q)
                        </span>
                      </div>
                      <Badge className="bg-emerald-600 text-white font-mono text-xs">
                        {matchPercentage}% Match
                      </Badge>
                    </div>

                    {/* Buyer Specs */}
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/40 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Buyer Organization:</span>
                        <span className="font-semibold text-foreground truncate max-w-[180px]">
                          {buyRequest.buyer?.buyerProfile?.businessName || buyRequest.buyer?.email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Target Price:</span>
                        <span className="font-bold text-emerald-600 font-mono">
                          ₹{buyRequest.targetPrice || 1900} / Quintal
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Destination:</span>
                        <span className="font-medium text-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-emerald-600" />
                          <span>{buyRequest.deliveryCity || 'Pune'}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Remaining Demand:</span>
                        <span className="font-medium text-foreground">
                          {remainingQuantity} Quintals
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Coverage</span>
                        <span>{Math.min(100, Math.round((Number(batch.totalQuantity) / remainingQuantity) * 100))}% of remaining</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-emerald-600 transition-all rounded-full"
                          style={{ width: `${Math.min(100, matchPercentage)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Est. Lot Gross: ₹{(Number(batch.totalQuantity) * (Number(buyRequest.targetPrice) || 1900)).toLocaleString()}
                    </span>
                    <Button
                      size="sm"
                      disabled={matchMutation.isPending}
                      onClick={() =>
                        matchMutation.mutate({
                          batchId: batch.id,
                          buyRequestId: buyRequest.id,
                        })
                      }
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 gap-1.5 shadow-sm shadow-emerald-600/20"
                    >
                      <span>Match & Create Order</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: All Aggregation Batches Roster */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">
            All Aggregated Batches ({batches.length})
          </h2>

          {loadingBatches ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : batches.length === 0 ? (
            <Card className="p-8 text-center border-border/70 rounded-xl">
              <Package className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground">No batches aggregated yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Go to Member Commitments to pool farmer harvests into your first lot.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 font-semibold text-foreground">
                    <th className="p-3.5">Batch Number</th>
                    <th className="p-3.5">Commodity</th>
                    <th className="p-3.5">Total Quantity</th>
                    <th className="p-3.5">Grade</th>
                    <th className="p-3.5">Member Listings</th>
                    <th className="p-3.5">Created Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-muted-foreground">
                  {Array.isArray(batches) && batches.map((b) => (
                    <tr key={b.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-foreground">
                        {b.batchNumber}
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">
                        {b.commodity}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-600">
                        {b.totalQuantity} Quintals
                      </td>
                      <td className="p-3.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {b.qualityGrade || 'Grade A'}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        {b.listings?.length || 0} Farmers pooled
                      </td>
                      <td className="p-3.5 text-[11px]">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={
                            b.status === 'COMPLETED'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : b.status === 'DISPATCHED'
                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                : b.status === 'SEALED'
                                  ? 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                                  : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        {b.status === 'OPEN' ? (
                          <Button
                            size="sm"
                            disabled={sealMutation.isPending}
                            onClick={() => sealMutation.mutate(b.id)}
                            className="h-7 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                          >
                            <Lock className="h-3 w-3 mr-1" />
                            <span>Seal Batch</span>
                          </Button>
                        ) : b.status === 'DISPATCHED' || b.status === 'COMPLETED' ? (
                          <Link href="/seller/orders">
                            <span className="text-emerald-600 hover:underline text-xs font-semibold">
                              Track Order →
                            </span>
                          </Link>
                        ) : (
                          <span className="text-purple-600 text-xs font-semibold">
                            Sealed (Ready)
                          </span>
                        )}
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
