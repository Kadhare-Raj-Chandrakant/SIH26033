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
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { registerFpo } from '@/lib/api/fpo';

export default function FpoRegistrationPage() {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuth();

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
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      <MarketplaceNavbar />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-4xl">
        <div className="mb-6">
          <Link
            href="/fpo"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 mb-2"
          >
            ← Back to FPO Directory
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Register Your Farmer Producer Organisation
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Submit your legal incorporation details for platform accreditation and wholesale aggregation authority.
          </p>
        </div>

        {success ? (
          <Card className="border-emerald-500/30 bg-emerald-500/10 p-8 text-center rounded-2xl">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600 mb-3" />
            <h2 className="text-xl font-bold text-foreground">FPO Registration Submitted!</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              Your organization has been registered with status <strong>PENDING VERIFICATION</strong>. You can now access your dashboard while platform administrators verify your legal certificates.
            </p>
            <p className="text-xs text-emerald-600 mt-4 font-semibold">
              Redirecting to your FPO Admin Dashboard...
            </p>
          </Card>
        ) : (
          <Card className="border-border/80 bg-card rounded-2xl shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <span>Organization & Legal Profile</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Ensure details match your incorporation certificate from the Ministry of Corporate Affairs or State Registrar of Cooperatives.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {errorMessage && (
                <div className="mb-6 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6 text-xs">
                {/* 1. Legal Entity Information */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5 border-b border-border/50 pb-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span>Legal Entity Information</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">FPO Organization Name *</label>
                      <Input
                        required
                        placeholder="e.g. Sahyadri Agro Farmers Producer Co. Ltd."
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Registration Number (CIN / Reg No.) *</label>
                      <Input
                        required
                        placeholder="e.g. U01409MH2023PTC123456"
                        value={formData.registrationNumber}
                        onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                        className="h-9 text-xs font-mono uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Legal Structure *</label>
                      <select
                        value={formData.legalStructure}
                        onChange={(e) => setFormData({ ...formData, legalStructure: e.target.value })}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="PRODUCER_COMPANY">Producer Company (Companies Act)</option>
                        <option value="COOPERATIVE">Cooperative Society</option>
                        <option value="SECTION_8">Section 8 Non-Profit</option>
                        <option value="OTHER">Other Accredited Collective</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Incorporation / Registration Date</label>
                      <Input
                        type="date"
                        value={formData.registrationDate}
                        onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Registered Office & Geography */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5 border-b border-border/50 pb-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span>Registered Location & Operational Coverage</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">State *</label>
                      <Input
                        required
                        placeholder="e.g. Maharashtra"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">District *</label>
                      <Input
                        required
                        placeholder="e.g. Nashik"
                        value={formData.district}
                        onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Pincode *</label>
                      <Input
                        required
                        placeholder="e.g. 422209"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="h-9 text-xs font-mono"
                        maxLength={6}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Office Address Line *</label>
                    <Input
                      required
                      placeholder="e.g. Gat No. 102, Near APMC Market Yard, Dindori Road"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                {/* 3. Official Contact Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5 border-b border-border/50 pb-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Official Communications</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Official Email *</label>
                      <Input
                        type="email"
                        required
                        placeholder="contact@fpo.org"
                        value={formData.contactEmail}
                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Authorized Mobile Number *</label>
                      <Input
                        type="tel"
                        required
                        placeholder="9822000001"
                        value={formData.contactPhone}
                        onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                        className="h-9 text-xs font-mono"
                        maxLength={10}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-medium text-foreground">Description / Crop Focus</label>
                    <textarea
                      rows={3}
                      placeholder="Describe primary commodities aggregated (e.g. Tomato, Onion, Pomegranate), processing infrastructure, cold chain facilities..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* 4. Settlement Bank Details */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5 border-b border-border/50 pb-2">
                    <Landmark className="h-4 w-4 text-emerald-600" />
                    <span>FPO Settlement Escrow Bank Account</span>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Bank Name</label>
                      <Input
                        placeholder="e.g. Bank of Baroda"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">Account Number</label>
                      <Input
                        placeholder="e.g. 50200012345678"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        className="h-9 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-medium text-foreground">IFSC Code</label>
                      <Input
                        placeholder="e.g. BARB0NASHIK"
                        value={formData.ifscCode}
                        onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                        className="h-9 text-xs font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-border/60">
                  <p className="text-[11px] text-muted-foreground">
                    By submitting, you certify that all information submitted aligns with official government filings.
                  </p>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-md shadow-emerald-600/20"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
