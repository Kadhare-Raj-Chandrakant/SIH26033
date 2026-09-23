'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sprout, Lock, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { resetPassword } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Missing password reset token. Please request a new link.');
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
      const res = await resetPassword({ token, newPassword: password });
      setSuccessMessage(res.message || 'Password updated successfully!');
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Failed to reset password. The link may have expired or is invalid.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      {/* Top Navbar Header */}
      <header className="border-b border-[#DFD8CB] bg-[#F7F5EE] sticky top-0 z-30">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8 max-w-6xl">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded bg-[#233D22] text-[#F7F5EE]">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-serif font-bold tracking-tight text-[#1E221B]">
                Aroha
              </span>
              <span className="block text-[9px] uppercase tracking-wider text-[#5D6352] font-semibold -mt-1">
                Agricultural Exchange
              </span>
            </div>
          </Link>

          <Link href="/login">
            <Button size="sm" variant="ghost" className="text-xs text-[#5D6352] hover:text-[#1E221B] hover:bg-[#F4F0E6]">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md">
          <div className="border border-[#DFD8CB] bg-[#FCFAF6] rounded-md p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2 border-b border-[#DFD8CB] pb-5">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded bg-[#233D22]/10 text-[#233D22] border border-[#233D22]/20">
                <Lock className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-[#1E221B]">
                Set New Password
              </h1>
              <p className="text-xs text-[#5D6352]">
                Enter your new password below to secure your trade and settlement account.
              </p>
            </div>

            {!token && (
              <div
                role="alert"
                className="p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 text-[#9A3412] rounded text-xs flex flex-col gap-2"
              >
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Reset Token Missing or Invalid</span>
                </div>
                <p>No valid reset token was found in the URL. Please request a new password recovery link.</p>
                <Link href="/forgot-password" className="mt-1">
                  <Button size="sm" className="w-full text-xs h-8 bg-[#9A3412] text-white hover:bg-[#7c2d12] rounded">
                    Request New Reset Link
                  </Button>
                </Link>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 text-[#9A3412] rounded text-xs flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage ? (
              <div className="space-y-4">
                <div className="p-4 bg-[#233D22]/10 border border-[#233D22]/20 text-[#233D22] rounded text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#233D22]" />
                    <span>Password Reset Successful</span>
                  </div>
                  <p className="text-[#1E221B]">{successMessage}</p>
                  <p className="text-[11px] text-[#5D6352]">Redirecting to sign in screen...</p>
                </div>

                <Link href="/login" className="block">
                  <Button className="w-full bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] text-xs h-10 gap-1.5 font-semibold rounded">
                    <span>Proceed to Sign In</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ) : (
              token && (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="new-password" className="block text-xs font-semibold text-[#1E221B]">
                      New Password (minimum 8 characters)
                    </label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="pr-10 h-10 text-xs rounded border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] focus:border-[#233D22]"
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-[#5D6352] hover:text-[#1E221B] focus:outline-none"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="confirm-password" className="block text-xs font-semibold text-[#1E221B]">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <Input
                        id="confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={8}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isSubmitting}
                        className="pr-10 h-10 text-xs rounded border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] focus:border-[#233D22]"
                      />
                      <Lock className="absolute right-3 top-3 h-4 w-4 text-[#5D6352] pointer-events-none" />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] font-semibold text-xs rounded flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )
            )}

            <div className="pt-4 text-center text-xs text-[#5D6352] border-t border-[#DFD8CB] flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#233D22]" />
              <span className="text-[11px]">Protected by Argon2 & Cryptographic Token Authentication</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F5EE] flex items-center justify-center text-xs text-[#5D6352]">
          Loading password reset...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
