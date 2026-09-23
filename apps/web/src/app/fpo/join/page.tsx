'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFpos,
  fetchFarmerMemberships,
  requestFpoMembership,
  FpoOrganization,
  FpoMembership,
} from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Building2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

export default function FarmerJoinFpoPage() {
  return (
    <RoleGuard allowedRoles={['FARMER', 'ADMIN']}>
      <FarmerJoinFpoContent />
    </RoleGuard>
  );
}

function FarmerJoinFpoContent() {
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  const [search, setSearch] = useState('');
  const [selectedFpo, setSelectedFpo] = useState<FpoOrganization | null>(null);
  const [shareCapital, setShareCapital] = useState<number>(1000);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const { data: myMembershipsData = [] } = useQuery({
    queryKey: ['my-fpo-memberships', token],
    queryFn: () => fetchFarmerMemberships(token || undefined),
    enabled: !!token,
  });
  const myMemberships: FpoMembership[] = Array.isArray(myMembershipsData)
    ? myMembershipsData
    : Array.isArray((myMembershipsData as any)?.data)
    ? (myMembershipsData as any).data
    : [];

  const { data: fposData = [], isLoading: loadingFpos } = useQuery({
    queryKey: ['fpo-directory', search],
    queryFn: () => fetchFpos({ search: search.trim() || undefined, status: 'ACTIVE' }),
  });
  const fpos: FpoOrganization[] = Array.isArray(fposData)
    ? fposData
    : Array.isArray((fposData as any)?.data)
    ? (fposData as any).data
    : [];

  const joinMutation = useMutation({
    mutationFn: () => {
      if (!selectedFpo) throw new Error('No FPO selected');
      return requestFpoMembership(selectedFpo.id, shareCapital, token || undefined);
    },
    onSuccess: () => {
      setRequestSuccess(true);
      setRequestError(null);
      queryClient.invalidateQueries({ queryKey: ['my-fpo-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-directory'] });
    },
    onError: (err: Error) => {
      setRequestError(err.message);
    },
  });

  const getMembershipStatus = (fpoId: string) => {
    if (!Array.isArray(myMemberships)) return null;
    const mem = myMemberships.find((m) => m.fpoId === fpoId);
    return mem ? mem.status : null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B] font-sans">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C8D9C8] bg-[#EDF3ED] px-3 py-1 text-xs font-semibold text-[#233D22] mb-2">
            <Building2 className="h-3.5 w-3.5 text-[#3B532B]" />
            <span>Cooperative Membership & Enrollment</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
            Join a Farmer Producer Organisation
          </h1>
          <p className="text-xs sm:text-sm text-[#5D6352] mt-1">
            Browse accredited cooperatives in your state or district. Approved members pool harvest into wholesale aggregation batches for institutional procurement.
          </p>
        </div>

        {/* Current Memberships Status Section */}
        {Array.isArray(myMemberships) && myMemberships.length > 0 && (
          <div className="mb-10 space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-bold text-[#1E221B] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#233D22]" />
              <span>Your Existing FPO Memberships ({myMemberships.length})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myMemberships.map((mem) => (
                <Card key={mem.id} className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-serif font-bold text-sm text-[#1E221B] line-clamp-1">
                      {mem.fpo?.name || 'FPO Organization'}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] rounded ${
                        mem.status === 'APPROVED'
                          ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                          : mem.status === 'PENDING'
                          ? 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                          : 'border-[#D98282] bg-[#FDF2F2] text-[#8C2323]'
                      }`}
                    >
                      {mem.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {mem.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                      {mem.status === 'REJECTED' && <XCircle className="h-3 w-3 mr-1" />}
                      <span>{mem.status}</span>
                    </Badge>
                  </div>

                  <p className="text-xs text-[#5D6352] mb-3 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-[#3B532B]" />
                    <span>{mem.fpo?.district}, {mem.fpo?.state}</span>
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[#DFD8CB]">
                    <span className="text-[#5D6352]">
                      Share Capital: ₹{mem.shareCapital || 0}
                    </span>
                    {mem.status === 'APPROVED' && (
                      <Link href="/fpo/commit">
                        <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs h-7 rounded">
                          <span>Commit Crops</span>
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Directory / Search Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-wider font-bold text-[#1E221B]">
              Accredited FPOs Open for Member Enrollment
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5D6352]" />
              <Input
                placeholder="Search by name or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-[#FCFAF6] border-[#DFD8CB]"
              />
            </div>
          </div>

          {loadingFpos ? (
            <div className="p-8 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
              <p className="text-xs text-[#5D6352]">Loading accredited cooperatives...</p>
            </div>
          ) : !Array.isArray(fpos) || fpos.length === 0 ? (
            <Card className="p-8 text-center border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
              <Building2 className="mx-auto h-10 w-10 text-[#8C867A] mb-2" />
              <p className="text-sm font-serif font-bold text-[#1E221B]">No active FPOs found</p>
              <p className="text-xs text-[#5D6352] mt-1">
                Try searching with different keywords or check back soon.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.isArray(fpos) && fpos.map((fpo) => {
                const status = getMembershipStatus(fpo.id);

                return (
                  <Card
                    key={fpo.id}
                    className="p-5 border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-serif font-bold text-sm text-[#1E221B]">{fpo.name}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase bg-[#F7F5EE] border-[#DFD8CB] text-[#5D6352]">
                          {fpo.legalStructure.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <p className="text-xs text-[#5D6352] flex items-center gap-1 mb-2">
                        <MapPin className="h-3.5 w-3.5 text-[#3B532B]" />
                        <span>{fpo.district}, {fpo.state}</span>
                      </p>

                      <p className="text-xs text-[#5D6352] line-clamp-2 leading-relaxed mb-3">
                        {fpo.description || 'Verified agricultural cooperative supporting collective produce aggregation and wholesale trade.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-[#DFD8CB]">
                      <span className="text-xs font-medium text-[#233D22]">
                        {fpo.memberCount || 0} active members
                      </span>

                      {status === 'APPROVED' ? (
                        <Badge variant="outline" className="bg-[#EDF3ED] border-[#C8D9C8] text-[#233D22] text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          <span>Member</span>
                        </Badge>
                      ) : status === 'PENDING' ? (
                        <Badge variant="outline" className="border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818] text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Pending Approval</span>
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedFpo(fpo);
                            setRequestSuccess(false);
                            setRequestError(null);
                          }}
                          className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs h-8 font-semibold rounded-md"
                        >
                          <span>Request to Join</span>
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal: Request to Join */}
        {selectedFpo && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg max-w-md w-full p-6 space-y-4">
              <h3 className="text-base font-serif font-bold text-[#1E221B]">
                Apply for Membership in {selectedFpo.name}
              </h3>
              <p className="text-xs text-[#5D6352] leading-relaxed">
                Joining enables you to commit harvests directly for collective lot aggregation, professional weighing, and guaranteed direct payments.
              </p>

              {requestSuccess ? (
                <div className="p-4 rounded bg-[#EDF3ED] border border-[#C8D9C8] text-[#233D22] text-xs text-center space-y-2">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-[#233D22]" />
                  <p className="font-semibold">Application Submitted to {selectedFpo.name}</p>
                  <p className="text-[11px] text-[#5D6352]">
                    The FPO administration has received your application and will review your membership details.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedFpo(null);
                      setRequestSuccess(false);
                    }}
                    className="mt-2 text-xs bg-[#233D22] text-white rounded"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  {requestError && (
                    <div className="p-3 bg-[#FDF2F2] border border-[#D98282] text-[#8C2323] text-xs rounded flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{requestError}</span>
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <label className="font-medium text-[#1E221B]">
                      Cooperative Share Capital (INR)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={shareCapital}
                      onChange={(e) => setShareCapital(Number(e.target.value))}
                      className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                    />
                    <p className="text-[10px] text-[#5D6352]">
                      Contributed share capital as required by cooperative regulations (e.g. ₹1,000).
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#DFD8CB]">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedFpo(null)}
                      className="text-xs border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={joinMutation.isPending}
                      onClick={() => joinMutation.mutate()}
                      className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs font-semibold rounded"
                    >
                      {joinMutation.isPending ? 'Submitting...' : 'Confirm Application'}
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
