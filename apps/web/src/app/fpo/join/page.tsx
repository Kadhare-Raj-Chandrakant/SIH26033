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
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
  Sparkles,
  AlertCircle,
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

  // 1. Fetch current memberships
  const { data: myMembershipsData = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['my-fpo-memberships', token],
    queryFn: () => fetchFarmerMemberships(token || undefined),
    enabled: !!token,
  });
  const myMemberships: FpoMembership[] = Array.isArray(myMembershipsData)
    ? myMembershipsData
    : Array.isArray((myMembershipsData as any)?.data)
    ? (myMembershipsData as any).data
    : [];

  // 2. Fetch directory of active FPOs
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
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Farmer Producer Collaboration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Join a Farmer Producer Organisation
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse registered cooperatives in your state or district. Approved members can pool harvest into wholesale aggregation batches for institutional procurement.
          </p>
        </div>

        {/* Current Memberships Status Section */}
        {Array.isArray(myMemberships) && myMemberships.length > 0 && (
          <div className="mb-10 space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Your Existing FPO Memberships ({myMemberships.length})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {myMemberships.map((mem) => (
                <Card key={mem.id} className="p-4 border-border/80 bg-card rounded-xl shadow-sm">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm text-foreground line-clamp-1">
                      {mem.fpo?.name || 'FPO Organization'}
                    </h3>
                    <Badge
                      variant="outline"
                      className={
                        mem.status === 'APPROVED'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : mem.status === 'PENDING'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                            : 'border-destructive/30 bg-destructive/10 text-destructive'
                      }
                    >
                      {mem.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {mem.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                      {mem.status === 'REJECTED' && <XCircle className="h-3 w-3 mr-1" />}
                      <span>{mem.status}</span>
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{mem.fpo?.district}, {mem.fpo?.state}</span>
                  </p>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/50">
                    <span className="text-muted-foreground">
                      Share Capital: ₹{mem.shareCapital || 0}
                    </span>
                    {mem.status === 'APPROVED' && (
                      <Link href="/fpo/commit">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7">
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
            <h2 className="text-base font-bold text-foreground">
              Accredited FPOs Open for Member Enrollment
            </h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {loadingFpos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : !Array.isArray(fpos) || fpos.length === 0 ? (
            <Card className="p-8 text-center border-border/70">
              <Building2 className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground">No active FPOs found</p>
              <p className="text-xs text-muted-foreground mt-1">
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
                    className="p-5 border-border/80 bg-card rounded-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-bold text-sm text-foreground">{fpo.name}</h3>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {fpo.legalStructure.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <span>{fpo.district}, {fpo.state}</span>
                      </p>

                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                        {fpo.description || 'Verified agricultural cooperative supporting collective produce aggregation and wholesale trade.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-border/60">
                      <span className="text-xs font-medium text-emerald-600">
                        {fpo.memberCount || 0} active members
                      </span>

                      {status === 'APPROVED' ? (
                        <Badge className="bg-emerald-600 text-white text-xs">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          <span>Member</span>
                        </Badge>
                      ) : status === 'PENDING' ? (
                        <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs">
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
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-sm"
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
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-foreground">
                Apply for Membership in {selectedFpo.name}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Joining enables you to commit harvests directly for collective lot aggregation, professional weighing, and guaranteed direct payments.
              </p>

              {requestSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs text-center space-y-2">
                  <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-600" />
                  <p className="font-semibold">Application Submitted to {selectedFpo.name}!</p>
                  <p className="text-[11px] text-muted-foreground">
                    The FPO administration has received your application and will review your details.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedFpo(null);
                      setRequestSuccess(false);
                    }}
                    className="mt-2 text-xs bg-emerald-600 text-white"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <>
                  {requestError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{requestError}</span>
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <label className="font-medium text-foreground">
                      Cooperative Share Capital (INR)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={shareCapital}
                      onChange={(e) => setShareCapital(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Contributed share capital as required by cooperative regulations (e.g. ₹1,000).
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFpo(null)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      disabled={joinMutation.isPending}
                      onClick={() => joinMutation.mutate()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
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
