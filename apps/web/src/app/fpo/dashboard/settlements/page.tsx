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
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Landmark,
  Calculator,
  Coins,
  Loader2,
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

  const { data: rawBatches = [] } = useQuery({
    queryKey: ['fpo-batches', myFpo?.id, token],
    queryFn: () => fetchFpoBatches(myFpo!.id, undefined, token || undefined),
    enabled: !!myFpo?.id && !!token,
  });
  const batches: FpoAggregationBatch[] = Array.isArray(rawBatches)
    ? rawBatches
    : Array.isArray((rawBatches as any)?.data)
    ? (rawBatches as any).data
    : [];

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
      setActionSuccess('Settlement statement generated successfully.');
      queryClient.invalidateQueries({ queryKey: ['fpo-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-batches'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-dashboard-stats'] });
      setTimeout(() => setActionSuccess(null), 5000);
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const distributeMutation = useMutation({
    mutationFn: (settlementId: string) => distributeFpoPayments(settlementId, token || undefined),
    onSuccess: () => {
      setActionError(null);
      setActionSuccess('Payments successfully distributed to all member farmers.');
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
      <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B]">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-16 text-center max-w-6xl">
          <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
          <p className="text-xs text-[#5D6352]">Loading cooperative financial accounts...</p>
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
                Post-Delivery Settlement & Member Distribution
              </h1>
              <p className="text-xs sm:text-sm text-[#5D6352] mt-1">
                {myFpo.name}: Configure operational deductions and disburse net proceeds proportionally to member farmers.
              </p>
            </div>
            <Link href="/seller/orders">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B] rounded-md h-9">
                <Truck className="h-3.5 w-3.5 text-[#233D22]" />
                <span>Track Fulfillment Orders</span>
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

        {actionSuccess && (
          <div className="p-4 rounded-lg bg-[#EDF3ED] border border-[#C8D9C8] text-[#233D22] text-xs flex items-center gap-2.5">
            <CheckCircle2 className="h-5 w-5 text-[#233D22] shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {/* Section 1: Settlement Generation Engine */}
        {eligibleBatches.length > 0 ? (
          <Card className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
            <CardHeader className="pb-3 border-b border-[#DFD8CB]">
              <CardTitle className="text-base font-serif font-bold text-[#1E221B] flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#233D22]" />
                <span>Create Settlement Statement</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#5D6352]">
                Select a dispatched wholesale batch, define operational deductions, and generate proportional member payouts.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-6 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#1E221B]">Select Dispatched Batch *</label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full h-9 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 text-xs text-[#1E221B] focus:outline-none"
                  >
                    {eligibleBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchNumber}: {b.commodity} ({b.totalQuantity} Q)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#1E221B]">FPO Administrative Commission (%)</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={commissionPercent}
                    onChange={(e) => setCommissionPercent(Number(e.target.value))}
                    className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-[#1E221B]">Logistics / Freight Tariff (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={transportCost}
                    onChange={(e) => setTransportCost(Number(e.target.value))}
                    className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#1E221B]">Assaying & Handling Cost (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={handlingCost}
                    onChange={(e) => setHandlingCost(Number(e.target.value))}
                    className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-[#1E221B]">Other Deductions (₹)</label>
                  <Input
                    type="number"
                    min="0"
                    value={otherDeductions}
                    onChange={(e) => setOtherDeductions(Number(e.target.value))}
                    className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                  />
                </div>
              </div>

              {/* Financial Calculations Preview */}
              <div className="p-4 rounded bg-[#F4F0E6] border border-[#E0D9CB] grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[#5D6352] block text-[10px] uppercase tracking-wider">Gross Lot Value</span>
                  <span className="text-base font-serif font-bold text-[#1E221B]">₹{estimatedGross.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[#5D6352] block text-[10px] uppercase tracking-wider">Total Deductions</span>
                  <span className="text-base font-serif font-bold text-[#9A6818]">₹{totalDeductions.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[#5D6352] block text-[10px] uppercase tracking-wider">Net Distributable Pool</span>
                  <span className="text-base font-serif font-bold text-[#233D22]">₹{netDistributable.toLocaleString('en-IN')}</span>
                </div>
                <div>
                  <span className="text-[#5D6352] block text-[10px] uppercase tracking-wider">Proportional Payout Rate</span>
                  <span className="text-base font-serif font-bold text-[#1E221B] font-mono">₹{ratePerQuintal.toFixed(2)} / Q</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#DFD8CB]">
                <span className="text-[#5D6352] text-[11px]">
                  Payment disbursements will be scheduled for all {selectedBatch?.listings?.length || 0} participating member farmers.
                </span>
                <Button
                  size="sm"
                  disabled={createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                  className="bg-[#233D22] hover:bg-[#1a2d19] text-white font-semibold text-xs h-9 gap-1.5 rounded-md"
                >
                  {createMutation.isPending ? 'Generating Statement...' : 'Generate Settlement Statement →'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="p-6 border-dashed border-[#DFD8CB] bg-[#FCFAF6] text-center rounded-lg">
            <Coins className="mx-auto h-8 w-8 text-[#8C867A] mb-2" />
            <p className="text-xs font-semibold text-[#1E221B]">No batches awaiting settlement</p>
            <p className="text-[11px] text-[#5D6352] mt-0.5">
              When batches are matched to buyer orders and dispatched, they will appear here for post-delivery settlement.
            </p>
          </Card>
        )}

        {/* Section 2: Historical Settlement Statements & Farmer Payouts */}
        <div className="space-y-6">
          <h2 className="text-sm uppercase tracking-wider font-bold text-[#1E221B]">
            Settlement Statements & Member Distributions ({settlements.length})
          </h2>

          {loadingSettlements ? (
            <div className="p-8 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
              <p className="text-xs text-[#5D6352]">Loading settlement statements...</p>
            </div>
          ) : settlements.length === 0 ? (
            <Card className="p-8 text-center border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
              <Landmark className="mx-auto h-10 w-10 text-[#8C867A] mb-2" />
              <p className="text-sm font-serif font-bold text-[#1E221B]">No settlements recorded yet</p>
              <p className="text-xs text-[#5D6352] mt-1">
                Completed wholesale lot disbursements will be archived here.
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {Array.isArray(settlements) && settlements.map((s) => (
                <Card key={s.id} className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg overflow-hidden">
                  <CardHeader className="bg-[#F7F5EE] pb-4 border-b border-[#DFD8CB]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#1E221B]">
                            Batch: {s.batch?.batchNumber || 'Wholesale Lot'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] rounded ${
                              s.status === 'DISTRIBUTED'
                                ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                                : 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                            }`}
                          >
                            {s.status === 'DISTRIBUTED' ? (
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            <span>{s.status}</span>
                          </Badge>
                        </div>
                        <span className="text-xs text-[#5D6352]">
                          Order Ref: {s.orderId} · Created {new Date(s.createdAt).toLocaleDateString('en-IN')}
                        </span>
                      </div>

                      {s.status === 'PENDING' && (
                        <Button
                          size="sm"
                          disabled={distributeMutation.isPending}
                          onClick={() => distributeMutation.mutate(s.id)}
                          className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs h-8 font-semibold gap-1.5 rounded-md"
                        >
                          <Coins className="h-3.5 w-3.5" />
                          <span>Distribute Payments to Farmers</span>
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 text-xs">
                      <div>
                        <span className="text-[10px] text-[#5D6352] block uppercase tracking-wider">Gross Revenue</span>
                        <span className="font-serif font-bold text-[#1E221B]">₹{Number(s.grossAmount).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5D6352] block uppercase tracking-wider">FPO Commission</span>
                        <span className="font-medium text-[#1E221B]">₹{Number(s.fpoCommission).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5D6352] block uppercase tracking-wider">Logistics & Handling</span>
                        <span className="font-medium text-[#1E221B]">
                          ₹{(Number(s.transportCost) + Number(s.handlingCost)).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5D6352] block uppercase tracking-wider">Net Distributable</span>
                        <span className="font-serif font-bold text-[#233D22]">₹{Number(s.netDistributable).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5D6352] block uppercase tracking-wider">Farmers Paid</span>
                        <span className="font-bold text-[#1E221B]">{s.farmerPayments?.length || 0} Members</span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[#DFD8CB] bg-[#F7F5EE] font-semibold text-[#5D6352] text-[11px]">
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
                        <tbody className="divide-y divide-[#DFD8CB] text-[#5D6352]">
                          {s.farmerPayments?.map((p) => (
                            <tr key={p.id} className="hover:bg-[#F7F5EE] transition-colors">
                              <td className="p-3 font-medium text-[#1E221B]">
                                {p.farmer?.email || 'Member Farmer'}
                              </td>
                              <td className="p-3 font-bold text-[#1E221B]">
                                {p.quantity} Q
                              </td>
                              <td className="p-3 font-mono">
                                ₹{Number(p.ratePerQuintal).toFixed(2)}
                              </td>
                              <td className="p-3 font-mono">
                                ₹{Number(p.grossAmount).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 font-mono text-[#9A6818]">
                                -₹{Number(p.deductions).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 font-mono font-bold text-[#233D22]">
                                ₹{Number(p.netAmount).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 font-mono text-[10px]">
                                {p.transactionId ? (
                                  <span className="text-[#1E221B]">{p.transactionId}</span>
                                ) : (
                                  <span className="text-[#8C867A] italic">Queued</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] rounded ${
                                    p.status === 'DISTRIBUTED'
                                      ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                                      : 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                                  }`}
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
