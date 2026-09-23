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
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertCircle,
  Phone,
  Loader2,
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
      <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B]">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-16 text-center max-w-5xl">
          <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
          <p className="text-xs text-[#5D6352]">Loading cooperative members...</p>
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
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B] font-sans">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl space-y-8">
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
                Farmer Member Management
              </h1>
              <p className="text-xs sm:text-sm text-[#5D6352] mt-1">
                {myFpo.name}: Review incoming membership applications and maintain active cooperative member register.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22] text-xs px-3 py-1 rounded">
                {approvedMembers.length} Active Members
              </Badge>
              {pendingMembers.length > 0 && (
                <Badge variant="outline" className="border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818] text-xs px-3 py-1 rounded">
                  {pendingMembers.length} Pending Approval
                </Badge>
              )}
            </div>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-[#FDF2F2] border border-[#D98282] text-[#8C2323] text-xs rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Pending Approvals Callout Queue */}
        {pendingMembers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs uppercase tracking-wider font-bold text-[#1E221B] flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#9A6818]" />
              <span>Pending Applications Requiring Approval ({pendingMembers.length})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pendingMembers.map((mem) => (
                <Card key={mem.id} className="p-4 border border-[#E8DEC8] bg-[#FCFAF6] rounded-lg space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-serif font-bold text-sm text-[#1E221B] block">
                        {mem.farmer?.email}
                      </span>
                      <span className="text-xs text-[#5D6352] flex items-center gap-1 mt-0.5">
                        <Phone className="h-3 w-3 text-[#3B532B]" />
                        <span>{mem.farmer?.mobile || 'No phone'}</span>
                      </span>
                    </div>
                    <Badge variant="outline" className="border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818] text-[10px] rounded">
                      Pending Review
                    </Badge>
                  </div>

                  <div className="text-xs text-[#5D6352] flex items-center justify-between p-2 rounded bg-[#F7F5EE] border border-[#DFD8CB]">
                    <span>Share Capital: <strong className="text-[#1E221B]">₹{mem.shareCapital || 0}</strong></span>
                    <span>Applied: {new Date(mem.createdAt).toLocaleDateString('en-IN')}</span>
                  </div>

                  {rejectingMemberId === mem.id ? (
                    <div className="space-y-2 pt-2 border-t border-[#DFD8CB] text-xs">
                      <Input
                        placeholder="State reason for rejecting application..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="h-8 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRejectingMemberId(null)}
                          className="h-7 text-xs text-[#5D6352]"
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={approveMutation.isPending}
                          onClick={() =>
                            approveMutation.mutate({
                              id: mem.id,
                              approve: false,
                              reason: rejectionReason,
                            })
                          }
                          className="h-7 text-xs border-[#D98282] bg-[#FDF2F2] text-[#8C2323] hover:bg-[#F9DDDD] rounded"
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
                        className="h-8 text-xs text-[#8C2323] border-[#D98282] hover:bg-[#FDF2F2] rounded"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        <span>Reject</span>
                      </Button>
                      <Button
                        size="sm"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate({ id: mem.id, approve: true })}
                        className="h-8 text-xs bg-[#233D22] hover:bg-[#1a2d19] text-white font-semibold rounded"
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
            <div className="flex items-center gap-1 text-xs">
              {[
                { key: 'ALL', label: `All Members (${members.length})` },
                { key: 'APPROVED', label: `Active (${approvedMembers.length})` },
                { key: 'PENDING', label: `Pending (${pendingMembers.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedTab(tab.key as any)}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors border ${
                    selectedTab === tab.key
                      ? 'bg-[#233D22] text-white border-[#233D22]'
                      : 'bg-[#FCFAF6] text-[#5D6352] border-[#DFD8CB] hover:text-[#1E221B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5D6352]" />
              <Input
                placeholder="Search by email or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-[#FCFAF6] border-[#DFD8CB]"
              />
            </div>
          </div>

          {loadingMembers ? (
            <div className="p-8 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
              <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
              <p className="text-xs text-[#5D6352]">Loading member records...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <Card className="p-8 text-center border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
              <Users className="mx-auto h-10 w-10 text-[#8C867A] mb-2" />
              <p className="text-sm font-serif font-bold text-[#1E221B]">No member records found</p>
              <p className="text-xs text-[#5D6352] mt-1">
                Share your FPO profile link with local farmers to begin onboarding.
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-[#DFD8CB] bg-[#FCFAF6]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DFD8CB] bg-[#F7F5EE] font-semibold text-[#1E221B]">
                    <th className="p-3.5">Farmer Email</th>
                    <th className="p-3.5">Contact Phone</th>
                    <th className="p-3.5">Share Capital</th>
                    <th className="p-3.5">Joined Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DFD8CB] text-[#5D6352]">
                  {filteredMembers.map((mem) => (
                    <tr key={mem.id} className="hover:bg-[#F7F5EE] transition-colors">
                      <td className="p-3.5 font-medium text-[#1E221B]">
                        {mem.farmer?.email}
                      </td>
                      <td className="p-3.5 font-mono">
                        {mem.farmer?.mobile || 'N/A'}
                      </td>
                      <td className="p-3.5 font-semibold text-[#233D22]">
                        ₹{mem.shareCapital || 0}
                      </td>
                      <td className="p-3.5 text-[11px]">
                        {mem.joinedAt
                          ? new Date(mem.joinedAt).toLocaleDateString('en-IN')
                          : new Date(mem.createdAt).toLocaleDateString('en-IN')}
                      </td>
                      <td className="p-3.5">
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
                          {mem.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right">
                        {mem.status === 'PENDING' ? (
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ id: mem.id, approve: true })}
                            disabled={approveMutation.isPending}
                            className="h-7 text-xs bg-[#233D22] hover:bg-[#1a2d19] text-white rounded"
                          >
                            Approve
                          </Button>
                        ) : (
                          <span className="text-[#233D22] text-xs font-semibold">Active Member</span>
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
