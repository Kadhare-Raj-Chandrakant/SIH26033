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
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Layers,
  Package,
  AlertCircle,
  CheckSquare,
  Square,
  Scale,
  Loader2,
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
    onSuccess: () => {
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
      <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B]">
        <MarketplaceNavbar />
        <div className="container mx-auto px-4 py-16 text-center max-w-6xl">
          <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
          <p className="text-xs text-[#5D6352]">Loading cooperative records...</p>
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

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B] font-sans">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl space-y-6">
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
                Member Produce Commitments
              </h1>
              <p className="text-xs sm:text-sm text-[#5D6352] mt-1">
                {myFpo.name}: Select individual farmer harvest records to bundle into a collective wholesale batch.
              </p>
            </div>
            <Link href="/fpo/dashboard/aggregation">
              <Button variant="outline" size="sm" className="text-xs gap-1.5 border-[#DFD8CB] bg-[#FCFAF6] text-[#1E221B] rounded-md h-9">
                <Package className="h-3.5 w-3.5 text-[#233D22]" />
                <span>View Aggregated Batches</span>
              </Button>
            </Link>
          </div>
        </div>

        {actionError && (
          <div className="p-3 bg-[#FDF2F2] border border-[#D98282] text-[#8C2323] text-xs rounded flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Aggregation Selection Dock Bar */}
        {selectedListingIds.length > 0 && (
          <div className="sticky top-20 z-30 p-4 rounded-lg border border-[#C8D9C8] bg-[#FCFAF6] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs">
              <div className="p-2 rounded bg-[#EDF3ED] text-[#233D22]">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <span className="font-serif font-bold text-[#1E221B] block text-sm">
                  {selectedListingIds.length} Listings Selected ({selectedTotalQuintals} Quintals)
                </span>
                <span className="text-[#5D6352] text-[11px]">
                  Ready to be bundled into an institutional commercial lot
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={qualityGrade}
                onChange={(e) => setQualityGrade(e.target.value)}
                className="h-9 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 text-xs text-[#1E221B] focus:outline-none"
              >
                <option value="Grade A">Grade A (Premium / Table)</option>
                <option value="Grade B">Grade B (Standard Commercial)</option>
                <option value="Grade C">Grade C (Industrial / Processing)</option>
              </select>

              <Button
                size="sm"
                disabled={batchMutation.isPending}
                onClick={() => batchMutation.mutate()}
                className="bg-[#233D22] hover:bg-[#1a2d19] text-white font-semibold text-xs h-9 gap-1.5 rounded-md"
              >
                {batchMutation.isPending ? 'Bundling...' : 'Create Batch Lot →'}
              </Button>
            </div>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 text-xs">
              {[
                { key: 'COMMITTED', label: 'Committed (Poolable)' },
                { key: 'AGGREGATED', label: 'In Batch' },
                { key: 'SOLD', label: 'Sold' },
                { key: 'ALL', label: 'All' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md font-semibold transition-colors border ${
                    statusFilter === tab.key
                      ? 'bg-[#233D22] text-white border-[#233D22]'
                      : 'bg-[#F7F5EE] text-[#5D6352] border-[#DFD8CB] hover:text-[#1E221B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <Input
              placeholder="Filter by commodity (e.g. Tomato)..."
              value={commodityFilter}
              onChange={(e) => setCommodityFilter(e.target.value)}
              className="w-full md:w-56 h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
            />
            {statusFilter === 'COMMITTED' && listings.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllCommitted}
                className="h-9 text-xs shrink-0 border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B]"
              >
                {selectedListingIds.length === listings.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>
        </div>

        {/* Listings Table */}
        {loadingListings ? (
          <div className="p-8 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
            <p className="text-xs text-[#5D6352]">Loading harvest commitments...</p>
          </div>
        ) : listings.length === 0 ? (
          <Card className="p-8 text-center border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
            <Layers className="mx-auto h-10 w-10 text-[#8C867A] mb-2" />
            <p className="text-sm font-serif font-bold text-[#1E221B]">No produce commitments found</p>
            <p className="text-xs text-[#5D6352] mt-1">
              Member farmers have not committed produce under this filter yet.
            </p>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#DFD8CB] bg-[#FCFAF6]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#DFD8CB] bg-[#F7F5EE] font-semibold text-[#1E221B]">
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
              <tbody className="divide-y divide-[#DFD8CB] text-[#5D6352]">
                {Array.isArray(listings) && listings.map((l) => {
                  const isSelected = selectedListingIds.includes(l.id);
                  const isSelectable = l.status === 'COMMITTED';

                  return (
                    <tr
                      key={l.id}
                      onClick={() => isSelectable && toggleSelect(l.id)}
                      className={`transition-colors ${
                        isSelectable ? 'cursor-pointer hover:bg-[#F7F5EE]' : 'opacity-70'
                      } ${isSelected ? 'bg-[#EDF3ED]' : ''}`}
                    >
                      <td className="p-3.5 text-center">
                        {isSelectable ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(l.id);
                            }}
                            className="text-[#233D22] focus:outline-none"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4" />
                            ) : (
                              <Square className="h-4 w-4 text-[#8C867A]" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[#8C867A]">-</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-[#1E221B] block">
                          {l.farmer?.email}
                        </span>
                        <span className="text-[11px] text-[#5D6352] font-mono">
                          {l.farmer?.mobile || 'No mobile'}
                        </span>
                      </td>
                      <td className="p-3.5 font-serif font-bold text-[#1E221B]">
                        {l.commodity}
                      </td>
                      <td className="p-3.5 font-bold text-[#233D22]">
                        {l.quantityQuintals} Quintals
                      </td>
                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px] bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B]">
                          {l.qualityGrade || 'Grade A'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-[11px]">
                        {l.expectedHarvestDate
                          ? new Date(l.expectedHarvestDate).toLocaleDateString('en-IN')
                          : 'Immediate'}
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">
                        {l.batch ? (
                          <span className="text-[#233D22] font-semibold">
                            {l.batch.batchNumber}
                          </span>
                        ) : (
                          <span className="text-[#8C867A] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <Badge
                          variant="outline"
                          className={`text-[10px] rounded ${
                            l.status === 'SOLD'
                              ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                              : l.status === 'AGGREGATED'
                              ? 'border-[#CADCE6] bg-[#EBF1F5] text-[#2C4E65]'
                              : 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                          }`}
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
