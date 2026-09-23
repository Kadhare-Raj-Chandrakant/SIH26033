'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllFposForAdmin, verifyFpoByAdmin, FpoOrganization } from '@/lib/api/fpo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Building2,
  CheckCircle2,
  XCircle,
  MapPin,
  Search,
  AlertCircle,
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
    <div className="space-y-6 max-w-6xl">
      <div className="border-b border-[#DFD8CB] pb-4">
        <h1 className="text-2xl font-serif font-bold text-[#1E221B] flex items-center gap-2">
          <Building2 className="h-5 w-5 text-[#233D22]" />
          <span>FPO Accreditation & Verification</span>
        </h1>
        <p className="text-xs text-[#5D6352] mt-0.5">
          Review legal incorporation certificates, registered bank accounts, and geographic districts to approve institutional trading credentials.
        </p>
      </div>

      {actionError && (
        <div className="p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 text-[#9A3412] text-xs rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3 bg-[#233D22]/10 border border-[#233D22]/20 text-[#233D22] text-xs rounded flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md p-3.5 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-[#F7F5EE] rounded border border-[#DFD8CB] text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter('PENDING_VERIFICATION')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              statusFilter === 'PENDING_VERIFICATION'
                ? 'bg-[#BD8728] text-[#F7F5EE]'
                : 'text-[#5D6352] hover:text-[#1E221B]'
            }`}
          >
            Pending Review
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              statusFilter === 'ACTIVE'
                ? 'bg-[#233D22] text-[#F7F5EE]'
                : 'text-[#5D6352] hover:text-[#1E221B]'
            }`}
          >
            Active & Verified
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-[#F4F0E6] text-[#1E221B] font-bold border border-[#DFD8CB]'
                : 'text-[#5D6352] hover:text-[#1E221B]'
            }`}
          >
            All Collectives
          </button>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5D6352]" />
          <Input
            placeholder="Search by name, reg no, district..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B] rounded focus:border-[#233D22]"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="p-10 border border-[#DFD8CB] rounded-md bg-[#FCFAF6] text-center text-xs text-[#5D6352]">
          Loading cooperative accreditation records...
        </div>
      ) : filteredFpos.length === 0 ? (
        <div className="p-8 text-center border border-[#DFD8CB] bg-[#FCFAF6] rounded-md">
          <Building2 className="mx-auto h-8 w-8 text-[#5D6352]/40 mb-2" />
          <p className="text-xs font-semibold text-[#1E221B]">No FPO organizations found matching filter</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-[#DFD8CB] bg-[#FCFAF6]">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#DFD8CB] bg-[#F4F0E6] font-bold text-[10px] text-[#5D6352] uppercase tracking-wider">
                <th className="p-3">FPO Organization</th>
                <th className="p-3">Reg Number</th>
                <th className="p-3">Legal Model</th>
                <th className="p-3">District & State</th>
                <th className="p-3">Official Contact</th>
                <th className="p-3">Escrow Bank</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DFD8CB] text-[#1E221B]">
              {filteredFpos.map((fpo) => (
                <tr key={fpo.id} className="hover:bg-[#F4F0E6]/50 transition-colors">
                  <td className="p-3 font-semibold text-[#1E221B]">
                    {fpo.name}
                  </td>
                  <td className="p-3 font-mono text-[#5D6352]">
                    {fpo.registrationNumber}
                  </td>
                  <td className="p-3 capitalize text-[#5D6352]">
                    {fpo.legalStructure.replace(/_/g, ' ').toLowerCase()}
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-[#1E221B]">
                      <MapPin className="h-3 w-3 text-[#233D22] shrink-0" />
                      <span>{fpo.district}, {fpo.state}</span>
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="block truncate max-w-[120px] text-[#1E221B]">{fpo.contactEmail}</span>
                    <span className="font-mono text-[11px] text-[#5D6352]">{fpo.contactPhone}</span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-[#5D6352]">
                    {fpo.bankName ? (
                      <span>{fpo.bankName} ({fpo.ifscCode || 'IFSC'})</span>
                    ) : (
                      <span className="text-[#8A8E82]">Pending</span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        fpo.status === 'ACTIVE'
                          ? 'border-[#233D22]/30 bg-[#233D22]/10 text-[#233D22]'
                          : fpo.status === 'PENDING_VERIFICATION'
                          ? 'border-[#BD8728]/30 bg-[#BD8728]/10 text-[#BD8728]'
                          : 'border-[#9A3412]/30 bg-[#9A3412]/10 text-[#9A3412]'
                      }`}
                    >
                      {fpo.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {fpo.status !== 'ACTIVE' && (
                        <button
                          disabled={verifyMutation.isPending}
                          onClick={() =>
                            verifyMutation.mutate({
                              id: fpo.id,
                              status: 'ACTIVE',
                              reason: 'Registration documents approved by administrator',
                            })
                          }
                          className="px-2 py-1 bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] text-[11px] font-semibold rounded inline-flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Approve</span>
                        </button>
                      )}
                      {fpo.status !== 'REJECTED' && (
                        <button
                          disabled={verifyMutation.isPending}
                          onClick={() => setRejectionModalFpoId(fpo.id)}
                          className="px-2 py-1 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#9A3412] border border-[#DFD8CB] text-[11px] font-semibold rounded inline-flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Decline</span>
                        </button>
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
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-[#FCFAF6] border border-[#DFD8CB] rounded-md max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-serif font-bold text-[#1E221B]">Decline Cooperative Accreditation</h3>
            <p className="text-xs text-[#5D6352]">
              Provide an official rationale explaining why this collective accreditation is being declined.
            </p>
            <Input
              placeholder="e.g. Invalid CIN / Registration number not found on ROC portal"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB] text-[#1E221B] rounded focus:border-[#233D22]"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DFD8CB]">
              <button
                type="button"
                onClick={() => setRejectionModalFpoId(null)}
                className="px-3.5 py-1.5 bg-[#F4F0E6] hover:bg-[#EFE9DC] text-[#1E221B] border border-[#DFD8CB] text-xs font-semibold rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={verifyMutation.isPending}
                onClick={() =>
                  verifyMutation.mutate({
                    id: rejectionModalFpoId,
                    status: 'REJECTED',
                    reason: rejectionReason || 'Failed verification checks',
                  })
                }
                className="px-4 py-1.5 bg-[#9A3412] hover:bg-[#7c2d12] text-white text-xs font-semibold rounded transition-colors"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
