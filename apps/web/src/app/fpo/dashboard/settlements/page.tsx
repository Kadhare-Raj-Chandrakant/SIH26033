'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyOrganization,
  fetchFpoBatches,
  fetchFpoSettlements,
  createFpoSettlement,
  distributeFpoPayments,
  FpoSettlement,
  FpoAggregationBatch,
} from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Truck,
  Landmark,
  Package,
  Users,
  Sparkles,
  Calculator,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

export default function FpoSettlementsPage() {
  return (
    <RoleGuard allowedRoles={['FPO', 'ADMIN']}>
      <FpoSettlementsContent />
    </RoleGuard>
  );
}

function FpoSettlementsContent() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [commissionPercent, setCommissionPercent] = useState<number>(3);
  const [transportCost, setTransportCost] = useState<number>(15000);
  const [handlingCost, setHandlingCost] = useState<number>(8000);
  const [otherDeductions, setOtherDeductions] = useState<number>(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: myFpo, isLoading: loadingFpo } = useQuery({
    queryKey: ['my-fpo-org', token],
    queryFn: () => fetchMyOrganization(token || undefined),
    enabled: !!token,
  });

  // 1. Fetch Settlements
  const { data: rawSettlements = [], isLoading: loadingSettlements } = useQuery({
    queryKey: ['fpo-settlements', myFpo?.id, token],
    queryFn: () => fetchFpoSettlements(myFpo!.id, token || undefined),
    enabled: !!myFpo?.id && !!token,
  });
  const settlements: FpoSettlement[] = Array.isArray(rawSettlements)
    ? rawSettlements
    : Array.isArray((rawSettlements as any)?.data)
    ? (rawSettlements as any).data
    : [];

  // 2. Fetch Batches (to find dispatched batches ready for settlement)
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

  // Batches eligible for settlement: DISPATCHED or COMPLETED with an orderId and no existing settlement
  const safeSettlements = Array.isArray(settlements) ? settlements : [];
  const safeBatches = Array.isArray(batches) ? batches : [];
  const settledOrderIds = safeSettlements.map((s) => s.orderId);
  const eligibleBatches = safeBatches.filter(
    (b) =>
      (b.status === 'DISPATCHED' || b.status === 'COMPLETED') &&
      b.orderId &&
      !settledOrderIds.includes(b.orderId),
  );

  React.useEffect(() => {
    if (eligibleBatches.length > 0 && !selectedBatchId) {
      setSelectedBatchId(eligibleBatches[0].id);
    }
  }, [eligibleBatches, selectedBatchId]);

  const selectedBatch = batches.find((b) => b.id === selectedBatchId);
  const batchTotalQty = Number(selectedBatch?.totalQuantity || 0);
  const targetPrice = Number(selectedBatch?.buyRequest?.targetPrice || 1900);
  const estimatedGross = batchTotalQty * targetPrice;
  const fpoCommission = (estimatedGross * (commissionPercent || 0)) / 100;
  const totalDeductions = fpoCommission + Number(transportCost || 0) + Number(handlingCost || 0) + Number(otherDeductions || 0);
  const netDistributable = Math.max(0, estimatedGross - totalDeductions);
  const ratePerQuintal = batchTotalQty > 0 ? netDistributable / batchTotalQty : 0;

  // Mutation: Create Settlement
  const createMutation = useMutation({
    mutationFn: () => {
      if (!selectedBatchId) throw new Error('Please select an eligible batch to settle');
      return createFpoSettlement(
        selectedBatchId,
        {
          commissionPercent,
          transportCost,
          handlingCost,
          otherDeductions,
        },
        token || undefined,
      );
    },
    onSuccess: () => {
      setActionError(null);
      setActionSuccess('Settlement statement generated successfully!');
      queryClient.invalidateQueries({ queryKey: ['fpo-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-batches'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-dashboard-stats'] });
      setTimeout(() => setActionSuccess(null), 5000);
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  // Mutation: Distribute Payments
  const distributeMutation = useMutation({
    mutationFn: (settlementId: string) => distributeFpoPayments(settlementId, token || undefined),
    onSuccess: () => {
      setActionError(null);
      setActionSuccess('Payments successfully distributed to all member farmers!');
      queryClient.invalidateQueries({ queryKey: ['fpo-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-batches'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-dashboard-stats'] });
      setTimeout(() => setActionSuccess(null), 5000);
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
                Post-Delivery Settlement & Farmer Distribution
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {myFpo.name} — Configure operational deductions and disburse net proceeds proportionally to member farmers.
              </p>
            </div>
            <Link href="/seller/orders">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-border/80">
                <Truck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Track Fulfillment Orders</span>
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

        {actionSuccess && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* Section 1: Settlement Generation Engine */}
        {eligibleBatches.length > 0 ? (
          <Card className="border-border/80 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Calculator className="h-5 w-5 text-emerald-600" />
                <span>Create New Settlement Statement</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Select a dispatched wholesale batch, define operational deductions, and generate proportional member payouts.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Select Dispatched Batch *</label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {eligibleBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber} — {b.commodity} ({b.totalQuantity} Q)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">FPO Administrative Commission (%)</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Logistics / Freight Cost (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={transportCost}
                    onChange={(e) => setTransportCost(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Grading & Handling Cost (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={handlingCost}
                    onChange={(e) => setHandlingCost(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-foreground">Other Deductions (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Financial Calculations Preview */}
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Gross Lot Revenue</span>
                  <span className="text-base font-bold text-foreground">₹{estimatedGross.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Total Deductions</span>
                  <span className="text-base font-bold text-amber-600">₹{totalDeductions.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Net Distributable Pool</span>
                  <span className="text-base font-black text-emerald-600">₹{netDistributable.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Proportional Payout Rate</span>
                  <span className="text-base font-black text-foreground font-mono">₹{ratePerQuintal.toFixed(2)} / Q</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-muted-foreground text-[11px]">
                  Payment records will be generated for all {selectedBatch?.listings?.length || 0} participating member farmers.
                </span>
                <Button
                  size="sm"
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1.5 shadow-sm"
                >
                  {createMutation.isPending ? 'Generating Statement...' : 'Generate Settlement Statement →'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-6 border-dashed border-border/80 bg-card/60 text-center rounded-xl">
            <DollarSign className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs font-semibold text-foreground">No batches awaiting settlement</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              When batches are matched to buyer orders and dispatched, they will appear here for post-delivery settlement.
            </p>
          </Card>
        )}

        {/* Section 2: Historical Settlement Statements & Farmer Payouts */}
        <div className="space-y-6">
          <h2 className="text-base font-bold text-foreground">
            Settlement Statements & Member Distributions ({settlements.length})
          </h2>

          {loadingSettlements ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-44 w-full rounded-2xl" />
              ))}
            </div>
          ) : settlements.length === 0 ? (
            <Card className="p-8 text-center border-border/70 rounded-xl">
              <Landmark className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground">No settlements recorded yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Completed wholesale lot disbursements will be archived here.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {Array.isArray(settlements) && settlements.map((s) => (
                <Card key={s.id} className="border-border/80 bg-card rounded-xl shadow-sm overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4 border-b border-border/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-foreground">
                            Batch: {s.batch?.batchNumber || 'Wholesale Lot'}
                          </span>
                          <Badge
                            variant="outline"
                            className={
                              s.status === 'DISTRIBUTED'
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            }
                          >
                            {s.status === 'DISTRIBUTED' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            <span>{s.status}</span>
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          Order Ref: {s.orderId} · Created {new Date(s.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {s.status === 'PENDING' && (
                        <Button
                          size="sm"
                          disabled={distributeMutation.isPending}
                          onClick={() => distributeMutation.mutate(s.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold gap-1.5 shadow-sm shadow-emerald-600/20"
                        >
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>Distribute Payments to Farmers</span>
                        </Button>
                      )}
                    </div>

                    {/* Breakdown Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-xs">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Gross Revenue</span>
                        <span className="font-bold text-foreground">₹{Number(s.grossAmount).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">FPO Commission</span>
                        <span className="font-medium text-foreground">₹{Number(s.fpoCommission).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Logistics & Handling</span>
                        <span className="font-medium text-foreground">
                          ₹{(Number(s.transportCost) + Number(s.handlingCost)).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Net Distributable</span>
                        <span className="font-black text-emerald-600">₹{Number(s.netDistributable).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Farmers Paid</span>
                        <span className="font-bold text-foreground">{s.farmerPayments?.length || 0} Members</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-border/50 bg-muted/20 font-semibold text-muted-foreground text-[11px]">
                            <th className="p-3">Farmer Email</th>
                            <th className="p-3">Contributed Qty</th>
                            <th className="p-3">Rate / Q</th>
                            <th className="p-3">Gross Payout</th>
                            <th className="p-3">Deductions</th>
                            <th className="p-3">Net Disbursed</th>
                            <th className="p-3">Txn Reference</th>
                            <th className="p-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40 text-muted-foreground">
                          {s.farmerPayments?.map((p) => (
                            <tr key={p.id} className="hover:bg-muted/10 transition-colors">
                              <td className="p-3 font-medium text-foreground">
                                {p.farmer?.email || 'Member Farmer'}
                              </td>
                              <td className="p-3 font-bold text-foreground">
                                {p.quantity} Q
                              </td>
                              <td className="p-3 font-mono">
                                ₹{Number(p.ratePerQuintal).toFixed(2)}
                              </td>
                              <td className="p-3 font-mono">
                                ₹{Number(p.grossAmount).toLocaleString()}
                              </td>
                              <td className="p-3 font-mono text-amber-600">
                                -₹{Number(p.deductions).toLocaleString()}
                              </td>
                              <td className="p-3 font-mono font-black text-emerald-600">
                                ₹{Number(p.netAmount).toLocaleString()}
                              </td>
                              <td className="p-3 font-mono text-[10px]">
                                {p.transactionId ? (
                                  <span className="text-foreground">{p.transactionId}</span>
                                ) : (
                                  <span className="text-muted-foreground/50 italic">Queued</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <Badge
                                  variant="outline"
                                  className={
                                    p.status === 'DISTRIBUTED'
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                      : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                  }
                                >
                                  {p.status}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
