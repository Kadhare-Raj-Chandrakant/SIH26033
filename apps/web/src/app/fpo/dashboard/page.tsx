'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchMyOrganization, fetchFpoDashboardStats } from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Building2,
  Users,
  Layers,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  PlusCircle,
  Scale,
  Loader2,
  Coins,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

export default function FpoDashboardPage() {
  return (
    <RoleGuard allowedRoles={['FPO', 'ADMIN']}>
      <FpoDashboardContent />
    </RoleGuard>
  );
}

function FpoDashboardContent() {
  const { user, token } = useAuth();

  const {
    data: myFpo,
    isLoading: loadingFpo,
  } = useQuery({
    queryKey: ['my-fpo-org', token],
    queryFn: () => fetchMyOrganization(token || undefined),
    enabled: !!token,
  });

  const {
    data: dashboardData,
  } = useQuery({
    queryKey: ['fpo-dashboard-stats', myFpo?.id, token],
    queryFn: () => fetchFpoDashboardStats(myFpo!.id, token || undefined),
    enabled: !!myFpo?.id && !!token,
  });

  if (loadingFpo) {
    return (
      <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B]">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-16 text-center max-w-5xl">
          <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
          <p className="text-xs text-[#5D6352]">Loading FPO collective dashboard...</p>
        </div>
      </div>
    );
  }

  if (!myFpo) {
    return (
      <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B] flex flex-col font-sans">
        <MarketplaceNavbar />
        <main className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-4 flex-1">
          <div className="p-4 rounded-lg bg-[#EDF3ED] border border-[#C8D9C8] inline-block text-[#233D22] mb-2">
            <Building2 className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-[#1E221B]">No FPO Registered Under Your Account</h1>
          <p className="text-xs sm:text-sm text-[#5D6352] max-w-md mx-auto">
            You are authenticated with an FPO user account, but have not registered your cooperative entity yet. Register your legal structure to access aggregation tools, member approvals, and buyer matching.
          </p>
          <Link href="/fpo/register">
            <Button className="bg-[#233D22] hover:bg-[#1a2d19] text-white gap-2 text-xs font-semibold mt-4 rounded-md h-9 px-5">
              <PlusCircle className="h-4 w-4" />
              <span>Register Your FPO Now</span>
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const stats = dashboardData?.stats || {
    activeMembers: myFpo.memberCount || 0,
    pendingMembers: 0,
    committedQuintals: 0,
    openBatches: 0,
    matchedOrders: 0,
    totalDistributedAmount: 0,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B] font-sans">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl space-y-8">
        {/* FPO Hero Header */}
        <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`text-[10px] rounded ${
                    myFpo.status === 'ACTIVE'
                      ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                      : 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                  }`}
                >
                  {myFpo.status === 'ACTIVE' ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  <span>{myFpo.status.replace(/_/g, ' ')}</span>
                </Badge>
                <span className="text-xs text-[#5D6352] font-mono">
                  CIN/Reg: {myFpo.registrationNumber}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
                {myFpo.name}
              </h1>
              <p className="text-xs text-[#5D6352]">
                Operational Hub: {myFpo.district}, {myFpo.state} ({myFpo.legalStructure.replace(/_/g, ' ')})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href={`/fpo/${myFpo.id}`}>
                <Button variant="outline" size="sm" className="text-xs border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] rounded-md h-8">
                  Public Profile
                </Button>
              </Link>
              <Link href="/fpo/dashboard/aggregation">
                <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs gap-1.5 rounded-md h-8">
                  <Scale className="h-3.5 w-3.5" />
                  <span>Match Lots to Buyers</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Operational Notice if Pending Accreditation */}
        {myFpo.status === 'PENDING_VERIFICATION' && (
          <div className="p-4 rounded-md border border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818] text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 shrink-0" />
              <span>
                Your FPO registration is currently <strong>PENDING VERIFICATION</strong> by exchange compliance. You can organize member batches; institutional contract matching activates upon verification.
              </span>
            </div>
          </div>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link href="/fpo/dashboard/members">
            <Card className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F2EFE8] transition-colors rounded-lg">
              <div className="flex items-center justify-between text-[#5D6352] mb-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold">Farmer Members</span>
                <Users className="h-4 w-4 text-[#233D22]" />
              </div>
              <span className="text-2xl font-serif font-bold text-[#1E221B]">{stats.activeMembers}</span>
              {stats.pendingMembers > 0 && (
                <span className="text-[10px] text-[#9A6818] block mt-1">
                  +{stats.pendingMembers} pending
                </span>
              )}
            </Card>
          </Link>

          <Link href="/fpo/dashboard/listings">
            <Card className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F2EFE8] transition-colors rounded-lg">
              <div className="flex items-center justify-between text-[#5D6352] mb-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold">Committed Produce</span>
                <Layers className="h-4 w-4 text-[#233D22]" />
              </div>
              <span className="text-2xl font-serif font-bold text-[#233D22]">
                {stats.committedQuintals} Q
              </span>
              <span className="text-[10px] text-[#5D6352] block mt-1">
                Ready for pooling
              </span>
            </Card>
          </Link>

          <Link href="/fpo/dashboard/aggregation">
            <Card className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F2EFE8] transition-colors rounded-lg">
              <div className="flex items-center justify-between text-[#5D6352] mb-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold">Active Batches</span>
                <Package className="h-4 w-4 text-[#233D22]" />
              </div>
              <span className="text-2xl font-serif font-bold text-[#1E221B]">{stats.openBatches}</span>
              <span className="text-[10px] text-[#5D6352] block mt-1">
                Open & Sealed lots
              </span>
            </Card>
          </Link>

          <Link href="/seller/orders">
            <Card className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F2EFE8] transition-colors rounded-lg">
              <div className="flex items-center justify-between text-[#5D6352] mb-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold">Dispatched Orders</span>
                <Truck className="h-4 w-4 text-[#233D22]" />
              </div>
              <span className="text-2xl font-serif font-bold text-[#1E221B]">{stats.matchedOrders}</span>
              <span className="text-[10px] text-[#5D6352] block mt-1">
                Consignments
              </span>
            </Card>
          </Link>

          <Link href="/fpo/dashboard/settlements">
            <Card className="p-4 border border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F2EFE8] transition-colors rounded-lg col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-[#5D6352] mb-2">
                <span className="text-[10px] uppercase tracking-wider font-semibold">Settlements</span>
                <Coins className="h-4 w-4 text-[#233D22]" />
              </div>
              <span className="text-xl font-serif font-bold text-[#1E221B]">
                ₹{Number(stats.totalDistributedAmount).toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-[#233D22] block mt-1 font-semibold">
                Disbursed to members
              </span>
            </Card>
          </Link>
        </div>

        {/* Action Navigation Workflows */}
        <div className="space-y-4">
          <h2 className="text-sm uppercase tracking-wider font-bold text-[#1E221B]">
            FPO Cooperative Operational Workflows
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: Members */}
            <Link href="/fpo/dashboard/members">
              <Card className="p-5 border border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F2EFE8] transition-colors h-full flex flex-col justify-between rounded-lg">
                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-[#EDF3ED] text-[#233D22] w-fit border border-[#C8D9C8]">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-[#1E221B]">Member Management</h3>
                  <p className="text-xs text-[#5D6352] leading-relaxed">
                    Review and approve farmer membership requests. Verify share capital and maintain active cooperative member roster.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#233D22] inline-flex items-center gap-1 mt-4">
                  Manage Members →
                </span>
              </Card>
            </Link>

            {/* Tile 2: Farmer Listings */}
            <Link href="/fpo/dashboard/listings">
              <Card className="p-5 border border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F2EFE8] transition-colors h-full flex flex-col justify-between rounded-lg">
                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-[#EDF3ED] text-[#233D22] w-fit border border-[#C8D9C8]">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-[#1E221B]">Produce Commitments</h3>
                  <p className="text-xs text-[#5D6352] leading-relaxed">
                    Inspect smallholder harvest pledges, filter by commodity and quality grade, and group listings into commercial lots.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#233D22] inline-flex items-center gap-1 mt-4">
                  View Commitments →
                </span>
              </Card>
            </Link>

            {/* Tile 3: Aggregation & Matching */}
            <Link href="/fpo/dashboard/aggregation">
              <Card className="p-5 border border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F2EFE8] transition-colors h-full flex flex-col justify-between rounded-lg">
                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-[#EDF3ED] text-[#233D22] w-fit border border-[#C8D9C8]">
                    <Scale className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-[#1E221B]">Batch Matching Engine</h3>
                  <p className="text-xs text-[#5D6352] leading-relaxed">
                    Seal aggregated batches, inspect matched institutional buyer RFQs with coverage percentage, and execute contracts.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#233D22] inline-flex items-center gap-1 mt-4">
                  Aggregate & Match →
                </span>
              </Card>
            </Link>

            {/* Tile 4: Settlements */}
            <Link href="/fpo/dashboard/settlements">
              <Card className="p-5 border border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F2EFE8] transition-colors h-full flex flex-col justify-between rounded-lg">
                <div className="space-y-2">
                  <div className="p-2.5 rounded bg-[#EDF3ED] text-[#233D22] w-fit border border-[#C8D9C8]">
                    <Coins className="h-5 w-5" />
                  </div>
                  <h3 className="font-serif font-bold text-sm text-[#1E221B]">Settlement Distribution</h3>
                  <p className="text-xs text-[#5D6352] leading-relaxed">
                    Configure deductions (commission, freight, handling) and disburse net proceeds proportionally to member farmers.
                  </p>
                </div>
                <span className="text-xs font-semibold text-[#233D22] inline-flex items-center gap-1 mt-4">
                  Distribute Payouts →
                </span>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
