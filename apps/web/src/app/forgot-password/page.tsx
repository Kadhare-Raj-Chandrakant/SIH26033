'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sprout, Mail, KeyRound, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ message: string; resetUrl?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await requestPasswordReset(email.trim());
      setSuccessData({
        message: response.message,
        resetUrl: response.resetUrl,
      });
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to request password reset. Please try again.',
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
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-[#5D6352] hover:text-[#1E221B] hover:bg-[#F4F0E6]">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
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
                <KeyRound className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-serif font-bold tracking-tight text-[#1E221B]">
                Reset Your Password
              </h1>
              <p className="text-xs text-[#5D6352]">
                Enter your registered trade account email to generate a secure recovery token.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 text-[#9A3412] rounded text-xs flex items-start gap-2"
              >
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successData ? (
              <div className="space-y-4">
                <div className="p-4 bg-[#233D22]/10 border border-[#233D22]/20 text-[#233D22] rounded text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#233D22]" />
                    <span>Request Processed Successfully</span>
                  </div>
                  <p className="text-[#1E221B]">{successData.message}</p>
                </div>

                {successData.resetUrl && (
                  <div className="p-3.5 bg-[#F4F0E6] border border-[#DFD8CB] rounded space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D6352] block">
                      Direct Password Reset Link
                    </span>
                    <p className="text-xs text-[#5D6352]">
                      Click below to proceed to the secure credential reset terminal:
                    </p>
                    <Link href={successData.resetUrl}>
                      <Button
                        size="sm"
                        className="w-full bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] text-xs font-semibold rounded gap-1.5"
                      >
                        <span>Open Password Reset Screen</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                )}

                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full text-xs h-10 border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] hover:bg-[#EFE9DC] rounded">
                    Return to Sign In
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-[#1E221B]">
                    Registered Account Email
                  </label>
                  <div className="relative">
                    <Input
                      id="reset-email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="account@aroha.ag"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      className="pr-10 h-10 text-xs rounded border-[#DFD8CB] bg-[#F7F5EE] text-[#1E221B] focus:border-[#233D22]"
                    />
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-[#5D6352] pointer-events-none" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-10 bg-[#233D22] hover:bg-[#1E331D] text-[#F7F5EE] font-semibold text-xs rounded flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending Request...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Password Reset Link</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="pt-4 text-center text-xs text-[#5D6352] border-t border-[#DFD8CB]">
              <p>
                Remember your password?{' '}
                <Link
                  href="/login"
                  className="font-bold text-[#233D22] hover:underline underline-offset-2"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
