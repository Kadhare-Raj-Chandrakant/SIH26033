'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { fetchFpos, FpoOrganization } from '@/lib/api/fpo';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Building2,
  MapPin,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Layers,
  Phone,
  Mail,
  PlusCircle,
  Filter,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

function FpoDirectoryContent() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  const { data: rawFpos = [], isLoading, isError, error } = useQuery({
    queryKey: ['fpo-directory', search, stateFilter, districtFilter],
    queryFn: () =>
      fetchFpos({
        search: search.trim() || undefined,
        state: stateFilter.trim() || undefined,
        district: districtFilter.trim() || undefined,
      }),
  });
  const fpos: FpoOrganization[] = Array.isArray(rawFpos)
    ? rawFpos
    : Array.isArray((rawFpos as any)?.data)
    ? (rawFpos as any).data
    : [];

  const isFpoAdmin = isAuthenticated && user?.role === 'FPO';
  const isFarmer = isAuthenticated && user?.role === 'FARMER';

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-background to-emerald-500/5 p-6 sm:p-8 mb-8 shadow-sm">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Collective Agricultural Marketing</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Farmer Producer Organisations (FPO) Directory
            </h1>
            <p className="mt-2 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Connect with accredited cooperatives and producer companies across India. Smallholders pool harvests for institutional scale, transparent grading, and guaranteed direct payments.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {isFpoAdmin && (
                <Link href="/fpo/dashboard">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-sm shadow-sm shadow-emerald-600/20">
                    <Building2 className="h-4 w-4" />
                    <span>My FPO Dashboard</span>
                  </Button>
                </Link>
              )}
              {isFarmer && (
                <Link href="/fpo/join">
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-sm shadow-sm shadow-emerald-600/20">
                    <Users className="h-4 w-4" />
                    <span>Join an FPO</span>
                  </Button>
                </Link>
              )}
              <Link href="/fpo/register">
                <Button variant="outline" className="border-border/80 gap-2 text-sm hover:bg-muted">
                  <PlusCircle className="h-4 w-4 text-emerald-600" />
                  <span>Register New FPO</span>
                </Button>
              </Link>
              <Link href="/fpo/buy-requests">
                <Button variant="ghost" className="text-sm text-muted-foreground hover:text-foreground gap-1.5">
                  <span>Buyer Bulk Sourcing</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-card border border-border/70 rounded-xl p-4 mb-6 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search FPO by name or registration number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-sm"
            />
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <Input
              placeholder="Filter by State..."
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-1/2 md:w-44 h-10 text-sm"
            />
            <Input
              placeholder="Filter by District..."
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-1/2 md:w-44 h-10 text-sm"
            />
            {(search || stateFilter || districtFilter) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStateFilter('');
                  setDistrictFilter('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-5 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-9 w-full" />
              </Card>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-16 bg-destructive/5 border border-destructive/20 rounded-2xl p-8">
            <p className="text-destructive font-semibold">Failed to load FPO directory</p>
            <p className="text-xs text-muted-foreground mt-1">{(error as Error)?.message}</p>
          </div>
        ) : !Array.isArray(fpos) || fpos.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border/70 rounded-2xl p-8">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40 mb-3" />
            <h3 className="text-lg font-bold text-foreground">No active FPOs found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              No Farmer Producer Organisations match your current filters. Be the first to register an FPO in this region.
            </p>
            <Link href="/fpo/register" className="inline-block mt-4">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm">
                Register an FPO
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(fpos) && fpos.map((fpo) => (
              <Card
                key={fpo.id}
                className="border-border/80 bg-card hover:border-emerald-500/50 hover:shadow-md transition-all rounded-xl flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-bold text-foreground line-clamp-1">
                        {fpo.name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className="font-mono">{fpo.registrationNumber}</span>
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        fpo.status === 'ACTIVE'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      }
                    >
                      {fpo.status === 'ACTIVE' ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      <span>{fpo.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  <CardDescription className="text-xs flex items-center gap-1.5 text-muted-foreground pt-1">
                    <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{fpo.district}, {fpo.state}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">
                    {fpo.description || 'Verified agricultural cooperative enabling bulk aggregation, collective warehousing, and direct institutional buyer access.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/50 border border-border/40">
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Legal Model</span>
                      <span className="font-semibold text-foreground capitalize">
                        {fpo.legalStructure.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground block">Approved Members</span>
                      <span className="font-semibold text-emerald-600">
                        {fpo.memberCount || 0} Farmers
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      {fpo.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-emerald-600" />
                          <span>{fpo.contactPhone}</span>
                        </span>
                      )}
                    </div>
                    <Link href={`/fpo/${fpo.id}`}>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs">
                        <span>View Profile</span>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function FpoDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm">Loading FPO directory...</div>}>
      <FpoDirectoryContent />
    </Suspense>
  );
}
