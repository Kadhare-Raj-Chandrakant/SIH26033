'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { registerUser } from '@/lib/api';

type AccountRole = 'FARMER' | 'FPO' | 'BUYER';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuth();

  const requestedRole = searchParams.get('role')?.toUpperCase();
  const initialRole: AccountRole =
    requestedRole === 'BUYER' ? 'BUYER' : requestedRole === 'FPO' ? 'FPO' : 'FARMER';

  const [role, setRole] = useState<AccountRole>(initialRole);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { token, user: authUser } = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
      });

      setAuth(token, authUser);

      if (role === 'FARMER' || role === 'FPO') {
        if (
          returnUrl &&
          (returnUrl.startsWith('/cart') ||
            returnUrl.startsWith('/checkout') ||
            returnUrl.startsWith('/orders') ||
            returnUrl.startsWith('/marketplace/sourcing'))
        ) {
          router.push('/seller/orders');
        } else if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
          router.push(returnUrl);
        } else {
          router.push('/seller/orders');
        }
      } else {
        if (returnUrl && returnUrl.startsWith('/seller')) {
          router.push('/marketplace');
        } else if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
          router.push(returnUrl);
        } else {
          router.push('/marketplace');
        }
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Registration failed. Please verify your information and try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      {/* Top Banner Notice */}
      <div className="border-b border-[#E0D9CB] bg-[#F7F5EE] px-4 py-2 text-xs text-[#5E6454] text-center font-medium">
        <span>Aroha National Agricultural Marketplace: Integrating 50,000+ Verified Farmers, FPOs, and Institutional Buyers across India</span>
      </div>

      {/* Main Navigation Header */}
      <header className="border-b border-[#DFD8CB] bg-[#F7F5EE]">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-[#233D22] flex items-center justify-center text-[#F7F5EE]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z" fill="#2E4221" opacity="0.3"/>
                <path d="M12 22V12" />
                <path d="M12 12c0-4 3-7 7-7" />
                <path d="M12 15c-3 0-5-2-5-5 0-3 3-5 5-5" />
              </svg>
            </div>
            <div>
              <span className="text-2xl font-serif font-bold tracking-tight text-[#1E221B]">Aroha</span>
              <span className="block text-[10px] tracking-wider uppercase text-[#6B7060] font-sans font-semibold">Agricultural Exchange</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#3E4336]">
            <Link href="/marketplace" className="hover:text-[#1E221B]">
              Marketplace
            </Link>
            <Link href="/categories" className="hover:text-[#1E221B]">
              Categories
            </Link>
            <Link href="/fpo" className="hover:text-[#1E221B]">
              FPO Directory
            </Link>
          </nav>

          {/* Right Action */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-[#6B7060]">Already registered?</span>
            <Link href="/login">
              <button suppressHydrationWarning className="h-9 px-4 text-xs font-semibold uppercase tracking-wider text-[#233D22] border border-[#233D22] rounded-md hover:bg-[#EAE4D6]">
                Sign In
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center py-10 px-4 sm:px-6">
        {/* Metric Badges Above Form */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFFFFF] border border-[#DFD8CB] rounded-full text-[11px] font-bold uppercase tracking-wider text-[#4E5446]">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32]"></span>
            <span>50,000+ Farmers</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFFFFF] border border-[#DFD8CB] rounded-full text-[11px] font-bold uppercase tracking-wider text-[#4E5446]">
            <span className="w-2 h-2 rounded-full bg-[#2E7D32]"></span>
            <span>18,000+ PIN Codes</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFFFFF] border border-[#DFD8CB] rounded-full text-[11px] font-bold uppercase tracking-wider text-[#4E5446]">
            <span className="w-2 h-2 rounded-full bg-[#BD8728]"></span>
            <span>100% Escrow Protected</span>
          </div>
        </div>

        {/* Registration Card */}
        <div className="w-full max-w-[560px] rounded-lg border border-[#DFD8CB] bg-[#FFFFFF] p-8 sm:p-10">
          {/* Top Icon Badge */}
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-[#E2EDE2] flex items-center justify-center text-[#233D22]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" x2="19" y1="8" y2="14" />
                <line x1="22" x2="16" y1="11" y2="11" />
              </svg>
            </div>
          </div>

          {/* Heading & Subtitle */}
          <div className="text-center mb-7">
            <h1 className="text-2xl sm:text-[26px] font-serif font-bold text-[#1E2419]">
              Join Aroha Marketplace
            </h1>
            <p className="mt-2 text-xs text-[#6B7260] max-w-sm mx-auto leading-relaxed">
              Connect directly between farmers, FPOs, and wholesale/retail buyers
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-5 p-3 bg-[#FDF2F2] border border-[#F8B4B4] text-[#9B1C1C] rounded-lg text-xs"
            >
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Participant Role Selection */}
            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#52594B] mb-2">
                Select Participant Type
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {/* Farmer */}
                <button
                  type="button"
                  onClick={() => setRole('FARMER')}
                  className={`relative p-3 rounded-lg border text-center transition-all ${
                    role === 'FARMER'
                      ? 'border-[#233D22] bg-[#F0F5EE] ring-1 ring-[#233D22]'
                      : 'border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F7F5EE]'
                  }`}
                >
                  {role === 'FARMER' && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
                  )}
                  <div className="w-8 h-8 mx-auto mb-2 rounded bg-[#E4ECE1] flex items-center justify-center text-[#233D22]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8Z" />
                      <circle cx="7.5" cy="15.5" r="2.5" />
                      <circle cx="16.5" cy="15.5" r="2.5" />
                      <path d="M14 11V5a2 2 0 0 0-2-2H6v8" />
                    </svg>
                  </div>
                  <span className="block text-xs font-bold text-[#1E2419]">Farmer</span>
                  <span className="block text-[10px] text-[#717869]">Direct producer</span>
                </button>

                {/* FPO */}
                <button
                  type="button"
                  onClick={() => setRole('FPO')}
                  className={`relative p-3 rounded-lg border text-center transition-all ${
                    role === 'FPO'
                      ? 'border-[#233D22] bg-[#F0F5EE] ring-1 ring-[#233D22]'
                      : 'border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F7F5EE]'
                  }`}
                >
                  {role === 'FPO' && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
                  )}
                  <div className="w-8 h-8 mx-auto mb-2 rounded bg-[#EAE4D6] flex items-center justify-center text-[#3B4234]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <span className="block text-xs font-bold text-[#1E2419]">FPO</span>
                  <span className="block text-[10px] text-[#717869]">Cooperative group</span>
                </button>

                {/* Buyer */}
                <button
                  type="button"
                  onClick={() => setRole('BUYER')}
                  className={`relative p-3 rounded-lg border text-center transition-all ${
                    role === 'BUYER'
                      ? 'border-[#233D22] bg-[#F0F5EE] ring-1 ring-[#233D22]'
                      : 'border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F7F5EE]'
                  }`}
                >
                  {role === 'BUYER' && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
                  )}
                  <div className="w-8 h-8 mx-auto mb-2 rounded bg-[#EAE4D6] flex items-center justify-center text-[#3B4234]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
                      <path d="M2 7h20" />
                    </svg>
                  </div>
                  <span className="block text-xs font-bold text-[#1E2419]">Buyer</span>
                  <span className="block text-[10px] text-[#717869]">Wholesale / Retail</span>
                </button>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#52594B] mb-1.5"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7D8475]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ramesh Kumar"
                  className="w-full h-11 pl-10 pr-3.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded-md text-[#1E221B] placeholder-[#8A9082] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
                />
              </div>
            </div>

            {/* Email & Mobile 2-column row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="register-email"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#52594B] mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7D8475]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <input
                    id="register-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 pl-10 pr-3.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded-md text-[#1E221B] placeholder-[#8A9082] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="mobile"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#52594B] mb-1.5"
                >
                  Mobile Number <span className="font-normal text-[#7E8576] lowercase">(optional)</span>
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 text-xs bg-[#EAE4D6] border border-r-0 border-[#DFD8CB] rounded-l-md text-[#484E40] font-medium">
                    +91
                  </span>
                  <input
                    id="mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9876543210"
                    className="w-full h-11 px-3 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded-r-md text-[#1E221B] placeholder-[#8A9082] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
                  />
                </div>
              </div>
            </div>

            {/* Password & Confirm Password 2-column row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="register-password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#52594B] mb-1.5"
                >
                  Password <span className="font-normal text-[#7E8576] lowercase">(min 8 chars)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7D8475]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-10 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded-md text-[#1E221B] placeholder-[#8A9082] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7D8475] hover:text-[#1E221B]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#52594B] mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7D8475]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 pl-10 pr-10 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded-md text-[#1E221B] placeholder-[#8A9082] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#7D8475] hover:text-[#1E221B]"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                        <line x1="2" x2="22" y1="2" y2="22" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] text-xs font-bold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70"
              >
                <span>
                  {isSubmitting
                    ? 'Creating Account...'
                    : `Create Account as ${role} →`}
                </span>
              </button>
            </div>
          </form>

          {/* Card Footer Links */}
          <div className="mt-6 pt-4 text-center space-y-2 border-t border-[#EAE4D6]">
            <p className="text-xs text-[#6B7260]">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-bold text-[#1E2419] hover:underline"
              >
                Sign in
              </Link>
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#717869]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Protected by Escrow & APMC Verified KYC</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DFD8CB] bg-[#F7F5EE] py-6 px-4 sm:px-6 lg:px-8 text-xs text-[#6B7260]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[#1E221B]">Aroha</span>
            <span>© 2026 Aroha Agricultural Exchange Ltd. All rights reserved.</span>
          </div>
          <div className="flex flex-wrap gap-5 text-[11px] text-[#6B7260]">
            <Link href="/marketplace" className="hover:text-[#1E221B]">Terms of Trade</Link>
            <Link href="/marketplace" className="hover:text-[#1E221B]">APMC Mandi Regulatory Compliance</Link>
            <Link href="/marketplace" className="hover:text-[#1E221B]">Escrow Guarantee</Link>
            <Link href="/marketplace" className="hover:text-[#1E221B]">Support Desk</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F5EE] flex items-center justify-center text-xs text-[#6B7260]">
          Loading registration...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
