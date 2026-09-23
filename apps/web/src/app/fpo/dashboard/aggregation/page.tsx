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
import { Card } from '@/components/ui/card';
import {
  Package,
  Lock,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  MapPin,
  Scale,
  Loader2,
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
      <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B]">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-16 text-center max-w-6xl">
          <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
          <p className="text-xs text-[#5D6352]">Loading cooperative batches...</p>
        </div>
      </div>
    );
  }

  if (!myFpo) {
    return (
      <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B] flex flex-col font-sans">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-16 text-center space-y-4 max-w-md flex-1">
          <p className="text-xs text-[#5D6352]">Please register your FPO organization first.</p>
          <Link href="/fpo/register">
            <Button className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs rounded-md">Register FPO</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B] font-sans">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl space-y-8">
        <div>
          <Link
            href="/fpo/dashboard"
            className="text-xs font-semibold text-[#233D22] hover:underline inline-flex items-center gap-1 mb-2"
          >
            ← Back to FPO Dashboard
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DFD8CB]">
            <div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
                Batch Aggregation & Buyer Matching
              </h1>
              <p className="text-xs sm:text-sm text-[#5D6352] mt-1">
                {myFpo.name}: Seal aggregated member lots to trigger deterministic matching with verified institutional buyers.
              </p>
            </div>
            <Link href="/fpo/dashboard/listings">
              <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs gap-1.5 rounded-md h-9">
                <span>+ Create Batch from Listings</span>
              </Button>
            </Link>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-[#FDF2F2] border border-[#D98282] text-[#8C2323] text-xs rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {matchSuccess && (
          <div className="p-4 rounded-lg bg-[#EDF3ED] border border-[#C8D9C8] text-[#233D22] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-[#233D22] shrink-0" />
              <div>
                <span className="font-serif font-bold block text-sm">
                  Batch {matchSuccess.batchNumber} Successfully Matched
                </span>
                <span className="text-[11px] text-[#5D6352]">
                  Bulk order <strong>{matchSuccess.orderNumber}</strong> has been generated and queued in your Producer Fulfillment ledger.
                </span>
              </div>
            </div>
            <Link href="/seller/orders">
              <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs h-8 rounded-md">
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
              <Scale className="h-5 w-5 text-[#233D22]" />
              <h2 className="text-sm uppercase tracking-wider font-bold text-[#1E221B]">
                Matched Institutional Buyer Requests ({matchedResults.length})
              </h2>
            </div>
            <span className="text-xs text-[#5D6352]">
              Evaluated on commodity match and volume feasibility
            </span>
          </div>

          {loadingMatches ? (
            <div className="p-8 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
              <p className="text-xs text-[#5D6352]">Evaluating live buyer contracts...</p>
            </div>
          ) : matchedResults.length === 0 ? (
            <Card className="p-6 border-dashed border-[#DFD8CB] bg-[#FCFAF6] text-center rounded-lg">
              <p className="text-xs font-semibold text-[#1E221B]">
                No active buyer matches at this moment
              </p>
              <p className="text-[11px] text-[#5D6352] mt-1 max-w-md mx-auto">
                Ensure you have batches in <strong>SEALED</strong> status. When buyers post bulk demands matching your commodity and volume, they appear here.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.isArray(matchedResults) && matchedResults.map(({ batch, buyRequest, matchPercentage, remainingQuantity }) => (
                <Card
                  key={`${batch.id}-${buyRequest.id}`}
                  className="p-5 border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-serif font-bold text-sm text-[#1E221B] block">
                          {batch.commodity} wholesale contract
                        </span>
                        <span className="text-xs text-[#5D6352] font-mono">
                          Batch: {batch.batchNumber} ({batch.totalQuantity} Q)
                        </span>
                      </div>
                      <Badge className="bg-[#233D22] text-white font-mono text-xs rounded">
                        {matchPercentage}% Match
                      </Badge>
                    </div>

                    <div className="p-3 rounded bg-[#F7F5EE] border border-[#DFD8CB] space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#5D6352]">Buyer Entity:</span>
                        <span className="font-semibold text-[#1E221B] truncate max-w-[180px]">
                          {buyRequest.buyer?.buyerProfile?.businessName || buyRequest.buyer?.email}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#5D6352]">Target Price:</span>
                        <span className="font-bold text-[#233D22] font-mono">
                          ₹{buyRequest.targetPrice || 1900} / Quintal
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#5D6352]">Destination:</span>
                        <span className="font-medium text-[#1E221B] flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-[#3B532B]" />
                          <span>{buyRequest.deliveryCity || 'Pune'}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#5D6352]">Remaining Demand:</span>
                        <span className="font-medium text-[#1E221B]">
                          {remainingQuantity} Quintals
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-[#5D6352]">
                        <span>Coverage</span>
                        <span>{Math.min(100, Math.round((Number(batch.totalQuantity) / remainingQuantity) * 100))}% of remaining</span>
                      </div>
                      <div className="w-full h-2 rounded bg-[#EAE5D9] overflow-hidden">
                        <div
                          className="h-full bg-[#233D22] rounded"
                          style={{ width: `${Math.min(100, matchPercentage)}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#DFD8CB] flex items-center justify-between">
                    <span className="text-[11px] text-[#5D6352]">
                      Est. Lot Gross: ₹{(Number(batch.totalQuantity) * (Number(buyRequest.targetPrice) || 1900)).toLocaleString('en-IN')}
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
                      className="bg-[#233D22] hover:bg-[#1a2d19] text-white font-semibold text-xs h-8 gap-1.5 rounded-md"
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
          <h2 className="text-sm uppercase tracking-wider font-bold text-[#1E221B]">
            All Aggregated Batches ({batches.length})
          </h2>

          {loadingBatches ? (
            <div className="p-8 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
              <p className="text-xs text-[#5D6352]">Loading batch records...</p>
            </div>
          ) : batches.length === 0 ? (
            <Card className="p-8 text-center border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
              <Package className="mx-auto h-10 w-10 text-[#8C867A] mb-2" />
              <p className="text-sm font-serif font-bold text-[#1E221B]">No batches aggregated yet</p>
              <p className="text-xs text-[#5D6352] mt-1">
                Go to Produce Commitments to pool farmer harvests into your first lot.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#DFD8CB] bg-[#FCFAF6]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DFD8CB] bg-[#F7F5EE] font-semibold text-[#1E221B]">
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
                <tbody className="divide-y divide-[#DFD8CB] text-[#5D6352]">
                  {Array.isArray(batches) && batches.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F7F5EE] transition-colors">
                      <td className="p-3.5 font-mono font-bold text-[#1E221B]">
                        {b.batchNumber}
                      </td>
                      <td className="p-3.5 font-serif font-bold text-[#1E221B]">
                        {b.commodity}
                      </td>
                      <td className="p-3.5 font-bold text-[#233D22]">
                        {b.totalQuantity} Quintals
                      </td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px] bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                          {b.qualityGrade || 'Grade A'}
                        </Badge>
                      </td>
                      <td className="p-3.5">
                        {b.listings?.length || 0} Farmers pooled
                      </td>
                      <td className="p-3.5 text-[11px]">
                        {new Date(b.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] rounded ${
                            b.status === 'COMPLETED'
                              ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                              : b.status === 'DISPATCHED'
                              ? 'border-[#CADCE6] bg-[#EBF1F5] text-[#2C4E65]'
                              : b.status === 'SEALED'
                              ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                              : 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                          }`}
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
                            className="h-7 text-xs bg-[#233D22] hover:bg-[#1a2d19] text-white font-semibold rounded"
                          >
                            <Lock className="h-3 w-3 mr-1" />
                            <span>Seal Batch</span>
                          </Button>
                        ) : b.status === 'DISPATCHED' || b.status === 'COMPLETED' ? (
                          <Link href="/seller/orders">
                            <span className="text-[#233D22] hover:underline text-xs font-semibold">
                              Track Order →
                            </span>
                          </Link>
                        ) : (
                          <span className="text-[#233D22] text-xs font-semibold">
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
