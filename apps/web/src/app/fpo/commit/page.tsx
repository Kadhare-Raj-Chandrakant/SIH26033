'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFarmerMemberships,
  fetchFarmerListings,
  commitFarmerListing,
  FpoListing,
  FpoMembership,
} from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Sprout,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileCheck,
  Layers,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

export default function FarmerCommitPage() {
  return (
    <RoleGuard allowedRoles={['FARMER', 'ADMIN']}>
      <FarmerCommitContent />
    </RoleGuard>
  );
}

function FarmerCommitContent() {
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  const [selectedFpoId, setSelectedFpoId] = useState('');
  const [commodity, setCommodity] = useState('Tomato');
  const [quantityQuintals, setQuantityQuintals] = useState<number>(20);
  const [qualityGrade, setQualityGrade] = useState('Grade A');
  const [expectedHarvestDate, setExpectedHarvestDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const { data: rawMemberships = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['my-fpo-memberships', token],
    queryFn: () => fetchFarmerMemberships(token || undefined),
    enabled: !!token,
  });
  const memberships: FpoMembership[] = Array.isArray(rawMemberships)
    ? rawMemberships
    : Array.isArray((rawMemberships as any)?.data)
    ? (rawMemberships as any).data
    : [];

  const approvedMemberships = Array.isArray(memberships)
    ? memberships.filter((m) => m.status === 'APPROVED')
    : [];

  React.useEffect(() => {
    if (approvedMemberships.length > 0 && !selectedFpoId) {
      setSelectedFpoId(approvedMemberships[0].fpoId);
    }
  }, [approvedMemberships, selectedFpoId]);

  const { data: rawListings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['my-farmer-listings', token],
    queryFn: () => fetchFarmerListings(token || undefined),
    enabled: !!token,
  });
  const myListings: FpoListing[] = Array.isArray(rawListings)
    ? rawListings
    : Array.isArray((rawListings as any)?.data)
    ? (rawListings as any).data
    : [];

  const commitMutation = useMutation({
    mutationFn: () => {
      if (!selectedFpoId) {
        throw new Error('Please select an accredited FPO to commit your produce to.');
      }
      if (!commodity.trim()) {
        throw new Error('Please enter a commodity name.');
      }
      if (quantityQuintals <= 0) {
        throw new Error('Quantity must be greater than zero.');
      }

      return commitFarmerListing(
        selectedFpoId,
        {
          commodity: commodity.trim(),
          quantityQuintals,
          qualityGrade,
          expectedHarvestDate,
          notes: notes.trim() || undefined,
        },
        token || undefined,
      );
    },
    onSuccess: () => {
      setFormSuccess(true);
      setFormError(null);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['my-farmer-listings'] });
      setTimeout(() => setFormSuccess(false), 4000);
    },
    onError: (err: Error) => {
      setFormError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    commitMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B] font-sans">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <Link
            href="/fpo/join"
            className="text-xs font-semibold text-[#233D22] hover:underline inline-flex items-center gap-1 mb-2"
          >
            ← View My FPO Memberships
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
            Commit Harvest Produce to FPO
          </h1>
          <p className="text-xs sm:text-sm text-[#5D6352] mt-1">
            Register your upcoming or collected crop volume with your cooperative. The FPO will pool member commitments into wholesale commercial lots for institutional buyer fulfillment.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Card */}
          <div className="lg:col-span-2">
            <Card className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
              <CardHeader className="pb-4 border-b border-[#DFD8CB]">
                <CardTitle className="text-base font-serif font-bold text-[#1E221B] flex items-center gap-2">
                  <Sprout className="h-5 w-5 text-[#233D22]" />
                  <span>New Produce Commitment</span>
                </CardTitle>
                <CardDescription className="text-xs text-[#5D6352]">
                  Provide estimated volume and harvest readiness. FPOs aggregate your produce with other local farmers to secure premium bulk buyer contracts.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-5">
                {formSuccess && (
                  <div className="mb-6 p-4 rounded-lg bg-[#EDF3ED] border border-[#C8D9C8] text-[#233D22] text-xs flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#233D22]" />
                    <div>
                      <span className="font-semibold block">Produce Successfully Committed</span>
                      <span className="text-[11px] text-[#5D6352]">
                        Your commitment has been recorded and is ready for aggregation by the FPO administration.
                      </span>
                    </div>
                  </div>
                )}

                {formError && (
                  <div className="mb-6 p-3 bg-[#FDF2F2] border border-[#D98282] text-[#8C2323] text-xs rounded flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {approvedMemberships.length === 0 && !loadingMemberships ? (
                  <div className="p-6 text-center border border-dashed border-[#DFD8CB] rounded-lg space-y-3">
                    <Building2 className="h-10 w-10 text-[#8C867A] mx-auto" />
                    <h4 className="font-serif font-bold text-sm text-[#1E221B]">No Approved FPO Membership Found</h4>
                    <p className="text-xs text-[#5D6352] max-w-sm mx-auto">
                      You must be an approved member of at least one Farmer Producer Organisation to commit harvest produce.
                    </p>
                    <Link href="/fpo/join">
                      <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs rounded-md">
                        Join an FPO Now
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Target FPO Organization *</label>
                      <select
                        value={selectedFpoId}
                        onChange={(e) => setSelectedFpoId(e.target.value)}
                        className="w-full h-9 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 text-xs text-[#1E221B] focus:outline-none"
                        required
                      >
                        {approvedMemberships.map((mem) => (
                          <option key={mem.fpoId} value={mem.fpoId}>
                            {mem.fpo?.name} ({mem.fpo?.district}, {mem.fpo?.state})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold text-[#1E221B]">Commodity Name *</label>
                        <Input
                          required
                          placeholder="e.g. Tomato, Onion, Wheat, Soyabean"
                          value={commodity}
                          onChange={(e) => setCommodity(e.target.value)}
                          className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-[#1E221B]">Committed Quantity (Quintals) *</label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0.1"
                          required
                          value={quantityQuintals}
                          onChange={(e) => setQuantityQuintals(Number(e.target.value))}
                          className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                        />
                        <span className="text-[10px] text-[#5D6352]">1 Quintal = 100 Kilograms</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-semibold text-[#1E221B]">Expected Harvest / Collection Date</label>
                        <Input
                          type="date"
                          value={expectedHarvestDate}
                          onChange={(e) => setExpectedHarvestDate(e.target.value)}
                          className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-semibold text-[#1E221B]">Quality Grade Classification</label>
                        <select
                          value={qualityGrade}
                          onChange={(e) => setQualityGrade(e.target.value)}
                          className="w-full h-9 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 text-xs text-[#1E221B] focus:outline-none"
                        >
                          <option value="Grade A">Grade A (Premium / Export Quality)</option>
                          <option value="Grade B">Grade B (Standard Commercial Table)</option>
                          <option value="Grade C">Grade C (Industrial / Processing)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Additional Notes / Variety Details</label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Variety: Abhinav, organically farmed, expected moisture below 12%..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full rounded-md border border-[#DFD8CB] bg-[#F7F5EE] p-2.5 text-xs text-[#1E221B] focus:outline-none"
                      />
                    </div>

                    <div className="pt-3 flex items-center justify-between border-t border-[#DFD8CB]">
                      <span className="text-[11px] text-[#5D6352]">
                        Volume is locked once included in a sealed aggregation lot.
                      </span>
                      <Button
                        type="submit"
                        disabled={commitMutation.isPending}
                        className="bg-[#233D22] hover:bg-[#1a2d19] text-white gap-2 font-semibold text-xs rounded-md h-9 px-5"
                      >
                        {commitMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Recording...</span>
                          </>
                        ) : (
                          <>
                            <span>Commit Harvest</span>
                            <ArrowRight className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Col: Aggregation Benefits Guide */}
          <div className="space-y-6">
            <Card className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg p-5 space-y-4 text-xs">
              <h3 className="font-serif font-bold text-sm text-[#1E221B] flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-[#233D22]" />
                <span>Why Commit with Your FPO?</span>
              </h3>

              <div className="space-y-3 text-[#5D6352] leading-relaxed">
                <div className="p-3 rounded bg-[#F7F5EE] border border-[#DFD8CB]">
                  <span className="font-semibold text-[#1E221B] block mb-1">Direct Institutional Contracts</span>
                  <span>Buyer procurement requisitions demand minimum lots of 100 to 500 quintals. Pooling harvest allows smallholders to participate directly.</span>
                </div>

                <div className="p-3 rounded bg-[#F7F5EE] border border-[#DFD8CB]">
                  <span className="font-semibold text-[#1E221B] block mb-1">Zero Middleman Deductions</span>
                  <span>Produce is benchmarked transparently against target buyer rates with proportional escrow disbursement.</span>
                </div>

                <div className="p-3 rounded bg-[#F7F5EE] border border-[#DFD8CB]">
                  <span className="font-semibold text-[#1E221B] block mb-1">Certified Logistics & Weighing</span>
                  <span>FPO coordinates digital weighbridge assaying, moisture tests, and carrier pickup from village collection centers.</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Existing Committed Listings Table */}
        <div className="mt-12 space-y-4" id="listings">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm uppercase tracking-wider font-bold text-[#1E221B]">
                Your Committed Harvest Records ({myListings.length})
              </h2>
              <p className="text-xs text-[#5D6352]">
                Track status as your harvest is aggregated into batches and matched to buyer orders.
              </p>
            </div>
          </div>

          {loadingListings ? (
            <div className="p-8 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
              <p className="text-xs text-[#5D6352]">Loading commitment records...</p>
            </div>
          ) : myListings.length === 0 ? (
            <Card className="p-8 text-center border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
              <Layers className="mx-auto h-10 w-10 text-[#8C867A] mb-2" />
              <p className="text-sm font-serif font-bold text-[#1E221B]">No commitments yet</p>
              <p className="text-xs text-[#5D6352] mt-1">
                Fill out the form above to commit your first harvest to your cooperative.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#DFD8CB] bg-[#FCFAF6]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DFD8CB] bg-[#F7F5EE] font-semibold text-[#1E221B]">
                    <th className="p-3.5">FPO Organization</th>
                    <th className="p-3.5">Commodity</th>
                    <th className="p-3.5">Committed Qty</th>
                    <th className="p-3.5">Grade</th>
                    <th className="p-3.5">Harvest Date</th>
                    <th className="p-3.5">Batch Reference</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFD8CB] text-[#5D6352]">
                  {myListings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-[#F7F5EE] transition-colors">
                      <td className="p-3.5 font-medium text-[#1E221B]">
                        {listing.fpo?.name || 'FPO'}
                      </td>
                      <td className="p-3.5 font-serif font-bold text-[#1E221B]">
                        {listing.commodity}
                      </td>
                      <td className="p-3.5 text-[#233D22] font-bold">
                        {listing.quantityQuintals} Quintals
                      </td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px] bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                          {listing.qualityGrade || 'Standard'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-[11px]">
                        {listing.expectedHarvestDate
                          ? new Date(listing.expectedHarvestDate).toLocaleDateString('en-IN')
                          : 'Immediate'}
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        {listing.batch ? (
                          <span className="text-[#233D22] font-semibold">
                            {listing.batch.batchNumber}
                          </span>
                        ) : (
                          <span className="text-[#8C867A] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] rounded ${
                            listing.status === 'SOLD'
                              ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                              : listing.status === 'AGGREGATED'
                              ? 'border-[#CADCE6] bg-[#EBF1F5] text-[#2C4E65]'
                              : 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                          }`}
                        >
                          {listing.status === 'SOLD' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {listing.status === 'AGGREGATED' && <FileCheck className="h-3 w-3 mr-1" />}
                          {listing.status === 'COMMITTED' && <Clock className="h-3 w-3 mr-1" />}
                          <span>{listing.status}</span>
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
