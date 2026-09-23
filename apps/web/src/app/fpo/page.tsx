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
import {
  Users,
  Building2,
  MapPin,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Phone,
  PlusCircle,
  Loader2,
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
  const isBuyer = isAuthenticated && user?.role === 'BUYER';

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B] font-sans">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-6xl">
        {/* Header Hero Banner */}
        <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 sm:p-8 mb-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#C8D9C8] bg-[#EDF3ED] px-3 py-1 text-xs font-semibold text-[#233D22] mb-3">
              <Building2 className="h-3.5 w-3.5 text-[#3B532B]" />
              <span>Collective Agricultural Marketing & Aggregation</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-[#1E221B]">
              Farmer Producer Organisations (FPO) Directory
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#5D6352] leading-relaxed">
              Connect with accredited cooperatives and producer companies across India. Smallholders pool harvests for institutional scale, transparent grading, and guaranteed direct payments.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {isFpoAdmin && (
                <Link href="/fpo/dashboard">
                  <Button className="bg-[#233D22] hover:bg-[#1a2d19] text-white gap-2 text-xs rounded-md h-9">
                    <Building2 className="h-4 w-4" />
                    <span>My FPO Dashboard</span>
                  </Button>
                </Link>
              )}
              {isFarmer && (
                <Link href="/fpo/join">
                  <Button className="bg-[#233D22] hover:bg-[#1a2d19] text-white gap-2 text-xs rounded-md h-9">
                    <Users className="h-4 w-4" />
                    <span>Join an FPO Collective</span>
                  </Button>
                </Link>
              )}
              {!isBuyer && (
                <Link href="/fpo/register">
                  <Button variant="outline" className="border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] gap-2 text-xs hover:bg-[#EBE7DC] rounded-md h-9">
                    <PlusCircle className="h-4 w-4 text-[#233D22]" />
                    <span>Register New FPO</span>
                  </Button>
                </Link>
              )}
              <Link href="/fpo/buy-requests">
                <Button
                  variant="outline"
                  className="border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] hover:bg-[#EBE7DC] text-xs gap-1.5 rounded-md h-9"
                >
                  <span>Buyer Bulk Sourcing</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg p-4 mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[#5D6352]" />
            <Input
              placeholder="Search FPO by name or registration number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
            />
          </div>

          <div className="flex w-full md:w-auto items-center gap-2">
            <Input
              placeholder="Filter by State..."
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-1/2 md:w-44 h-10 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
            />
            <Input
              placeholder="Filter by District..."
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-1/2 md:w-44 h-10 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
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
                className="text-xs text-[#5D6352] hover:text-[#1E221B]"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="p-12 text-center bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-[#3B532B] mx-auto mb-2" />
            <p className="text-xs text-[#5D6352]">Loading accredited FPO directory...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-12 bg-[#FDF2F2] border border-[#D98282] rounded-lg p-8">
            <p className="text-[#8C2323] font-semibold text-sm">Failed to load FPO directory</p>
            <p className="text-xs text-[#5D6352] mt-1">{(error as Error)?.message}</p>
          </div>
        ) : !Array.isArray(fpos) || fpos.length === 0 ? (
          <div className="text-center py-16 bg-[#FCFAF6] border border-[#DFD8CB] rounded-lg p-8">
            <Building2 className="mx-auto h-12 w-12 text-[#8C867A] mb-3" />
            <h3 className="text-base font-serif font-bold text-[#1E221B]">No active FPOs found</h3>
            <p className="text-xs text-[#5D6352] mt-1 max-w-sm mx-auto">
              No Farmer Producer Organisations match your current filters. Register an accredited FPO to participate in bulk aggregation.
            </p>
            {!isBuyer ? (
              <Link href="/fpo/register" className="inline-block mt-4">
                <Button className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs rounded-md">
                  Register an FPO
                </Button>
              </Link>
            ) : (
              <Link href="/marketplace/sourcing" className="inline-block mt-4">
                <Button className="bg-[#233D22] hover:bg-[#1a2d19] text-white text-xs rounded-md">
                  Explore Bulk Sourcing
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(fpos) && fpos.map((fpo) => (
              <Card
                key={fpo.id}
                className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-serif font-bold text-[#1E221B] line-clamp-1">
                        {fpo.name}
                      </CardTitle>
                      <p className="text-[11px] text-[#5D6352] font-mono">
                        Reg: {fpo.registrationNumber}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] rounded ${
                        fpo.status === 'ACTIVE'
                          ? 'border-[#C8D9C8] bg-[#EDF3ED] text-[#233D22]'
                          : 'border-[#E8DEC8] bg-[#FAF6EC] text-[#9A6818]'
                      }`}
                    >
                      {fpo.status === 'ACTIVE' ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : (
                        <Clock className="h-3 w-3 mr-1" />
                      )}
                      <span>{fpo.status.replace('_', ' ')}</span>
                    </Badge>
                  </div>
                  <CardDescription className="text-xs flex items-center gap-1.5 text-[#5D6352] pt-1">
                    <MapPin className="h-3.5 w-3.5 text-[#3B532B] shrink-0" />
                    <span>{fpo.district}, {fpo.state}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 text-xs">
                  <p className="text-[#5D6352] line-clamp-2 leading-relaxed">
                    {fpo.description || 'Accredited agricultural cooperative enabling bulk harvest aggregation, collective warehousing, and direct institutional buyer contracts.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-[#F4F0E6] border border-[#E0D9CB]">
                    <div>
                      <span className="text-[10px] text-[#5D6352] block uppercase tracking-wider">Legal Entity</span>
                      <span className="font-semibold text-[#1E221B] capitalize">
                        {fpo.legalStructure.replace(/_/g, ' ').toLowerCase()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#5D6352] block uppercase tracking-wider">Member Farmers</span>
                      <span className="font-bold text-[#233D22]">
                        {fpo.memberCount || 0} Members
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#DFD8CB]">
                    <div className="flex items-center gap-2 text-[#5D6352] text-[11px]">
                      {fpo.contactPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-[#3B532B]" />
                          <span>{fpo.contactPhone}</span>
                        </span>
                      )}
                    </div>
                    <Link href={`/fpo/${fpo.id}`}>
                      <Button size="sm" className="bg-[#233D22] hover:bg-[#1a2d19] text-white gap-1 text-xs rounded-md h-8">
                        <span>Cooperative Profile</span>
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#5D6352] bg-[#F7F5EE]">Loading FPO directory...</div>}>
      <FpoDirectoryContent />
    </Suspense>
  );
}
