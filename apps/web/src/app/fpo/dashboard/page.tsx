'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchMyOrganization, fetchFpoDashboardStats } from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  Users,
  Layers,
  Package,
  Truck,
  DollarSign,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock,
  PlusCircle,
  FileCheck,
  TrendingUp,
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
    isError: fpoError,
  } = useQuery({
    queryKey: ['my-fpo-org', token],
    queryFn: () => fetchMyOrganization(token || undefined),
    enabled: !!token,
  });

  const {
    data: dashboardData,
    isLoading: loadingStats,
  } = useQuery({
    queryKey: ['fpo-dashboard-stats', myFpo?.id, token],
    queryFn: () => fetchFpoDashboardStats(myFpo!.id, token || undefined),
    enabled: !!myFpo?.id && !!token,
  });

  if (loadingFpo) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-12 max-w-5xl space-y-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // If user doesn't have an FPO organization registered yet
  if (!myFpo) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceNavbar />
        <main className="container mx-auto px-4 py-16 max-w-2xl text-center space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 inline-block text-emerald-600 mb-2">
            <Building2 className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">No FPO Registered Under Your Account</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            You are authenticated with the FPO role, but have not registered your organization yet. Register your legal structure to access aggregation tools, member approvals, and buyer matching.
          </p>
          <Link href="/fpo/register">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold mt-4 shadow-md shadow-emerald-600/20">
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
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl space-y-8">
        {/* FPO Hero Header */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    myFpo.status === 'ACTIVE'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  }
                >
                  {myFpo.status === 'ACTIVE' ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  <span>{myFpo.status.replace(/_/g, ' ')}</span>
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  CIN/Reg: {myFpo.registrationNumber}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {myFpo.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                Operational Hub: {myFpo.district}, {myFpo.state} ({myFpo.legalStructure.replace(/_/g, ' ')})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link href={`/fpo/${myFpo.id}`}>
                <Button variant="outline" size="sm" className="text-xs">
                  Public Profile
                </Button>
              </Link>
              <Link href="/fpo/dashboard/aggregation">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Match Lots to Buyers</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Operational Warning if Pending Accreditation */}
        {myFpo.status === 'PENDING_VERIFICATION' && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-amber-600 shrink-0" />
              <span>
                Your FPO registration is currently <strong>PENDING VERIFICATION</strong> by platform administrators. You can create batches, but buyer matching will be activated upon accreditation.
              </span>
            </div>
          </div>
        )}

        {/* KPI Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Link href="/fpo/dashboard/members">
            <Card className="p-4 border-border/80 bg-card hover:border-emerald-500/40 transition-all cursor-pointer">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-[11px] font-medium">Farmer Members</span>
                <Users className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-foreground">{stats.activeMembers}</span>
              {stats.pendingMembers > 0 && (
                <span className="text-[10px] text-amber-600 block mt-1">
                  +{stats.pendingMembers} pending approval
                </span>
              )}
            </Card>
          </Link>

          <Link href="/fpo/dashboard/listings">
            <Card className="p-4 border-border/80 bg-card hover:border-emerald-500/40 transition-all cursor-pointer">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-[11px] font-medium">Committed Produce</span>
                <Layers className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-emerald-600">
                {stats.committedQuintals} Q
              </span>
              <span className="text-[10px] text-muted-foreground block mt-1">
                Ready for pooling
              </span>
            </Card>
          </Link>

          <Link href="/fpo/dashboard/aggregation">
            <Card className="p-4 border-border/80 bg-card hover:border-emerald-500/40 transition-all cursor-pointer">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-[11px] font-medium">Active Batches</span>
                <Package className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-foreground">{stats.openBatches}</span>
              <span className="text-[10px] text-muted-foreground block mt-1">
                Open & Sealed lots
              </span>
            </Card>
          </Link>

          <Link href="/seller/orders">
            <Card className="p-4 border-border/80 bg-card hover:border-emerald-500/40 transition-all cursor-pointer">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-[11px] font-medium">Dispatched Orders</span>
                <Truck className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-2xl font-black text-foreground">{stats.matchedOrders}</span>
              <span className="text-[10px] text-muted-foreground block mt-1">
                Fulfillment pipeline
              </span>
            </Card>
          </Link>

          <Link href="/fpo/dashboard/settlements">
            <Card className="p-4 border-border/80 bg-card hover:border-emerald-500/40 transition-all cursor-pointer col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-muted-foreground mb-2">
                <span className="text-[11px] font-medium">Disbursed Settlements</span>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-xl font-black text-foreground">
                ₹{Number(stats.totalDistributedAmount).toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">
                To member farmers
              </span>
            </Card>
          </Link>
        </div>

        {/* Quick Action Navigation Tiles */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-foreground">
            FPO Operational Workflows
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Tile 1: Members */}
            <Link href="/fpo/dashboard/members" className="group">
              <Card className="p-5 border-border/80 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all h-full flex flex-col justify-between rounded-xl">
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Users className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Member Management</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Review and approve farmer applications. Verify share capital and maintain active cooperative roster.
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-4">
                  Manage Members →
                </span>
              </Card>
            </Link>

            {/* Tile 2: Farmer Listings */}
            <Link href="/fpo/dashboard/listings" className="group">
              <Card className="p-5 border-border/80 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all h-full flex flex-col justify-between rounded-xl">
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Layers className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Produce Commitments</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    View member harvests, filter by commodity and grade, and select multiple listings to aggregate into lots.
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-4">
                  View Commitments →
                </span>
              </Card>
            </Link>

            {/* Tile 3: Aggregation & Matching */}
            <Link href="/fpo/dashboard/aggregation" className="group">
              <Card className="p-5 border-border/80 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all h-full flex flex-col justify-between rounded-xl">
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Batch Matching Engine</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Seal aggregated batches, inspect matched institutional buyer RFQs with coverage %, and create orders.
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-4">
                  Aggregate & Match →
                </span>
              </Card>
            </Link>

            {/* Tile 4: Settlements */}
            <Link href="/fpo/dashboard/settlements" className="group">
              <Card className="p-5 border-border/80 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all h-full flex flex-col justify-between rounded-xl">
                <div className="space-y-2">
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 w-fit group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">Settlement Distribution</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Configure deductions (commission, freight, handling) and disburse net proceeds proportionally to member farmers.
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-600 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1 mt-4">
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
