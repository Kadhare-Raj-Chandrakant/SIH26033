'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { loginUser } from '@/lib/api';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, user, isAuthenticated, logout, loginAsDemoBuyer, loginAsDemoSeller } = useAuth();

  const [email, setEmail] = useState('farmer1_demo@sih26033.org');
  const [password, setPassword] = useState('Password@123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeQuickRole, setActiveQuickRole] = useState<'buyer' | 'farmer' | 'fpo'>('farmer');

  const returnUrl = searchParams.get('returnUrl') || searchParams.get('redirect');

  const handlePostAuthRedirect = (role: string) => {
    if (role === 'FARMER' || role === 'FPO') {
      if (
        returnUrl &&
        (returnUrl.startsWith('/cart') ||
          returnUrl.startsWith('/checkout') ||
          returnUrl.startsWith('/orders') ||
          returnUrl.startsWith('/marketplace/sourcing'))
      ) {
        router.push('/seller/orders');
        return;
      }
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl);
        return;
      }
      router.push('/seller/orders');
      return;
    }

    if (role === 'BUYER') {
      if (returnUrl && returnUrl.startsWith('/seller')) {
        router.push('/marketplace');
        return;
      }
      if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
        router.push(returnUrl);
        return;
      }
      router.push('/marketplace');
      return;
    }

    if (role === 'ADMIN') {
      router.push('/admin');
      return;
    }

    router.push('/marketplace');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { token, user: authUser } = await loginUser({
        email: email.trim(),
        password,
      });

      setAuth(token, authUser);
      handlePostAuthRedirect(authUser.role);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (type: 'buyer' | 'farmer' | 'fpo') => {
    setActiveQuickRole(type);
    setIsSubmitting(true);
    setErrorMessage(null);

    if (type === 'buyer') {
      setEmail('demobuyer@sih26033.org');
      setPassword('Password@123');
    } else if (type === 'farmer') {
      setEmail('farmer1_demo@sih26033.org');
      setPassword('Password@123');
    } else {
      setEmail('fpo_demo@sih26033.org');
      setPassword('Password@123');
    }

    try {
      if (type === 'buyer') {
        await loginAsDemoBuyer();
        handlePostAuthRedirect('BUYER');
      } else {
        const role = type === 'fpo' ? 'FPO' : 'FARMER';
        await loginAsDemoSeller(role);
        handlePostAuthRedirect(role);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Demo login failed.');
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
            <span className="hidden sm:inline text-xs text-[#6B7060]">Don&apos;t have an account?</span>
            <Link href="/register">
              <button suppressHydrationWarning className="h-9 px-4 text-xs font-semibold text-[#233D22] border border-[#233D22] rounded-md hover:bg-[#EAE4D6]">
                Register for Free
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6">
        <div className="w-full max-w-[460px]">
          {/* Active Session Notification */}
          {isAuthenticated && user && (
            <div className="mb-4 p-3.5 rounded-lg border border-[#A5BFA0] bg-[#E8F1E5] text-[#284021] text-xs flex items-center justify-between">
              <span>Signed in as <strong>{user.email}</strong> ({user.role})</span>
              <button
                type="button"
                onClick={logout}
                className="underline font-semibold hover:text-[#192A15]"
              >
                Sign Out
              </button>
            </div>
          )}

          {/* Login Card */}
          <div className="rounded-lg border border-[#DFD8CB] bg-[#FFFFFF] p-8 sm:p-10">
            {/* Top Icon Badge */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[#E2EDE2] flex items-center justify-center text-[#233D22]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-[26px] font-serif font-bold text-[#1E2419]">
                Sign In to Aroha
              </h1>
              <p className="mt-2 text-xs text-[#6B7260] max-w-xs mx-auto leading-relaxed">
                Access your agricultural marketplace dashboard, mandi lots, and orders
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-4 p-3 bg-[#FDF2F2] border border-[#F8B4B4] text-[#9B1C1C] rounded-lg text-xs"
              >
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Address */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#52594B] mb-1.5"
                >
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7D8475]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="farmer1_demo@sih26033.org"
                    className="w-full h-11 pl-10 pr-3.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded-md text-[#1E221B] placeholder-[#8A9082] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-bold uppercase tracking-wider text-[#52594B]"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] text-[#52594B] hover:text-[#233D22]"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#7D8475]">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
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

              {/* Remember Session Checkbox */}
              <div className="flex items-center pt-0.5">
                <input
                  id="remember-session"
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="w-4 h-4 rounded border-[#C8C0AF] text-[#233D22] focus:ring-0 cursor-pointer accent-[#233D22]"
                />
                <label
                  htmlFor="remember-session"
                  className="ml-2 text-xs text-[#52594B] cursor-pointer select-none"
                >
                  Remember workstation session (30 days)
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] text-xs font-bold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-70"
                >
                  <span>{isSubmitting ? 'Signing In...' : 'Sign In'}</span>
                  <span>→</span>
                </button>
              </div>
            </form>

            {/* Quick Role Sign-in (1-Click Access) */}
            <div className="mt-6 pt-5 border-t border-[#EAE4D6]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#686E60]">
                  Quick Role Sign-In (1-Click Access)
                </span>
                <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#EAE4D6] text-[#4F5547]">
                  Sandbox
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {/* Buyer */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('buyer')}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    activeQuickRole === 'buyer'
                      ? 'border-[#233D22] bg-[#F7F5EE]'
                      : 'border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F7F5EE]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-[#1E2419]">Buyer</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#BD8728]"></span>
                  </div>
                  <span className="text-[10px] text-[#717869] block truncate">Produce Sourcing</span>
                </button>

                {/* Farmer */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('farmer')}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    activeQuickRole === 'farmer'
                      ? 'border-[#233D22] bg-[#F0F5EE]'
                      : 'border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F7F5EE]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-[#1E2419]">Farmer</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32]"></span>
                  </div>
                  <span className="text-[10px] text-[#717869] block truncate">Seller Portal</span>
                </button>

                {/* FPO */}
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('fpo')}
                  className={`p-2.5 rounded-lg border text-left transition-colors ${
                    activeQuickRole === 'fpo'
                      ? 'border-[#233D22] bg-[#F7F5EE]'
                      : 'border-[#DFD8CB] bg-[#FCFAF6] hover:bg-[#F7F5EE]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-[#1E2419]">FPO</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8E9486]"></span>
                  </div>
                  <span className="text-[10px] text-[#717869] block truncate">Cooperative</span>
                </button>
              </div>
            </div>

            {/* Card Footer Links */}
            <div className="mt-6 pt-4 text-center space-y-2">
              <p className="text-xs text-[#6B7260]">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="font-bold text-[#1E2419] hover:underline"
                >
                  Create an account
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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F5EE] flex items-center justify-center text-xs text-[#6B7260]">
          Loading authentication...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
