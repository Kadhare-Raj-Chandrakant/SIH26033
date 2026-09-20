'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllFposForAdmin, verifyFpoByAdmin, FpoOrganization } from '@/lib/api/fpo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Search,
  AlertCircle,
  Landmark,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';

export default function AdminFpoVerificationPage() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>('PENDING_VERIFICATION');
  const [search, setSearch] = useState('');
  const [rejectionModalFpoId, setRejectionModalFpoId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data: rawFpos = [], isLoading } = useQuery({
    queryKey: ['admin-fpos', statusFilter, token],
    queryFn: () =>
      fetchAllFposForAdmin(statusFilter !== 'ALL' ? statusFilter : undefined, token || undefined),
    enabled: !!token,
  });
  const fpos: FpoOrganization[] = Array.isArray(rawFpos)
    ? rawFpos
    : Array.isArray((rawFpos as any)?.data)
    ? (rawFpos as any).data
    : [];

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      verifyFpoByAdmin(id, status, reason, token || undefined),
    onSuccess: (updatedFpo) => {
      setActionError(null);
      setRejectionModalFpoId(null);
      setRejectionReason('');
      setActionSuccess(`FPO "${updatedFpo.name}" has been updated to ${updatedFpo.status}`);
      queryClient.invalidateQueries({ queryKey: ['admin-fpos'] });
      setTimeout(() => setActionSuccess(null), 4000);
    },
    onError: (err: Error) => {
      setActionError(err.message);
    },
  });

  const filteredFpos = (Array.isArray(fpos) ? fpos : []).filter((fpo) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      fpo.name.toLowerCase().includes(q) ||
      fpo.registrationNumber.toLowerCase().includes(q) ||
      fpo.district.toLowerCase().includes(q) ||
      fpo.state.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Building2 className="h-6 w-6 text-emerald-500" />
          <span>FPO Accreditation & Verification</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Review legal registration documents, bank accounts, and geographic coverage to approve or decline cooperative accreditation.
        </p>
      </div>

      {actionError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING_VERIFICATION')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              statusFilter === 'PENDING_VERIFICATION'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending Verification
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Active & Verified
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All FPOs
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search by name, reg no, district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-slate-200"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-900" />
          ))}
        </div>
      ) : filteredFpos.length === 0 ? (
        <Card className="p-8 text-center border-slate-800 bg-slate-900/60 rounded-xl">
          <Building2 className="mx-auto h-10 w-10 text-slate-700 mb-2" />
          <p className="text-sm font-semibold text-slate-200">No FPOs found</p>
          <p className="text-xs text-slate-500 mt-1">
            No records match the current verification status filter.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 font-semibold text-slate-300">
                <th className="p-3.5">FPO Organization</th>
                <th className="p-3.5">Reg Number</th>
                <th className="p-3.5">Legal Model</th>
                <th className="p-3.5">Location</th>
                <th className="p-3.5">Contact</th>
                <th className="p-3.5">Escrow Bank</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-400">
              {filteredFpos.map((fpo) => (
                <tr key={fpo.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3.5 font-bold text-slate-100">
                    {fpo.name}
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">
                    {fpo.registrationNumber}
                  </td>
                  <td className="p-3.5 capitalize">
                    {fpo.legalStructure.replace(/_/g, ' ').toLowerCase()}
                  </td>
                  <td className="p-3.5">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                      <span>{fpo.district}, {fpo.state}</span>
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className="block truncate max-w-[120px]">{fpo.contactEmail}</span>
                    <span className="font-mono text-[11px] text-slate-500">{fpo.contactPhone}</span>
                  </td>
                  <td className="p-3.5 font-mono text-[11px]">
                    {fpo.bankName ? (
                      <span>{fpo.bankName} ({fpo.ifscCode || 'IFSC'})</span>
                    ) : (
                      <span className="text-slate-600">Pending</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <Badge
                      variant="outline"
                      className={
                        fpo.status === 'ACTIVE'
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                          : fpo.status === 'PENDING_VERIFICATION'
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                            : 'border-red-500/30 bg-red-500/10 text-red-400'
                      }
                    >
                      {fpo.status.replace(/_/g, ' ')}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {fpo.status !== 'ACTIVE' && (
                        <Button
                          size="sm"
                          disabled={verifyMutation.isPending}
                          onClick={() =>
                            verifyMutation.mutate({
                              id: fpo.id,
                              status: 'ACTIVE',
                              reason: 'Registration documents approved by administrator',
                            })
                          }
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          <span>Activate</span>
                        </Button>
                      )}
                      {fpo.status !== 'REJECTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={verifyMutation.isPending}
                          onClick={() => setRejectionModalFpoId(fpo.id)}
                          className="h-7 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          <span>Reject</span>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Modal */}
      {rejectionModalFpoId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100">Reject FPO Application</h3>
            <p className="text-xs text-slate-400">
              Provide a rationale for why this organization accreditation is being declined.
            </p>
            <Input
              placeholder="e.g. Invalid CIN / Registration number not found on ROC portal"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="h-9 text-xs bg-slate-950 border-slate-800 text-slate-200"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRejectionModalFpoId(null)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={verifyMutation.isPending}
                onClick={() =>
                  verifyMutation.mutate({
                    id: rejectionModalFpoId,
                    status: 'REJECTED',
                    reason: rejectionReason || 'Failed verification checks',
                  })
                }
                className="text-xs"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
