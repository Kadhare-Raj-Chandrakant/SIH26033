'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchFpoById, requestFpoMembership } from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Users,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  AlertCircle,
  Landmark,
  Calendar,
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
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
        <Link
          href="/fpo"
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 mb-4"
        >
          ← Back to FPO Directory
        </Link>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-64 col-span-2 rounded-xl" />
              <Skeleton className="h-64 rounded-xl" />
            </div>
          </div>
        ) : isError || !fpo ? (
          <div className="text-center py-16 bg-destructive/5 border border-destructive/20 rounded-2xl p-8">
            <p className="text-destructive font-semibold">Failed to load FPO profile</p>
            <p className="text-xs text-muted-foreground mt-1">{(error as Error)?.message || 'Organization not found'}</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={
                        fpo.status === 'ACTIVE'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      <span>{fpo.status.replace('_', ' ')}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      Reg: {fpo.registrationNumber}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    {fpo.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{fpo.address}, {fpo.district}, {fpo.state} - {fpo.pincode}</span>
                  </p>
                </div>

                {isFarmer && (
                  <Button
                    onClick={() => setShowJoinModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-md shadow-emerald-600/20"
                  >
                    <Users className="h-4 w-4" />
                    <span>Join This FPO</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="p-4 border-border/70 bg-card/60">
                <span className="text-[11px] text-muted-foreground block">Approved Farmers</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">
                  {fpo.memberCount || 0}
                </span>
              </Card>
              <Card className="p-4 border-border/70 bg-card/60">
                <span className="text-[11px] text-muted-foreground block">Legal Structure</span>
                <span className="text-sm font-bold text-foreground mt-2 block capitalize">
                  {fpo.legalStructure.replace(/_/g, ' ').toLowerCase()}
                </span>
              </Card>
              <Card className="p-4 border-border/70 bg-card/60">
                <span className="text-[11px] text-muted-foreground block">Total Batches Aggregated</span>
                <span className="text-2xl font-black text-foreground mt-1 block">
                  {fpo.totalBatchesCount || 0}
                </span>
              </Card>
              <Card className="p-4 border-border/70 bg-card/60">
                <span className="text-[11px] text-muted-foreground block">Harvest Commitments</span>
                <span className="text-2xl font-black text-foreground mt-1 block">
                  {fpo.totalListingsCount || 0}
                </span>
              </Card>
            </div>

            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left 2 Cols: Details */}
              <div className="md:col-span-2 space-y-6">
                <Card className="border-border/80 bg-card rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold text-foreground">
                      About the Organisation
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs leading-relaxed text-muted-foreground">
                    <p>
                      {fpo.description ||
                        'This Farmer Producer Organisation pools agricultural harvest from local member smallholders to guarantee fair wholesale farmgate pricing, standardized scientific grading, and streamlined access to institutional buyers.'}
                    </p>

                    {fpo.activeCommodities && fpo.activeCommodities.length > 0 && (
                      <div className="pt-3 border-t border-border/60">
                        <span className="font-semibold text-foreground block mb-2">
                          Active Produce & Crop Focus:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {fpo.activeCommodities.map((crop) => (
                            <Badge key={crop} variant="secondary" className="text-xs">
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
                  <Card className="border-emerald-500/30 bg-emerald-500/5 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/20 shrink-0">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-foreground">
                          Are you farming in {fpo.district}?
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          By joining {fpo.name}, your harvest can be aggregated with fellow farmers to fulfill large-scale buyer orders, eliminating middleman cuts and securing proportional escrow settlements.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setShowJoinModal(true)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold mt-2"
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
                <Card className="border-border/80 bg-card rounded-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      <span>Contact & Representation</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{fpo.contactPhone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{fpo.contactEmail}</span>
                    </div>
                    {fpo.bankName && (
                      <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t border-border/50">
                        <Landmark className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Escrow: {fpo.bankName}</span>
                      </div>
                    )}
                    {fpo.registrationDate && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>Inc: {new Date(fpo.registrationDate).toLocaleDateString()}</span>
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
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-lg font-bold text-foreground">
                Join {fpo?.name}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Submit your application to become an accredited farmer member. Membership allows you to commit crops for collective aggregation.
              </p>

              {joinSuccess ? (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs text-center space-y-2">
                  <CheckCircle2 className="h-6 w-6 mx-auto" />
                  <p className="font-semibold">Application Submitted Successfully!</p>
                  <p className="text-[11px] text-muted-foreground">
                    The FPO administrator will review your application. You can view its status under <strong>My FPO Memberships</strong>.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinSuccess(false);
                    }}
                    className="mt-2 text-xs bg-emerald-600 text-white"
                  >
                    Close
                  </Button>
                </div>
              ) : (
                <>
                  {joinError && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}

                  <div className="space-y-1 text-xs">
                    <label className="font-medium text-foreground">
                      Contributed Member Share Capital (INR)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={shareCapital}
                      onChange={(e) => setShareCapital(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Nominal cooperative share capital specified in FPO bylaws (e.g. ₹500 - ₹2,000).
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowJoinModal(false)}
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
