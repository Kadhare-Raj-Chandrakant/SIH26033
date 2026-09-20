'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sprout, Lock, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
    <div className="min-h-screen flex flex-col bg-background selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar Header */}
      <header className="border-b border-border/70 backdrop-blur bg-background/80 sticky top-0 z-30">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <Sprout className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight">
                SIH<span className="text-emerald-600">26033</span>
              </span>
            </div>
          </Link>

          <Link href="/login">
            <Button size="sm" variant="ghost" className="text-xs text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.12),rgba(255,255,255,0))]" />

        <div className="w-full max-w-md">
          <Card className="border-border/80 bg-card/95 backdrop-blur shadow-xl rounded-2xl">
            <CardHeader className="space-y-1.5 pb-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 mb-2 border border-emerald-500/20">
                <Lock className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Set New Password
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enter your new password below to secure your marketplace account
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {!token && (
                <div
                  role="alert"
                  className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>Reset Link Missing or Invalid</span>
                  </div>
                  <p>No valid reset token was found in the URL. Please request a new password reset link.</p>
                  <Link href="/forgot-password" className="mt-1">
                    <Button size="sm" variant="destructive" className="w-full text-xs h-8">
                      Request New Reset Link
                    </Button>
                  </Link>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Password Reset Successful</span>
                    </div>
                    <p>{successMessage}</p>
                    <p className="text-[11px] opacity-80">Redirecting to login page in a few moments...</p>
                  </div>

                  <Link href="/login">
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-10 gap-1.5 shadow-sm">
                      <span>Go to Sign In Now</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              ) : (
                token && (
                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    <div className="space-y-1.5">
                      <label htmlFor="new-password" className="block text-xs font-semibold text-foreground">
                        New Password (min 8 chars)
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
                          className="pr-10 h-10 text-sm rounded-lg"
                        />
                        <button
                          type="button"
                          tabIndex={-1}
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="confirm-password" className="block text-xs font-semibold text-foreground">
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
                          className="pr-10 h-10 text-sm rounded-lg"
                        />
                        <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Updating Password...</span>
                        </>
                      ) : (
                        <>
                          <span>Reset Password</span>
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </form>
                )
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
              <div className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground/70">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Protected by Argon2 & JWT Encryption</span>
              </div>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center text-xs text-muted-foreground">
          Loading password reset...
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
