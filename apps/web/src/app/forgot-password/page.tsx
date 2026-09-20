'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sprout, Mail, KeyRound, AlertCircle, ArrowRight, ArrowLeft, CheckCircle2, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
            <Button size="sm" variant="ghost" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Sign In</span>
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
                <KeyRound className="h-6 w-6" />
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">
                Reset Your Password
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Enter your registered email address and we will generate a password recovery link
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successData ? (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>Request Processed</span>
                    </div>
                    <p>{successData.message}</p>
                  </div>

                  {successData.resetUrl && (
                    <div className="p-3.5 bg-muted/60 border border-border/80 rounded-xl space-y-2.5">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        🛠️ Local Dev Mode Link
                      </span>
                      <p className="text-xs text-muted-foreground">
                        Click below to proceed to the password reset page:
                      </p>
                      <Link href={successData.resetUrl}>
                        <Button
                          size="sm"
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
                        >
                          <span>Open Password Reset Screen</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                  )}

                  <Link href="/login">
                    <Button variant="outline" className="w-full text-xs h-10 mt-2">
                      Return to Sign In
                    </Button>
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label htmlFor="reset-email" className="block text-xs font-semibold text-foreground">
                      Email Address
                    </label>
                    <div className="relative">
                      <Input
                        id="reset-email"
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSubmitting}
                        className="pr-10 h-10 text-sm rounded-lg"
                      />
                      <Mail className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Reset Link</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-2 pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
              <p>
                Remember your password?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
                >
                  Sign In
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}
