'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyOrganization,
  fetchFpoMembers,
  approveFpoMembership,
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
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Search,
  AlertCircle,
  Building2,
  Mail,
  Phone,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

export default function FpoMembersManagementPage() {
  return (
    <RoleGuard allowedRoles={['FPO', 'ADMIN']}>
      <FpoMembersContent />
    </RoleGuard>
  );
}

function FpoMembersContent() {
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [rejectingMemberId, setRejectingMemberId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: myFpo, isLoading: loadingFpo } = useQuery({
    queryKey: ['my-fpo-org', token],
    queryFn: () => fetchMyOrganization(token || undefined),
    enabled: !!token,
  });

  const { data: rawMembers = [], isLoading: loadingMembers } = useQuery({
    queryKey: ['fpo-members', myFpo?.id, token],
    queryFn: () => fetchFpoMembers(myFpo!.id, undefined, token || undefined),
    enabled: !!myFpo?.id && !!token,
  });
  const members: FpoMembership[] = Array.isArray(rawMembers)
    ? rawMembers
    : Array.isArray((rawMembers as any)?.data)
    ? (rawMembers as any).data
    : [];

  const approveMutation = useMutation({
    mutationFn: ({ id, approve, reason }: { id: string; approve: boolean; reason?: string }) =>
      approveFpoMembership(id, approve, reason, token || undefined),
    onSuccess: () => {
      setActionError(null);
      setRejectingMemberId(null);
      setRejectionReason('');
      queryClient.invalidateQueries({ queryKey: ['fpo-members'] });
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
        <div className="container mx-auto px-4 py-12 max-w-5xl space-y-4">
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

  const safeMembers = Array.isArray(members) ? members : [];
  const pendingMembers = safeMembers.filter((m) => m.status === 'PENDING');
  const approvedMembers = safeMembers.filter((m) => m.status === 'APPROVED');

  const filteredMembers = safeMembers.filter((m) => {
    if (selectedTab === 'PENDING' && m.status !== 'PENDING') return false;
    if (selectedTab === 'APPROVED' && m.status !== 'APPROVED') return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const emailMatch = m.farmer?.email?.toLowerCase().includes(q);
      const phoneMatch = m.farmer?.mobile?.includes(q);
      const farmMatch = m.farmer?.sellerProfile?.farmLocation?.toLowerCase().includes(q);
      return emailMatch || phoneMatch || farmMatch;
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl space-y-8">
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
                Farmer Member Management
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {myFpo.name} — Review incoming membership applications and manage active member roster.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs px-3 py-1">
                {approvedMembers.length} Active Members
              </Badge>
              {pendingMembers.length > 0 && (
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs px-3 py-1">
                  {pendingMembers.length} Pending Approval
                </Badge>
              )}
            </div>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Pending Approvals Callout Queue */}
        {pendingMembers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span>Pending Applications Requiring Approval ({pendingMembers.length})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pendingMembers.map((mem) => (
                <Card key={mem.id} className="p-4 border-amber-500/30 bg-amber-500/5 rounded-xl shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-sm text-foreground block">
                        {mem.farmer?.email}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        <span>{mem.farmer?.mobile || 'No phone'}</span>
                      </span>
                    </div>
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px]">
                      Pending Review
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center justify-between p-2 rounded-lg bg-background border border-border/40">
                    <span>Share Capital: <strong>₹{mem.shareCapital || 0}</strong></span>
                    <span>Applied: {new Date(mem.createdAt).toLocaleDateString()}</span>
                  </div>

                  {rejectingMemberId === mem.id ? (
                    <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
                      <Input
                        placeholder="State reason for rejecting application..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejectingMemberId(null)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={approveMutation.isPending}
                          onClick={() =>
                            approveMutation.mutate({
                              id: mem.id,
                              approve: false,
                              reason: rejectionReason,
                            })
                          }
                          className="h-7 text-xs"
                        >
                          Confirm Rejection
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectingMemberId(mem.id)}
                        className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        <span>Reject</span>
                      </Button>
                      <Button
                        size="sm"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate({ id: mem.id, approve: true })}
                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        <span>Approve Member</span>
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Master Member Roster */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-lg border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setSelectedTab('ALL')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedTab === 'ALL'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Members ({members.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('APPROVED')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedTab === 'APPROVED'
                    ? 'bg-background text-emerald-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Active ({approvedMembers.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedTab('PENDING')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  selectedTab === 'PENDING'
                    ? 'bg-background text-amber-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Pending ({pendingMembers.length})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          {loadingMembers ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <Card className="p-8 text-center border-border/70 rounded-xl">
              <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground">No member records found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Share your FPO profile link with local farmers to begin onboarding.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 font-semibold text-foreground">
                    <th className="p-3.5">Farmer Email</th>
                    <th className="p-3.5">Contact Phone</th>
                    <th className="p-3.5">Share Capital</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-muted-foreground">
                  {filteredMembers.map((mem) => (
                    <tr key={mem.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 font-medium text-foreground">
                        {mem.farmer?.email}
                      </td>
                      <td className="p-3.5 font-mono">
                        {mem.farmer?.mobile || '—'}
                      </td>
                      <td className="p-3.5 font-semibold text-emerald-600">
                        ₹{mem.shareCapital || 0}
                      </td>
                      <td className="p-3.5 text-[11px]">
                        {mem.joinedAt
                          ? new Date(mem.joinedAt).toLocaleDateString()
                          : new Date(mem.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
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
                          {mem.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        {mem.status === 'PENDING' ? (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: mem.id, approve: true })}
                            disabled={approveMutation.isPending}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            Approve
                          </Button>
                        ) : (
                          <span className="text-emerald-600 text-xs font-semibold">Active</span>
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
