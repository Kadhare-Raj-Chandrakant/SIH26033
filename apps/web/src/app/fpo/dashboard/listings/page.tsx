'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchMyOrganization,
  fetchFpoListings,
  createAggregationBatch,
  FpoListing,
} from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Layers,
  Search,
  Filter,
  Package,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  FileCheck,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';

export default function FpoListingsPage() {
  return (
    <RoleGuard allowedRoles={['FPO', 'ADMIN']}>
      <FpoListingsContent />
    </RoleGuard>
  );
}

function FpoListingsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const [search, setSearch] = useState('');
  const [commodityFilter, setCommodityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('COMMITTED');
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [qualityGrade, setQualityGrade] = useState('Grade A');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: myFpo, isLoading: loadingFpo } = useQuery({
    queryKey: ['my-fpo-org', token],
    queryFn: () => fetchMyOrganization(token || undefined),
    enabled: !!token,
  });

  const { data: rawListings = [], isLoading: loadingListings } = useQuery({
    queryKey: ['fpo-listings', myFpo?.id, statusFilter, commodityFilter, token],
    queryFn: () =>
      fetchFpoListings(
        myFpo!.id,
        {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          commodity: commodityFilter || undefined,
        },
        token || undefined,
      ),
    enabled: !!myFpo?.id && !!token,
  });
  const listings: FpoListing[] = Array.isArray(rawListings)
    ? rawListings
    : Array.isArray((rawListings as any)?.data)
    ? (rawListings as any).data
    : [];

  const batchMutation = useMutation({
    mutationFn: () => {
      if (selectedListingIds.length === 0) {
        throw new Error('Please select at least one committed listing to aggregate');
      }
      return createAggregationBatch(
        myFpo!.id,
        {
          listingIds: selectedListingIds,
          qualityGrade,
        },
        token || undefined,
      );
    },
    onSuccess: (batch) => {
      setSelectedListingIds([]);
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ['fpo-listings'] });
      queryClient.invalidateQueries({ queryKey: ['fpo-dashboard-stats'] });
      router.push('/fpo/dashboard/aggregation');
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const toggleSelect = (id: string) => {
    setSelectedListingIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const selectedListings = listings.filter((l) => selectedListingIds.includes(l.id));
  const selectedTotalQuintals = selectedListings.reduce(
    (acc, l) => acc + Number(l.quantityQuintals),
    0,
  );

  const selectAllCommitted = () => {
    const committed = listings.filter((l) => l.status === 'COMMITTED');
    if (selectedListingIds.length === committed.length) {
      setSelectedListingIds([]);
    } else {
      setSelectedListingIds(committed.map((l) => l.id));
    }
  };

  if (loadingFpo) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-12 max-w-6xl space-y-4">
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

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl space-y-6">
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
                Member Produce Commitments
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {myFpo.name} — Select individual farmer harvest records to bundle into a collective wholesale batch.
              </p>
            </div>
            <Link href="/fpo/dashboard/aggregation">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-border/80">
                <Package className="h-3.5 w-3.5 text-emerald-600" />
                <span>View Aggregated Batches</span>
              </Button>
            </Link>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Aggregation Selection Dock Bar (Visible when items selected) */}
        {selectedListingIds.length > 0 && (
          <div className="sticky top-20 z-30 p-4 rounded-xl border border-emerald-500/30 bg-card/95 backdrop-blur shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-3 text-xs">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <span className="font-bold text-foreground block text-sm">
                  {selectedListingIds.length} Listings Selected ({selectedTotalQuintals} Quintals)
                </span>
                <span className="text-muted-foreground text-[11px]">
                  Ready to be sealed into an institutional commercial batch
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={qualityGrade}
                onChange={(e) => setQualityGrade(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none"
              >
                <option value="Grade A">Grade A (Premium / Table)</option>
                <option value="Grade B">Grade B (Standard Commercial)</option>
                <option value="Grade C">Grade C (Industrial / Processing)</option>
              </select>

              <Button
                size="sm"
                disabled={batchMutation.isPending}
                onClick={() => batchMutation.mutate()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 gap-1.5 shadow-sm shadow-emerald-600/20"
              >
                {batchMutation.isPending ? 'Bundling...' : 'Create Batch Lot →'}
              </Button>
            </div>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="bg-card border border-border/70 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/60 rounded-lg border border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('COMMITTED')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  statusFilter === 'COMMITTED'
                    ? 'bg-background text-emerald-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Committed (Poolable)
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('AGGREGATED')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  statusFilter === 'AGGREGATED'
                    ? 'bg-background text-blue-600 shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                In Batch
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('SOLD')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  statusFilter === 'SOLD'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Sold
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
            </div>
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <Input
              placeholder="Filter by commodity (e.g. Tomato)..."
              value={commodityFilter}
              onChange={(e) => setCommodityFilter(e.target.value)}
              className="w-full md:w-56 h-9 text-xs"
            />
            {statusFilter === 'COMMITTED' && listings.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllCommitted}
                className="h-9 text-xs shrink-0"
              >
                {selectedListingIds.length === listings.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
        </div>

        {/* Listings Table */}
        {loadingListings ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <Card className="p-8 text-center border-border/70 rounded-xl">
            <Layers className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm font-semibold text-foreground">No produce commitments found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Member farmers have not committed produce under this filter yet.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-muted/40 font-semibold text-foreground">
                  <th className="p-3.5 w-12 text-center">Select</th>
                  <th className="p-3.5">Farmer Contact</th>
                  <th className="p-3.5">Commodity</th>
                  <th className="p-3.5">Committed Qty</th>
                  <th className="p-3.5">Quality Grade</th>
                  <th className="p-3.5">Harvest Date</th>
                  <th className="p-3.5">Batch Assignment</th>
                  <th className="p-3.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-muted-foreground">
                {Array.isArray(listings) && listings.map((l) => {
                  const isSelected = selectedListingIds.includes(l.id);
                  const isSelectable = l.status === 'COMMITTED';

                  return (
                    <tr
                      key={l.id}
                      onClick={() => isSelectable && toggleSelect(l.id)}
                      className={`transition-colors ${
                        isSelectable ? 'cursor-pointer hover:bg-muted/30' : 'opacity-70'
                      } ${isSelected ? 'bg-emerald-500/10' : ''}`}
                    >
                      <td className="p-3.5 text-center">
                        {isSelectable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(l.id);
                            }}
                            className="text-emerald-600 focus:outline-none"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground/60" />
                            )}
                          </button>
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-foreground block">
                          {l.farmer?.email}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {l.farmer?.mobile || 'No mobile'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-foreground">
                        {l.commodity}
                      </td>
                      <td className="p-3.5 font-black text-emerald-600">
                        {l.quantityQuintals} Quintals
                      </td>
                      <td className="p-3.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {l.qualityGrade || 'Grade A'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-[11px]">
                        {l.expectedHarvestDate
                          ? new Date(l.expectedHarvestDate).toLocaleDateString()
                          : 'Immediate'}
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        {l.batch ? (
                          <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                            {l.batch.batchNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <Badge
                          variant="outline"
                          className={
                            l.status === 'SOLD'
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : l.status === 'AGGREGATED'
                                ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          }
                        >
                          {l.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
