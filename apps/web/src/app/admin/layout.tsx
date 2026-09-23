'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  Users,
  Store,
  Package,
  ShoppingCart,
  CreditCard,
  Truck,
  AlertTriangle,
  FileText,
  LogOut,
  ExternalLink,
  Lock,
  CheckCircle,
  Sprout,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { useIsMounted } from '@/lib/use-is-mounted';
import { API_BASE_URL } from '@/lib/api';

const navItems = [
  { label: 'Overview', href: '/admin', icon: Shield },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Sellers & FPOs', href: '/admin/sellers', icon: Store },
  { label: 'FPO Verification', href: '/admin/fpo', icon: Store },
  { label: 'Product Moderation', href: '/admin/products', icon: Package },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Payments', href: '/admin/payments', icon: CreditCard },
  { label: 'Logistics', href: '/admin/shipments', icon: Truck },
  { label: 'Moderation Queue', href: '/admin/reports', icon: AlertTriangle },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, token, setAuth, logout } = useAuth();
  const mounted = useIsMounted();

  // Admin login form state for unauthenticated / non-admin users
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        },
      );

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.message || 'Login failed');
      }

      const receivedToken = json.data?.accessToken || json.accessToken;
      const receivedUser = json.data?.user || json.user;

      if (!receivedToken || !receivedUser) {
        throw new Error('Invalid authentication response');
      }

      if (receivedUser.role !== 'ADMIN') {
        throw new Error('Access Denied: This account does not hold the ADMIN role.');
      }

      setAuth(receivedToken, receivedUser);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#F7F5EE] flex items-center justify-center text-xs text-[#5D6352]">Loading administrative environment...</div>;
  }

  const isAdmin = token && user?.role === 'ADMIN';

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F7F5EE] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#FCFAF6] border border-[#DFD8CB] rounded-md p-8">
          <div className="flex items-center gap-3 mb-6 border-b border-[#DFD8CB] pb-5">
            <div className="p-2.5 bg-[#233D22]/10 text-[#233D22] rounded border border-[#233D22]/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[#1E221B]">Administrator Portal</h1>
              <p className="text-xs text-[#5D6352]">Secure sign-in with verified ADMIN credentials</p>
            </div>
          </div>

          {authError && (
            <div className="mb-5 p-3 bg-[#9A3412]/10 border border-[#9A3412]/20 rounded text-xs text-[#9A3412] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1E221B] mb-1">Admin Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] placeholder-[#8A8E82] focus:outline-none focus:border-[#233D22]"
                placeholder="admin@market.gov.in"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#1E221B] mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-[#F7F5EE] border border-[#DFD8CB] rounded text-xs text-[#1E221B] placeholder-[#8A8E82] focus:outline-none focus:border-[#233D22]"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[#233D22] hover:bg-[#1E331D] disabled:opacity-50 text-[#F7F5EE] font-semibold text-xs rounded transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign in as Administrator'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#DFD8CB] text-center">
            <Link
              href="/marketplace"
              className="text-xs text-[#5D6352] hover:text-[#1E221B] inline-flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Return to Public Marketplace</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#1E221B] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#1E331D] border-r border-[#2A4428] text-[#F7F5EE] flex flex-col shrink-0">
        <div className="p-5 border-b border-[#2A4428] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#BD8728] text-[#1E331D] rounded">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <span className="font-serif font-bold text-sm tracking-wide text-[#F7F5EE]">Aroha Governance</span>
              <span className="block text-[10px] text-[#A8B5A5] font-semibold uppercase tracking-wider">Exchange Administration</span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#2A4428] text-[#F7F5EE]'
                    : 'text-[#A8B5A5] hover:text-[#F7F5EE] hover:bg-[#253D23]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Sign Out */}
        <div className="p-4 border-t border-[#2A4428] bg-[#172816]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-7 h-7 rounded bg-[#2A4428] border border-[#3E5C3B] flex items-center justify-center text-xs font-bold text-[#F7F5EE]">
              AD
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-[#F7F5EE] truncate">{user?.email}</p>
              <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-[#BD8728] font-bold">
                <CheckCircle className="w-2.5 h-2.5" />
                ADMIN ROLE
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/marketplace"
              className="flex-1 py-1 px-2 bg-[#253D23] hover:bg-[#2A4428] text-[#F7F5EE] text-[11px] rounded text-center transition-colors inline-flex items-center justify-center gap-1 border border-[#3E5C3B]"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Public View</span>
            </Link>
            <button
              onClick={logout}
              className="py-1 px-2 bg-[#9A3412]/30 hover:bg-[#9A3412]/50 text-[#F7F5EE] text-[11px] rounded transition-colors inline-flex items-center gap-1 border border-[#9A3412]/40"
              title="Sign Out"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col bg-[#F7F5EE] overflow-x-hidden">
        <header className="h-14 border-b border-[#DFD8CB] bg-[#FCFAF6] px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#5D6352]">
              {pathname === '/admin'
                ? 'Overview & KPIs'
                : pathname.replace('/admin/', '').replace('-', ' ').toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#233D22]/10 text-[#233D22] border border-[#233D22]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#233D22]" />
              Production Backend Connected
            </span>
          </div>
        </header>

        <div className="p-6 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
