'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Building2,
  ShieldCheck,
  MapPin,
  Landmark,
  FileText,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { RoleGuard } from '@/components/auth/role-guard';
import { registerFpo } from '@/lib/api/fpo';

export default function FpoRegistrationPage() {
  return (
    <RoleGuard allowedRoles={['FPO', 'ADMIN']}>
      <FpoRegistrationContent />
    </RoleGuard>
  );
}

function FpoRegistrationContent() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    legalStructure: 'PRODUCER_COMPANY',
    registrationDate: '',
    state: '',
    district: '',
    address: '',
    pincode: '',
    contactEmail: user?.email || '',
    contactPhone: '',
    bankAccountNumber: '',
    ifscCode: '',
    bankName: '',
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim() || !formData.registrationNumber.trim()) {
      setErrorMessage('Please provide the official FPO name and registration number.');
      return;
    }

    if (!formData.state.trim() || !formData.district.trim() || !formData.address.trim()) {
      setErrorMessage('Please fill in complete office address details.');
      return;
    }

    if (!/^\d{6}$/.test(formData.pincode)) {
      setErrorMessage('Pincode must be exactly 6 digits.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(formData.contactPhone)) {
      setErrorMessage('Please provide a valid 10-digit Indian phone number.');
      return;
    }

    setIsSubmitting(true);
    try {
      await registerFpo(
        {
          ...formData,
          registrationDate: formData.registrationDate || undefined,
          bankAccountNumber: formData.bankAccountNumber || undefined,
          ifscCode: formData.ifscCode || undefined,
          bankName: formData.bankName || undefined,
          description: formData.description || undefined,
        },
        token || undefined,
      );

      setSuccess(true);
      setTimeout(() => {
        router.push('/fpo/dashboard');
      }, 2000);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B] font-sans">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-4xl">
        <div className="mb-6">
          <Link
            href="/fpo"
            className="text-xs font-semibold text-[#233D22] hover:underline inline-flex items-center gap-1 mb-2"
          >
            ← Back to FPO Directory
          </Link>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] tracking-tight">
            Register Farmer Producer Organisation
          </h1>
          <p className="text-xs sm:text-sm text-[#5D6352] mt-1">
            Submit your legal incorporation details for platform accreditation and wholesale aggregation authority.
          </p>
        </div>

        {success ? (
          <Card className="border border-[#C8D9C8] bg-[#FCFAF6] p-8 text-center rounded-lg">
            <CheckCircle2 className="mx-auto h-12 w-12 text-[#233D22] mb-3" />
            <h2 className="text-xl font-serif font-bold text-[#1E221B]">FPO Registration Submitted Successfully</h2>
            <p className="text-xs text-[#5D6352] mt-1 max-w-md mx-auto">
              Your organization has been registered with status <strong>PENDING VERIFICATION</strong>. You can now access your cooperative dashboard while exchange compliance verifies your legal incorporation certificate.
            </p>
            <p className="text-xs text-[#233D22] mt-4 font-semibold">
              Redirecting to your FPO Admin Dashboard...
            </p>
          </Card>
        ) : (
          <Card className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-lg">
            <CardHeader className="pb-4 border-b border-[#DFD8CB]">
              <CardTitle className="text-base font-serif font-bold text-[#1E221B] flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#233D22]" />
                <span>Organization & Legal Profile</span>
              </CardTitle>
              <CardDescription className="text-xs text-[#5D6352]">
                Ensure details match your incorporation certificate from the Ministry of Corporate Affairs or State Registrar of Cooperatives.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5">
              {errorMessage && (
                <div className="mb-6 p-3 bg-[#FDF2F2] border border-[#D98282] text-[#8C2323] text-xs rounded flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                {/* 1. Legal Entity Information */}
                <div className="space-y-3">
                  <h3 className="font-serif font-bold text-[#1E221B] text-sm flex items-center gap-1.5 border-b border-[#DFD8CB] pb-2">
                    <FileText className="h-4 w-4 text-[#233D22]" />
                    <span>Legal Entity Information</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">FPO Organization Name *</label>
                      <Input
                        required
                        placeholder="e.g. Sahyadri Agro Farmers Producer Co. Ltd."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Registration Number (CIN / Reg No.) *</label>
                      <Input
                        required
                        placeholder="e.g. U01409MH2023PTC123456"
                        value={formData.registrationNumber}
                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                        className="h-9 text-xs font-mono uppercase bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Legal Structure *</label>
                      <select
                        value={formData.legalStructure}
                        onChange={(e) => setFormData({ ...formData, legalStructure: e.target.value })}
                        className="w-full h-9 rounded-md border border-[#DFD8CB] bg-[#F7F5EE] px-3 text-xs text-[#1E221B] focus:outline-none"
                      >
                        <option value="PRODUCER_COMPANY">Producer Company (Companies Act)</option>
                        <option value="COOPERATIVE">Cooperative Society</option>
                        <option value="SECTION_8">Section 8 Non-Profit</option>
                        <option value="OTHER">Other Accredited Collective</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Incorporation / Registration Date</label>
                      <Input
                        type="date"
                        value={formData.registrationDate}
                        onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                        className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Registered Office & Geography */}
                <div className="space-y-3">
                  <h3 className="font-serif font-bold text-[#1E221B] text-sm flex items-center gap-1.5 border-b border-[#DFD8CB] pb-2">
                    <MapPin className="h-4 w-4 text-[#233D22]" />
                    <span>Registered Location & Operational Coverage</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">State *</label>
                      <Input
                        required
                        placeholder="e.g. Maharashtra"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">District *</label>
                      <Input
                        required
                        placeholder="e.g. Nashik"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Pincode *</label>
                      <Input
                        required
                        placeholder="e.g. 422209"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="h-9 text-xs font-mono bg-[#F7F5EE] border-[#DFD8CB]"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#1E221B]">Office Address Line *</label>
                    <Input
                      required
                      placeholder="e.g. Gat No. 102, Near APMC Market Yard, Dindori Road"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                    />
                  </div>
                </div>

                {/* 3. Official Contact Details */}
                <div className="space-y-3">
                  <h3 className="font-serif font-bold text-[#1E221B] text-sm flex items-center gap-1.5 border-b border-[#DFD8CB] pb-2">
                    <ShieldCheck className="h-4 w-4 text-[#233D22]" />
                    <span>Official Communications</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Official Email *</label>
                      <Input
                        type="email"
                        required
                        placeholder="contact@fpo.org"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Authorized Mobile Number *</label>
                      <Input
                        type="tel"
                        required
                        placeholder="9822000001"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        className="h-9 text-xs font-mono bg-[#F7F5EE] border-[#DFD8CB]"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-[#1E221B]">Description / Crop Focus</label>
                    <textarea
                      rows={3}
                      placeholder="Describe primary commodities aggregated (e.g. Tomato, Onion, Pomegranate), processing infrastructure, cold chain facilities..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-md border border-[#DFD8CB] bg-[#F7F5EE] p-2.5 text-xs text-[#1E221B] focus:outline-none"
                    />
                  </div>
                </div>

                {/* 4. Settlement Bank Details */}
                <div className="space-y-3">
                  <h3 className="font-serif font-bold text-[#1E221B] text-sm flex items-center gap-1.5 border-b border-[#DFD8CB] pb-2">
                    <Landmark className="h-4 w-4 text-[#233D22]" />
                    <span>FPO Settlement Escrow Bank Account</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Bank Name</label>
                      <Input
                        placeholder="e.g. Bank of Baroda"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="h-9 text-xs bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">Account Number</label>
                      <Input
                        placeholder="e.g. 50200012345678"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        className="h-9 text-xs font-mono bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-[#1E221B]">IFSC Code</label>
                      <Input
                        placeholder="e.g. BARB0NASHIK"
                        value={formData.ifscCode}
                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                        className="h-9 text-xs font-mono uppercase bg-[#F7F5EE] border-[#DFD8CB]"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-[#DFD8CB]">
                  <p className="text-[11px] text-[#5D6352]">
                    By submitting, you certify that all information submitted aligns with official government filings.
                  </p>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-[#233D22] hover:bg-[#1a2d19] text-white gap-2 font-semibold text-xs rounded-md h-9 px-5"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <>
                        <span>Submit FPO Registration</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
