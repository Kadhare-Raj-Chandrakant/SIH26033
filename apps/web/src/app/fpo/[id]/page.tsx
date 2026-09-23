'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFpoById, requestFpoMembership } from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Users,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Landmark,
  Calendar,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

export default function FpoProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const { user, token, isAuthenticated } = useAuth();

  const [shareCapital, setShareCapital] = useState<number>(1000);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const { data: fpo, isLoading, isError, error } = useQuery({
    queryKey: ['fpo-detail', id],
    queryFn: () => fetchFpoById(id),
  });

  const joinMutation = useMutation({
    mutationFn: () => requestFpoMembership(id, shareCapital, token || undefined),
    onSuccess: () => {
      setJoinSuccess(true);
      setJoinError(null);
      queryClient.invalidateQueries({ queryKey: ['fpo-detail', id] });
    },
    onError: (err: Error) => {
      setJoinError(err.message);
    },
  });

  const isFarmer = isAuthenticated && user?.role === 'FARMER';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B] font-sans">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        <Link
          href="/fpo"
          className="text-xs font-semibold text-[#233D22] hover:underline inline-flex items-center gap-1 mb-4"
        >
          ← Back to FPO Directory
        </Link>

        {isLoading ? (
          <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
            <p className="text-xs text-[#5D6352]">Loading FPO collective profile...</p>
          </div>
        ) : isError || !fpo ? (
          <div className="text-center py-16 bg-[#FDF2F2] border border-[#D98282] rounded-lg p-8">
            <p className="text-[#8C2323] font-semibold text-sm">Failed to load FPO profile</p>
            <p className="text-xs text-[#5D6352] mt-1">{(error as Error)?.message || 'Organization not found'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] rounded ${
                        fpo.status === 'ACTIVE'
                          ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                          : 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                      }`}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      <span>{fpo.status.replace('_', ' ')}</span>
                    </Badge>
                    <span className="text-xs text-[#5D6352] font-mono">
                      Reg: {fpo.registrationNumber}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-[#1E221B]">
                    {fpo.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-[#5D6352] flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-[#3B532B] shrink-0" />
                    <span>{fpo.address}, {fpo.district}, {fpo.state} - {fpo.pincode}</span>
                  </p>
                </div>

                {isFarmer && (
                  <Button
                    onClick={() => setShowJoinModal(true)}
                    className="bg-[#233D22] hover:bg-[#1a2d19] text-white gap-2 font-semibold text-xs h-10 px-5 rounded-md"
                  >
                    <Users className="h-4 w-4" />
                    <span>Join This FPO Collective</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
                <span className="text-[10px] uppercase tracking-wider text-[#5D6352] block">Approved Members</span>
                <span className="text-2xl font-serif font-bold text-[#233D22] mt-1 block">
                  {fpo.memberCount || 0}
                </span>
              </Card>
              <Card className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
                <span className="text-[10px] uppercase tracking-wider text-[#5D6352] block">Legal Entity</span>
                <span className="text-sm font-bold text-[#1E221B] mt-2 block capitalize">
                  {fpo.legalStructure.replace(/_/g, ' ').toLowerCase()}
                </span>
              </Card>
              <Card className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
                <span className="text-[10px] uppercase tracking-wider text-[#5D6352] block">Batches Aggregated</span>
                <span className="text-2xl font-serif font-bold text-[#1E221B] mt-1 block">
                  {fpo.totalBatchesCount || 0}
                </span>
              </Card>
              <Card className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
                <span className="text-[10px] uppercase tracking-wider text-[#5D6352] block">Active Commitments</span>
                <span className="text-2xl font-serif font-bold text-[#1E221B] mt-1 block">
                  {fpo.totalListingsCount || 0}
                </span>
              </Card>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Details */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
                  <CardHeader className="pb-3 border-b border-[#DFD8CB]">
                    <CardTitle className="text-base font-serif font-bold text-[#1E221B]">
                      About the Organisation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 text-xs leading-relaxed text-[#5D6352]">
                    <p>
                      {fpo.description ||
                        'This Farmer Producer Organisation pools agricultural harvest from local member smallholders to guarantee fair wholesale farmgate pricing, standardized scientific grading, and streamlined access to institutional buyers.'}
                    </p>

                    {fpo.activeCommodities && fpo.activeCommodities.length > 0 && (
                      <div className="pt-3 border-t border-[#DFD8CB]">
                        <span className="font-semibold text-[#1E221B] block mb-2">
                          Active Produce & Crop Focus:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {fpo.activeCommodities.map((crop) => (
                            <Badge key={crop} variant="outline" className="text-xs bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                              {crop}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Farmer Join Callout if logged in */}
                {isFarmer && (
                  <Card className="border border-[#C8D9C8] bg-[#EDF3ED] rounded-lg p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-[#233D22] text-white shrink-0">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-serif font-bold text-[#1E221B]">
                          Are you farming in {fpo.district}?
                        </h3>
                        <p className="text-xs text-[#5D6352] leading-relaxed">
                          By joining {fpo.name}, your harvest can be aggregated with fellow farmers to fulfill large-scale institutional contracts, eliminating middleman cuts and securing proportional escrow settlements.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setShowJoinModal(true)}
                          className="bg-[#233D22] hover:bg-[#1a2d19] text-white gap-1.5 text-xs font-semibold mt-2 rounded-md h-8"
                        >
                          <span>Request Membership</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Col: Contact & Official Verification */}
              <div className="space-y-6">
                <Card className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
                  <CardHeader className="pb-3 border-b border-[#DFD8CB]">
                    <CardTitle className="text-xs uppercase tracking-wider font-bold text-[#1E221B] flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-[#233D22]" />
                      <span>Contact & Representation</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-[#5D6352]">
                      <Phone className="h-4 w-4 text-[#3B532B] shrink-0" />
                      <span>{fpo.contactPhone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#5D6352]">
                      <Mail className="h-4 w-4 text-[#3B532B] shrink-0" />
                      <span className="truncate">{fpo.contactEmail}</span>
                    </div>
                    {fpo.bankName && (
                      <div className="flex items-center gap-2 text-[#5D6352] pt-2 border-t border-[#DFD8CB]">
                        <Landmark className="h-4 w-4 text-[#3B532B] shrink-0" />
                        <span>Escrow: {fpo.bankName}</span>
                      </div>
                    )}
                    {fpo.registrationDate && (
                      <div className="flex items-center gap-2 text-[#5D6352]">
                        <Calendar className="h-4 w-4 text-[#3B532B] shrink-0" />
                        <span>Inc: {new Date(fpo.registrationDate).toLocaleDateString('en-IN')}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Join FPO Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg max-w-md w-full p-6 space-y-4">
              <h3 className="text-base font-serif font-bold text-[#1E221B]">
                Join {fpo?.name}
              </h3>
              <p className="text-xs text-[#5D6352] leading-relaxed">
                Submit your application to become an accredited farmer member. Membership allows you to commit crops for collective aggregation.
              </p>

              {joinSuccess ? (
                <div className="p-4 rounded bg-[#EDF3ED] border border-[#C8D9C8] text-[#233D22] text-xs text-center space-y-2">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-[#233D22]" />
                  <p className="font-semibold">Application Submitted Successfully</p>
                  <p className="text-[11px] text-[#5D6352]">
                    The FPO administrator will review your application. You can view status under <strong>My FPO Memberships</strong>.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinSuccess(false);
                    }}
                    className="mt-2 text-xs bg-[#233D22] text-white rounded-md"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  {joinError && (
                    <div className="p-3 bg-[#FDF2F2] border border-[#D98282] text-[#8C2323] text-xs rounded flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <label className="font-medium text-[#1E221B]">
                      Contributed Member Share Capital (INR)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={shareCapital}
                      onChange={(e) => setShareCapital(Number(e.target.value))}
                      className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                    />
                    <p className="text-[10px] text-[#5D6352]">
                      Nominal cooperative share capital specified in FPO bylaws (e.g. ₹500 to ₹2,000).
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DFD8CB]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJoinModal(false)}
                      className="text-xs border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={joinMutation.isPending}
                      onClick={() => joinMutation.mutate()}
                      className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs font-semibold rounded-md"
                    >
                      {joinMutation.isPending ? 'Submitting...' : 'Submit Membership Request'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
