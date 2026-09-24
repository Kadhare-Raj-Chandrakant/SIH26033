'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import {
  Search,
  ShieldCheck,
  TrendingUp,
  Truck,
  Sprout,
  Wheat,
  ArrowUpRight,
} from 'lucide-react';

interface MandiData {
  state: string;
  mandi: string;
  modalPrice: string;
  arrivals: string;
  trend: string;
  diff: string;
}

const MANDI_DATA: Record<string, { title: string; chartPoints: number[]; data: MandiData[] }> = {
  wheat: {
    title: 'Sharbati & Mill Quality Wheat',
    chartPoints: [2180, 2220, 2290, 2340, 2410, 2380, 2420, 2460, 2480],
    data: [
      { state: 'Madhya Pradesh', mandi: 'Sehore APMC', modalPrice: '₹2,480 / Qtl', arrivals: '14,200 Qtl', trend: '+3.2%', diff: 'High Demand' },
      { state: 'Punjab', mandi: 'Khanna Mandi', modalPrice: '₹2,425 / Qtl', arrivals: '18,500 Qtl', trend: '+1.8%', diff: 'Steady' },
      { state: 'Haryana', mandi: 'Karnal APMC', modalPrice: '₹2,390 / Qtl', arrivals: '9,400 Qtl', trend: '+1.2%', diff: 'Balanced' },
      { state: 'Rajasthan', mandi: 'Kota Mandi', modalPrice: '₹2,410 / Qtl', arrivals: '6,800 Qtl', trend: '+2.4%', diff: 'Moderate' },
      { state: 'Uttar Pradesh', mandi: 'Hapur Mandi', modalPrice: '₹2,360 / Qtl', arrivals: '11,000 Qtl', trend: '+0.9%', diff: 'Normal' },
    ],
  },
  rice: {
    title: 'Pusa 1121 & Basmati Rice',
    chartPoints: [3800, 3850, 3920, 4010, 4080, 4120, 4100, 4140, 4180],
    data: [
      { state: 'Haryana', mandi: 'Taraori Mandi', modalPrice: '₹4,180 / Qtl', arrivals: '12,600 Qtl', trend: '+4.1%', diff: 'Export Bullish' },
      { state: 'Punjab', mandi: 'Amritsar APMC', modalPrice: '₹4,120 / Qtl', arrivals: '15,800 Qtl', trend: '+2.8%', diff: 'High Demand' },
      { state: 'Uttar Pradesh', mandi: 'Aligarh Mandi', modalPrice: '₹3,950 / Qtl', arrivals: '7,300 Qtl', trend: '+1.5%', diff: 'Steady' },
      { state: 'West Bengal', mandi: 'Burdwan Mandi', modalPrice: '₹3,820 / Qtl', arrivals: '8,400 Qtl', trend: '+0.8%', diff: 'Steady' },
      { state: 'Andhra Pradesh', mandi: 'Nellore APMC', modalPrice: '₹3,890 / Qtl', arrivals: '6,200 Qtl', trend: '+1.9%', diff: 'Active' },
    ],
  },
  mustard: {
    title: 'Yellow & Black Mustard Seed',
    chartPoints: [4800, 4920, 5010, 5140, 5220, 5190, 5260, 5310, 5350],
    data: [
      { state: 'Rajasthan', mandi: 'Baran Mandi', modalPrice: '₹5,350 / Qtl', arrivals: '8,400 Qtl', trend: '+2.9%', diff: 'Oil Mill Pull' },
      { state: 'Haryana', mandi: 'Hisar Mandi', modalPrice: '₹5,280 / Qtl', arrivals: '6,100 Qtl', trend: '+2.1%', diff: 'Steady' },
      { state: 'Madhya Pradesh', mandi: 'Morena APMC', modalPrice: '₹5,210 / Qtl', arrivals: '7,500 Qtl', trend: '+1.7%', diff: 'Active' },
      { state: 'Gujarat', mandi: 'Mehsana Mandi', modalPrice: '₹5,310 / Qtl', arrivals: '4,900 Qtl', trend: '+2.4%', diff: 'High Demand' },
      { state: 'Uttar Pradesh', mandi: 'Agra APMC', modalPrice: '₹5,180 / Qtl', arrivals: '5,300 Qtl', trend: '+1.1%', diff: 'Normal' },
    ],
  },
  chickpea: {
    title: 'Desi Chana & Kabuli Chickpea',
    chartPoints: [5100, 5190, 5280, 5390, 5470, 5520, 5580, 5620, 5660],
    data: [
      { state: 'Madhya Pradesh', mandi: 'Indore Mandi', modalPrice: '₹5,660 / Qtl', arrivals: '9,800 Qtl', trend: '+3.5%', diff: 'Festive Surge' },
      { state: 'Rajasthan', mandi: 'Bikaner APMC', modalPrice: '₹5,580 / Qtl', arrivals: '7,200 Qtl', trend: '+2.2%', diff: 'Active' },
      { state: 'Maharashtra', mandi: 'Latur Mandi', modalPrice: '₹5,620 / Qtl', arrivals: '8,900 Qtl', trend: '+2.7%', diff: 'High Demand' },
      { state: 'Karnataka', mandi: 'Gulbarga APMC', modalPrice: '₹5,510 / Qtl', arrivals: '5,400 Qtl', trend: '+1.4%', diff: 'Steady' },
      { state: 'Andhra Pradesh', mandi: 'Kurnool Mandi', modalPrice: '₹5,490 / Qtl', arrivals: '4,800 Qtl', trend: '+1.0%', diff: 'Balanced' },
    ],
  },
  onion: {
    title: 'Nashik Red & Garwa Onion',
    chartPoints: [1400, 1480, 1550, 1620, 1710, 1760, 1810, 1840, 1890],
    data: [
      { state: 'Maharashtra', mandi: 'Lasalgaon APMC', modalPrice: '₹1,890 / Qtl', arrivals: '32,000 Qtl', trend: '+5.4%', diff: 'Primary Hub' },
      { state: 'Karnataka', mandi: 'Hubli Mandi', modalPrice: '₹1,820 / Qtl', arrivals: '14,000 Qtl', trend: '+3.1%', diff: 'Steady' },
      { state: 'Madhya Pradesh', mandi: 'Khandwa Mandi', modalPrice: '₹1,740 / Qtl', arrivals: '9,200 Qtl', trend: '+2.0%', diff: 'Balanced' },
      { state: 'Gujarat', mandi: 'Mahuva Mandi', modalPrice: '₹1,780 / Qtl', arrivals: '11,400 Qtl', trend: '+2.6%', diff: 'Active' },
      { state: 'Rajasthan', mandi: 'Alwar APMC', modalPrice: '₹1,710 / Qtl', arrivals: '7,800 Qtl', trend: '+1.3%', diff: 'Normal' },
    ],
  },
};

const FEATURED_CROPS = [
  {
    id: 'crop-1',
    name: 'Sharbati Wheat',
    variety: 'Certified Grade A',
    location: 'Sehore APMC, Madhya Pradesh',
    quantity: '450 Quintals',
    price: '₹2,480 / Qtl',
    seller: 'Sehore Kisan Producer Co.',
    image: '/images/products/wheat-1.jpg',
    tag: 'Verified FPO',
  },
  {
    id: 'crop-2',
    name: 'Pusa 1121 Basmati Rice',
    variety: 'Export Grade Long Grain',
    location: 'Karnal Mandi, Haryana',
    quantity: '300 Quintals',
    price: '₹4,150 / Qtl',
    seller: 'Taraori Agro Collective',
    image: '/images/products/rice-1.jpg',
    tag: 'Verified FPO',
  },
  {
    id: 'crop-3',
    name: 'Desi Chickpea (Chana)',
    variety: 'Bold Machine Cleaned',
    location: 'Indore Mandi, Madhya Pradesh',
    quantity: '220 Quintals',
    price: '₹5,600 / Qtl',
    seller: 'Malwa Krishi Producers',
    image: '/images/products/chickpea-1.jpg',
    tag: 'Quality Inspected',
  },
  {
    id: 'crop-4',
    name: 'Yellow Mustard Seed',
    variety: 'High Oil Content (41%)',
    location: 'Baran Mandi, Rajasthan',
    quantity: '180 Quintals',
    price: '₹5,250 / Qtl',
    seller: 'Hadoti Kisan Federation',
    image: '/images/products/mustard-1.jpg',
    tag: 'Verified FPO',
  },
  {
    id: 'crop-5',
    name: 'Nashik Red Onion',
    variety: 'Medium Garwa Grade',
    location: 'Lasalgaon, Maharashtra',
    quantity: '600 Quintals',
    price: '₹1,850 / Qtl',
    seller: 'Panchavati Farmers Union',
    image: '/images/products/onion-1.jpg',
    tag: 'Prompt Dispatch',
  },
  {
    id: 'crop-6',
    name: 'Kufri Jyoti Potato',
    variety: 'Table & Processing Grade',
    location: 'Agra Mandi, Uttar Pradesh',
    quantity: '800 Quintals',
    price: '₹1,420 / Qtl',
    seller: 'Taj Agro Producer Co.',
    image: '/images/products/potato-1.jpg',
    tag: 'Verified FPO',
  },
];

export default function Home() {
  const router = useRouter();
  const [selectedCrop, setSelectedCrop] = useState<string>('wheat');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentMandi = MANDI_DATA[selectedCrop];

  // SVG Chart points calculation
  const points = currentMandi.chartPoints;
  const minVal = Math.min(...points) * 0.98;
  const maxVal = Math.max(...points) * 1.02;
  const chartWidth = 520;
  const chartHeight = 180;
  const svgPoints = points
    .map((val, idx) => {
      const x = 30 + (idx / (points.length - 1)) * (chartWidth - 60);
      const y = chartHeight - 25 - ((val - minVal) / (maxVal - minVal)) * (chartHeight - 50);
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `30,${chartHeight - 25} ${svgPoints} ${chartWidth - 30},${chartHeight - 25}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      {/* Universal Dual-Tier Role-Based Navigation */}
      <MarketplaceNavbar />

      {/* Main Content */}
      <main className="flex-1">
        {/* HERO SECTION: ARCHITECTURAL PANORAMIC VIEW */}
        <section className="relative w-full overflow-hidden border-b border-[#D5CEBF] bg-[#162113]">
          {/* Panoramic Scenic Background */}
          <div className="absolute inset-0">
            <Image
              src="/images/hero-landscape.jpg"
              alt="Indian agricultural landscape with modern grain silos and freight transport"
              fill
              priority
              className="object-cover object-center"
            />
            {/* Scrim for high contrast text readability on the left while keeping landscape visible */}
            <div className="absolute inset-0 bg-linear-to-r from-black/85 via-black/55 to-black/15" />
            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent" />
          </div>

          <div className="relative z-10 max-w-[1600px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-125 sm:min-h-140 lg:min-h-155">
              
              {/* Left Column: Metric Module with Architectural Divider */}
              <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-white/20 p-8 sm:p-10 lg:p-12 flex flex-col justify-center">
                <span className="text-xs uppercase tracking-widest font-medium text-[#E0EAD8]/80 font-sans">
                  Cultivating over
                </span>
                <div className="text-5xl sm:text-6xl lg:text-7xl font-sans font-bold text-[#FAF8F2] tracking-tight my-1">
                  29K
                </div>
                <span className="text-sm font-medium text-[#E0EAD8]/85 font-sans">
                  Hectares.
                </span>

                {/* Circular botanical badges matching reference */}
                <div className="flex items-center gap-3 mt-8">
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xs border border-white/25 flex items-center justify-center text-emerald-300 shadow-sm" title="Sustainable Farming">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xs border border-white/25 flex items-center justify-center text-amber-300 shadow-sm" title="Grain Assurance">
                    <Wheat className="w-5 h-5" />
                  </div>
                  <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xs border border-white/25 flex items-center justify-center text-white/90 shadow-sm" title="Verified Trade">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Main Column: Headline, Subtitle, and Clean CTA */}
              <div className="lg:col-span-9 p-8 sm:p-12 lg:p-16 flex flex-col justify-center max-w-3xl">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-[#FAF8F2] tracking-tight leading-[1.12]">
                  Powering Modern<br className="hidden sm:inline" /> Indian Agriculture.
                </h1>
                <p className="mt-5 text-sm sm:text-base text-[#DCE7D6] font-sans leading-relaxed max-w-2xl">
                  Advanced agritech for yield optimization, quality assurance, and traceable logistics. Building a resilient, transparent, and forward-looking farmgate exchange across 18,000+ PIN codes.
                </p>

                {/* Action Row */}
                <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <Link href="/marketplace">
                    <button className="px-8 py-3.5 rounded-lg bg-[#183B1E] hover:bg-[#122E17] text-[#FAF8F2] text-xs font-bold uppercase tracking-wider transition-colors shadow-lg border border-emerald-700/60 shrink-0">
                      Explore Solutions
                    </button>
                  </Link>

                  {/* Quick Commodity Search Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchQuery.trim()) {
                        router.push(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
                      }
                    }}
                    className="relative flex items-center bg-white/95 backdrop-blur-sm rounded-lg p-1.5 border border-white/30 shadow-lg max-w-md w-full"
                  >
                    <Search className="w-4 h-4 text-[#5D6354] ml-2.5 shrink-0" />
                    <input
                      id="hero-search-input"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search crops, APMC mandis (e.g. Wheat, Onion)..."
                      className="w-full bg-transparent px-3 py-1.5 text-xs text-[#1E221B] placeholder-[#767C6D] focus:outline-hidden"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded bg-[#233D22] text-[#FAF8F2] text-xs font-semibold hover:bg-[#1A2E19] transition-colors shrink-0"
                    >
                      Search
                    </button>
                  </form>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* PLATFORM INTELLIGENCE & TELEMETRICS (3 CARDS) */}
        <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 bg-[#FBF9F5]">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Card 1: Direct Producer Realization */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-7 flex flex-col justify-between shadow-xs hover:border-[#C8BFB0] transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#3B532B] flex items-center justify-center text-[#FAF8F2] mb-5">
                    <TrendingUp className="w-5 h-5 text-[#FAF8F2]" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-sans font-bold tracking-wider uppercase text-[#1E221B]">
                      Yield Realization
                    </h3>
                    <span className="text-xs font-bold text-[#3B532B] bg-[#E8F0E2] px-2 py-0.5 rounded border border-[#C5D8BB]">
                      +30.4% Uplift
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#5A6051]">
                    Direct producer price realization and digital aggregation eliminating intermediary brokerage tolls with automated escrow disbursement.
                  </p>
                </div>

                {/* Realization comparison schematic */}
                <div className="mt-7 pt-5 border-t border-[#ECE6D9]">
                  <div className="w-full bg-[#F4F0E6] rounded border border-[#E3DDD1] p-3.5 flex flex-col justify-between gap-2.5 text-[11px] text-[#6E7363]">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span>Traditional Mandi Net</span>
                        <span className="font-bold text-[#8B4513]">₹2,120 / Qtl</span>
                      </div>
                      <div className="w-full bg-[#E5DFD2] h-2 rounded-sm overflow-hidden">
                        <div className="bg-[#A07040] h-full w-[74%]" />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-[#2B3F21] font-semibold">Aroha Escrow Realization</span>
                        <span className="font-bold text-[#2B3F21]">₹2,580 / Qtl</span>
                      </div>
                      <div className="w-full bg-[#E5DFD2] h-2 rounded-sm overflow-hidden">
                        <div className="bg-[#3B532B] h-full w-[94%]" />
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-[#79806F] pt-1.5 border-t border-[#E3DDD1]">
                      <span>0% Brokerage Toll</span>
                      <span className="font-semibold text-[#2B3F21]">T+0 Escrow Settlement</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: AI Lot Assay & Quality Assurance */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-7 flex flex-col justify-between shadow-xs hover:border-[#C8BFB0] transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#3B532B] flex items-center justify-center text-[#FAF8F2] mb-5">
                    <ShieldCheck className="w-5 h-5 text-[#FAF8F2]" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-sans font-bold tracking-wider uppercase text-[#1E221B]">
                      Quality Grading
                    </h3>
                    <span className="text-xs font-bold text-[#3B532B] bg-[#E8F0E2] px-2 py-0.5 rounded border border-[#C5D8BB]">
                      99.4% Purity
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#5A6051]">
                    Multi-spectral moisture profiling and standardized grading preventing arbitrary dockage deductions at the mandi gate.
                  </p>
                </div>

                {/* Quality telemetry schematic */}
                <div className="mt-7 pt-5 border-t border-[#ECE6D9]">
                  <div className="w-full bg-[#F4F0E6] rounded border border-[#E3DDD1] p-3.5 flex flex-col justify-between gap-2.5 text-[11px] text-[#6E7363]">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#EAE4D7] rounded p-2 border border-[#DFD8CB]">
                        <div className="text-[10px] uppercase tracking-wider text-[#79806F]">Moisture Index</div>
                        <div className="text-sm font-mono font-bold text-[#1E221B] mt-0.5">11.2%</div>
                        <div className="text-[9px] text-[#2B3F21] font-medium">Optimal Standard</div>
                      </div>
                      <div className="bg-[#EAE4D7] rounded p-2 border border-[#DFD8CB]">
                        <div className="text-[10px] uppercase tracking-wider text-[#79806F]">Foreign Matter</div>
                        <div className="text-sm font-mono font-bold text-[#1E221B] mt-0.5">&lt;0.3%</div>
                        <div className="text-[9px] text-[#2B3F21] font-medium">Zero Deduction</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-[#79806F] pt-1.5 border-t border-[#E3DDD1]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#3B532B]"></span>
                        NABL Grade A+ Certified
                      </span>
                      <Link href="/marketplace" className="text-[#3B532B] font-semibold hover:underline flex items-center gap-0.5">
                        <span>Explore Lots</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: Connected Logistics Telematics */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-7 flex flex-col justify-between shadow-xs hover:border-[#C8BFB0] transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#3B532B] flex items-center justify-center text-[#FAF8F2] mb-5">
                    <Truck className="w-5 h-5 text-[#FAF8F2]" />
                  </div>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-sm font-sans font-bold tracking-wider uppercase text-[#1E221B]">
                      Transit Telematics
                    </h3>
                    <span className="text-xs font-bold text-[#3B532B] bg-[#E8F0E2] px-2 py-0.5 rounded border border-[#C5D8BB]">
                      18.2°C Reefer
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-[#5A6051]">
                    Aggregated farmgate freight dispatch, digital weighbridge integration, and temperature-controlled transit across 18,000+ PIN codes.
                  </p>
                </div>

                {/* Multimodal corridor transit schematic */}
                <div className="mt-7 pt-5 border-t border-[#ECE6D9]">
                  <div className="w-full bg-[#F4F0E6] rounded border border-[#E3DDD1] p-3.5 flex flex-col justify-between gap-2.5 text-[11px] text-[#6E7363]">
                    <div className="flex items-center justify-between text-[10px] text-[#555C4A]">
                      <span className="font-semibold text-[#1E221B]">Sehore Hub</span>
                      <span className="text-[#868A7C]">NH-48 Corridor</span>
                      <span className="font-semibold text-[#1E221B]">JNPT Terminal</span>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#3B532B]"></div>
                      <div className="flex-1 h-1 bg-[#D5CEBF] mx-1.5 relative overflow-hidden rounded-full">
                        <div className="h-full bg-[#3B532B] w-[68%] rounded-full"></div>
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full bg-[#BD8728]"></div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-[#79806F] pt-1.5 border-t border-[#E3DDD1]">
                      <span>Speed: 64 km/h &bull; e-Lock Intact</span>
                      <Link href="/orders" className="text-[#3B532B] font-semibold hover:underline flex items-center gap-0.5">
                        <span>Track Fleet</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SECTION 2: VALUE PROPOSITION */}
        <section className="px-4 sm:px-6 lg:px-8 py-12 border-t border-[#E3DDCF] bg-[#FAF8F2]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs uppercase tracking-widest font-sans font-bold text-[#5F6553]">Core Architecture</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] mt-2">Value Proposition</h2>
              <p className="mt-2 text-xs sm:text-sm text-[#666B5C]">
                Direct connection, fair markets, and verified agricultural supply chain platform
              </p>
            </div>

            {/* Three Structured Architectural Panels */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Pillar 1: Direct Connection */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-7 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#3B532B] flex items-center justify-center text-[#FAF8F2] mb-5">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-sans font-bold tracking-wider uppercase text-[#1E221B]">Direct Connection</h3>
                  <p className="mt-3 text-xs leading-relaxed text-[#5A6051]">
                    Direct connection, trust flow, and agricultural commerce for real farmers and verified bulk buyers with escrow settlement.
                  </p>
                </div>

                {/* Regional route connectivity schematic */}
                <div className="mt-8 pt-5 border-t border-[#ECE6D9]">
                  <div className="h-24 w-full bg-[#F4F0E6] rounded border border-[#E3DDD1] p-3 flex flex-col justify-between text-[11px] text-[#6E7363]">
                    <div className="flex justify-between items-center font-medium">
                      <span className="flex items-center gap-1.5 text-[#2E3F22]">
                        <span className="w-2 h-2 rounded-full bg-[#3B532B]"></span>
                        FPO Farmgate Node
                      </span>
                      <span className="text-[10px] text-[#868A7C]">Instant KYC</span>
                    </div>
                    <div className="flex items-center justify-center py-1">
                      <div className="w-full border-t border-dashed border-[#A0A696] relative">
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#F4F0E6] px-2 text-[9px] uppercase tracking-wider text-[#576846]">Direct Dispatch</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center font-medium">
                      <span className="flex items-center gap-1.5 text-[#2E3F22]">
                        <span className="w-2 h-2 rounded-full bg-[#BD8728]"></span>
                        Processing Unit / Miller
                      </span>
                      <span className="text-[10px] text-[#868A7C]">Escrow Protected</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 2: Fair Markets */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-7 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#3B532B] flex items-center justify-center text-[#FAF8F2] mb-5">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v18" />
                      <path d="m3 9 9-6 9 6" />
                      <path d="m3 9 3 7h6l-3-7" />
                      <path d="m15 9 3 7h6l-3-7" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-sans font-bold tracking-wider uppercase text-[#1E221B]">Fair Markets</h3>
                  <p className="mt-3 text-xs leading-relaxed text-[#5A6051]">
                    Real-time mandi prices, quality grade transparency, and automated modal price benchmarking without arbitrary deductions.
                  </p>
                </div>

                {/* Market pricing distribution graphic */}
                <div className="mt-8 pt-5 border-t border-[#ECE6D9]">
                  <div className="h-24 w-full bg-[#F4F0E6] rounded border border-[#E3DDD1] p-3 flex flex-col justify-between text-[11px] text-[#6E7363]">
                    <div className="flex justify-between text-[10px]">
                      <span>Traditional Mandi Realization</span>
                      <span className="font-bold text-[#8B4513]">76%</span>
                    </div>
                    <div className="w-full bg-[#E5DFD2] h-2 rounded-sm overflow-hidden">
                      <div className="bg-[#A07040] h-full w-[76%]"></div>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-[#2B3F21] font-semibold">Aroha Producer Realization</span>
                      <span className="font-bold text-[#2B3F21]">94%</span>
                    </div>
                    <div className="w-full bg-[#E5DFD2] h-2 rounded-sm overflow-hidden">
                      <div className="bg-[#3B532B] h-full w-[94%]"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pillar 3: Efficient Logistics */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-7 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-full bg-[#3B532B] flex items-center justify-center text-[#FAF8F2] mb-5">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-sans font-bold tracking-wider uppercase text-[#1E221B]">Efficient Logistics</h3>
                  <p className="mt-3 text-xs leading-relaxed text-[#5A6051]">
                    Aggregated farmgate freight dispatch, digital weighbridge integration, and temperature-controlled transit across 18,000+ PIN codes.
                  </p>
                </div>

                {/* Multimodal transit pipeline schematic */}
                <div className="mt-8 pt-5 border-t border-[#ECE6D9]">
                  <div className="h-24 w-full bg-[#F4F0E6] rounded border border-[#E3DDD1] p-3 flex flex-col justify-between text-[11px] text-[#6E7363]">
                    <div className="flex items-center justify-between text-[10px] text-[#555C4A]">
                      <span>Farmgate Pickup</span>
                      <span>Transit Hub</span>
                      <span>Delivery</span>
                    </div>
                    <div className="flex items-center justify-between px-2">
                      <div className="w-3 h-3 rounded-full bg-[#3B532B]"></div>
                      <div className="flex-1 h-0.5 bg-[#B8C2AC]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#BD8728]"></div>
                      <div className="flex-1 h-0.5 bg-[#B8C2AC]"></div>
                      <div className="w-3 h-3 rounded-full bg-[#3B532B]"></div>
                    </div>
                    <div className="flex justify-between text-[9px] uppercase tracking-wider text-[#79806F]">
                      <span>e-Weighment</span>
                      <span>GPS Telematics</span>
                      <span>Instant Release</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: MANDI INTELLIGENCE */}
        <section id="mandi-intelligence" className="px-4 sm:px-6 lg:px-8 py-14 border-t border-[#DFD8CB] bg-[#F4F1E8]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-[#DFD8CB]">
              <div>
                <span className="text-xs uppercase tracking-widest font-sans font-bold text-[#536247]">Market Data Synchronization</span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] mt-1">Mandi Intelligence</h2>
                <p className="mt-1 text-xs sm:text-sm text-[#616857]">
                  Live APMC arrivals, modal price benchmarks, and inter-mandi price spreads
                </p>
              </div>

              {/* Commodity Selector Tabs */}
              <div className="mt-4 md:mt-0 flex flex-wrap gap-1.5 bg-[#E7E1D2] p-1 rounded-md border border-[#D5CEBF]">
                {Object.keys(MANDI_DATA).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedCrop(key)}
                    className={`px-3 py-1.5 text-xs font-semibold capitalize rounded-sm transition-colors ${
                      selectedCrop === key
                        ? 'bg-[#3B532B] text-[#FAF8F2]'
                        : 'text-[#48503E] hover:bg-[#DDD6C5]'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Mandi Intelligence Grid: Chart + Regional Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Chart Card */}
              <div className="lg:col-span-7 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-serif font-bold text-base text-[#1E221B]">{currentMandi.title}</h3>
                    <span className="text-xs text-[#6B7260]">Modal Price Trend (9-Month Trajectory)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold uppercase text-[#3B532B] bg-[#EBE7DA] px-2.5 py-1 rounded border border-[#D8D0C0]">
                      Live APMC Synchronized
                    </span>
                  </div>
                </div>

                {/* SVG Trendline Graphic */}
                <div className="w-full overflow-hidden border border-[#E3DDD1] bg-[#F7F4EB] rounded p-4">
                  <div className="flex justify-between text-[11px] text-[#7A8070] mb-2 font-mono">
                    <span>Peak: ₹{maxVal.toFixed(0)}</span>
                    <span>Modal Curve</span>
                    <span>Base: ₹{minVal.toFixed(0)}</span>
                  </div>
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-44">
                    {/* Area fill */}
                    <polygon points={areaPoints} fill="#3B532B" fillOpacity="0.12" />
                    {/* Baseline grid */}
                    <line x1="30" y1={chartHeight - 25} x2={chartWidth - 30} y2={chartHeight - 25} stroke="#D0C8B8" strokeWidth="1" />
                    <line x1="30" y1={(chartHeight - 25) / 2} x2={chartWidth - 30} y2={(chartHeight - 25) / 2} stroke="#E2DCD0" strokeWidth="1" strokeDasharray="4" />
                    {/* Main stroke line */}
                    <polyline fill="none" stroke="#3B532B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={svgPoints} />
                    {/* Points markers */}
                    {points.map((val, idx) => {
                      const x = 30 + (idx / (points.length - 1)) * (chartWidth - 60);
                      const y = chartHeight - 25 - ((val - minVal) / (maxVal - minVal)) * (chartHeight - 50);
                      return (
                        <g key={idx}>
                          <circle cx={x} cy={y} r="4" fill="#FCFAF6" stroke="#3B532B" strokeWidth="2" />
                        </g>
                      );
                    })}
                  </svg>
                  <div className="flex justify-between text-[10px] text-[#737A68] mt-2 font-sans uppercase tracking-wider">
                    <span>Jan</span>
                    <span>Feb</span>
                    <span>Mar</span>
                    <span>Apr</span>
                    <span>May</span>
                    <span>Jun</span>
                    <span>Jul</span>
                    <span>Aug</span>
                    <span>Sep</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-[#5D6352] pt-3 border-t border-[#ECE5D8]">
                  <span>National APMC Weighted Average: <strong className="text-[#1E221B]">{points[points.length - 1]} / Qtl</strong></span>
                  <span className="text-[#3B532B] font-semibold">Updated 10 mins ago</span>
                </div>
              </div>

              {/* Regional Mandi Table */}
              <div className="lg:col-span-5 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6">
                <div className="mb-4">
                  <h3 className="font-serif font-bold text-base text-[#1E221B]">Regional APMC Mandi Rates</h3>
                  <span className="text-xs text-[#6B7260]">Real-time arrivals and modal clearing prices</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#DFD8CB] text-[#69705E] uppercase tracking-wider text-[10px]">
                        <th className="py-2 font-semibold">State / Mandi</th>
                        <th className="py-2 font-semibold">Modal Price</th>
                        <th className="py-2 font-semibold">Arrivals</th>
                        <th className="py-2 font-semibold text-right">Trend</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EBE5D7]">
                      {currentMandi.data.map((item, idx) => (
                        <tr key={idx} className="hover:bg-[#F5F2E8]">
                          <td className="py-2.5">
                            <span className="block font-bold text-[#1E221B]">{item.mandi}</span>
                            <span className="text-[10px] text-[#787E6E]">{item.state}</span>
                          </td>
                          <td className="py-2.5 font-bold text-[#2A3B1E]">{item.modalPrice}</td>
                          <td className="py-2.5 text-[#585E4E]">{item.arrivals}</td>
                          <td className="py-2.5 text-right font-medium text-[#3B532B]">{item.trend}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 pt-4 border-t border-[#DFD8CB] flex items-center justify-between">
                  <span className="text-[11px] text-[#69705E]">Source: Agmarknet & Direct FPO Feeds</span>
                  <Link href="/marketplace" className="text-xs font-semibold text-[#3B532B] hover:underline">
                    View Full Mandi Index
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: MARKETPLACE SHOWCASE */}
        <section className="px-4 sm:px-6 lg:px-8 py-14 border-t border-[#DFD8CB] bg-[#FAF8F2]">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-[#DFD8CB]">
              <div>
                <span className="text-xs uppercase tracking-widest font-sans font-bold text-[#556448]">Live Trading Batches</span>
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] mt-1">Marketplace Showcase</h2>
                <p className="mt-1 text-xs sm:text-sm text-[#616857]">
                  Verified producer lots available for spot procurement and contract forward settlement
                </p>
              </div>

              {/* Filters */}
              <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-3">
                <div className="flex bg-[#EAE4D6] p-1 rounded border border-[#D5CEBF] text-xs">
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className={`px-3 py-1 font-medium rounded-sm ${categoryFilter === 'all' ? 'bg-[#3B532B] text-[#FAF8F2]' : 'text-[#4A5240]'}`}
                  >
                    All Batches
                  </button>
                  <button
                    onClick={() => setCategoryFilter('grains')}
                    className={`px-3 py-1 font-medium rounded-sm ${categoryFilter === 'grains' ? 'bg-[#3B532B] text-[#FAF8F2]' : 'text-[#4A5240]'}`}
                  >
                    Grains & Pulses
                  </button>
                  <button
                    onClick={() => setCategoryFilter('perishables')}
                    className={`px-3 py-1 font-medium rounded-sm ${categoryFilter === 'perishables' ? 'bg-[#3B532B] text-[#FAF8F2]' : 'text-[#4A5240]'}`}
                  >
                    Perishables
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search crops or mandis..."
                    className="h-8 px-3 text-xs bg-[#FCFAF6] border border-[#CFC7B7] rounded text-[#1E221B] placeholder-[#888E7D] focus:outline-none focus:border-[#3B532B]"
                  />
                </div>
              </div>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURED_CROPS.filter((c) => {
                if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !c.location.toLowerCase().includes(searchQuery.toLowerCase())) {
                  return false;
                }
                if (categoryFilter === 'grains' && !['Wheat', 'Rice', 'Chickpea', 'Mustard'].some((g) => c.name.includes(g))) {
                  return false;
                }
                if (categoryFilter === 'perishables' && !['Onion', 'Potato'].some((p) => c.name.includes(p))) {
                  return false;
                }
                return true;
              }).map((crop) => (
                <div key={crop.id} className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] overflow-hidden flex flex-col justify-between">
                  <div>
                    {/* Crop Image */}
                    <div className="relative h-44 w-full bg-[#EAE4D6] border-b border-[#DFD8CB]">
                      <Image
                        src={crop.image}
                        alt={crop.name}
                        fill
                        className="object-cover"
                      />
                      <span className="absolute top-2.5 right-2.5 bg-[#2E4221] text-[#FAF8F2] text-[10px] font-sans font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                        {crop.tag}
                      </span>
                    </div>

                    {/* Crop Details */}
                    <div className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-serif font-bold text-lg text-[#1E221B]">{crop.name}</h3>
                          <span className="text-xs text-[#5D6352]">{crop.variety}</span>
                        </div>
                      </div>

                      <div className="mt-4 space-y-1.5 text-xs text-[#505746] pt-3 border-t border-[#ECE5D8]">
                        <div className="flex justify-between">
                          <span className="text-[#7A8070]">Location / Mandi:</span>
                          <span className="font-medium text-[#1E221B] text-right">{crop.location}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7A8070]">Available Quantity:</span>
                          <span className="font-semibold text-[#1E221B]">{crop.quantity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#7A8070]">Producer Organization:</span>
                          <span className="font-medium text-[#3B532B]">{crop.seller}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Pricing and Action */}
                  <div className="p-5 pt-0">
                    <div className="flex items-center justify-between p-3 bg-[#F4F0E6] rounded border border-[#E0D9CB]">
                      <div>
                        <span className="block text-[10px] text-[#7A8070] uppercase tracking-wider font-semibold">Offer Price</span>
                        <span className="text-base font-serif font-bold text-[#1E221B]">{crop.price}</span>
                      </div>
                      <Link href="/marketplace">
                        <button className="px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#3B532B] text-[#FAF8F2] rounded hover:bg-[#2D4021]">
                          Procure Lot
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link href="/marketplace">
                <button className="h-11 px-8 text-xs font-bold uppercase tracking-wider border border-[#B3A996] text-[#28381D] rounded-md hover:bg-[#EAE4D6]">
                  Browse All 90 Available Crop Listings
                </button>
              </Link>
            </div>
          </div>
        </section>

        {/* SECTION 5: AI SELLING DECISIONS & ARBITRAGE */}
        <section className="px-4 sm:px-6 lg:px-8 py-14 border-t border-[#DFD8CB] bg-[#F2EFE7]">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-10">
              <span className="text-xs uppercase tracking-widest font-sans font-bold text-[#556448]">Advisory Intelligence</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] mt-1">AI Selling Decisions</h2>
              <p className="mt-1 text-xs sm:text-sm text-[#616857]">
                Multi-mandi distance arbitrage, seasonal price forecasting, and farmgate net realization analytics
              </p>
            </div>

            {/* Decision Workflow & Comparative Realization */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Decision Flow Architecture */}
              <div className="lg:col-span-6 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-7 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#1E221B] mb-2">Selling Channel Decision Tree</h3>
                  <p className="text-xs text-[#636A59] mb-6">
                    Aroha algorithms analyze live moisture grades, freight transit costs, and warehouse pledge rates to guide optimal farmer monetization.
                  </p>

                  <div className="space-y-4">
                    {/* Node 1 */}
                    <div className="p-3.5 rounded border border-[#DFD8CB] bg-[#F7F4EB]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#1E221B]">
                        <span>Option A: Immediate Local APMC Yard</span>
                        <span className="text-[#8B5A2B]">Net: ₹2,280 / Qtl</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#69705F]">
                        Local transport deduction (₹45/Qtl) + mandi cess (₹35/Qtl) + cash discount margin. Immediate cash, lower realization.
                      </p>
                    </div>

                    {/* Node 2 */}
                    <div className="p-3.5 rounded border border-[#C5D4B8] bg-[#F0F5EC]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#2A421C]">
                        <span>Option B: Aroha Inter-State Direct Miller Dispatch (Recommended)</span>
                        <span className="text-[#2A421C]">Net: ₹2,510 / Qtl (+10.1%)</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#4F6242]">
                        Buyer absorbs freight. Direct digital weighment slip and escrow release upon unloading. Zero commission deductions.
                      </p>
                    </div>

                    {/* Node 3 */}
                    <div className="p-3.5 rounded border border-[#DFD8CB] bg-[#F7F4EB]">
                      <div className="flex items-center justify-between text-xs font-bold text-[#1E221B]">
                        <span>Option C: WDRA Warehouse Storage & Pledge Loan</span>
                        <span className="text-[#56604C]">Est. 60-Day Net: ₹2,690 / Qtl</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#69705F]">
                        Storage cost (₹55/Qtl/mo). Aroha facilitates 75% loan against electronic warehouse receipt (e-NWR) during seasonal supply glut.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#DFD8CB] flex items-center justify-between text-xs text-[#5D6352]">
                  <span>Algorithmic Confidence: <strong>94.8%</strong></span>
                  <span className="text-[#3B532B] font-semibold">Updated with Daily APMC Arrivals</span>
                </div>
              </div>

              {/* Comparative Realization Table */}
              <div className="lg:col-span-6 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-7 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-base text-[#1E221B] mb-2">Net Producer Realization Benchmarking</h3>
                  <p className="text-xs text-[#636A59] mb-5">
                    Net cash received by farmers after factoring transit freight, handling, and trader margins across major commodities.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#DFD8CB] text-[#6B7260] uppercase text-[10px]">
                          <th className="py-2.5">Commodity</th>
                          <th className="py-2.5">Local Yard Net</th>
                          <th className="py-2.5">Aroha Direct Net</th>
                          <th className="py-2.5 text-right font-bold text-[#3B532B]">Net Uplift</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EBE5D7]">
                        <tr>
                          <td className="py-3 font-semibold text-[#1E221B]">Sharbati Wheat</td>
                          <td className="py-3 text-[#6E7364]">₹2,280 / Qtl</td>
                          <td className="py-3 font-bold text-[#2A3F1F]">₹2,510 / Qtl</td>
                          <td className="py-3 text-right font-bold text-[#3B532B]">+₹230 / Qtl</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-semibold text-[#1E221B]">Basmati Rice 1121</td>
                          <td className="py-3 text-[#6E7364]">₹3,840 / Qtl</td>
                          <td className="py-3 font-bold text-[#2A3F1F]">₹4,180 / Qtl</td>
                          <td className="py-3 text-right font-bold text-[#3B532B]">+₹340 / Qtl</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-semibold text-[#1E221B]">Desi Chickpea</td>
                          <td className="py-3 text-[#6E7364]">₹5,290 / Qtl</td>
                          <td className="py-3 font-bold text-[#2A3F1F]">₹5,620 / Qtl</td>
                          <td className="py-3 text-right font-bold text-[#3B532B]">+₹330 / Qtl</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-semibold text-[#1E221B]">Yellow Mustard</td>
                          <td className="py-3 text-[#6E7364]">₹4,940 / Qtl</td>
                          <td className="py-3 font-bold text-[#2A3F1F]">₹5,310 / Qtl</td>
                          <td className="py-3 text-right font-bold text-[#3B532B]">+₹370 / Qtl</td>
                        </tr>
                        <tr>
                          <td className="py-3 font-semibold text-[#1E221B]">Nashik Red Onion</td>
                          <td className="py-3 text-[#6E7364]">₹1,620 / Qtl</td>
                          <td className="py-3 font-bold text-[#2A3F1F]">₹1,860 / Qtl</td>
                          <td className="py-3 text-right font-bold text-[#3B532B]">+₹240 / Qtl</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[#DFD8CB]">
                  <span className="text-[11px] text-[#6E7364] block">
                    Calculations based on verified truckload batches (10 to 25 Tonnes) transacted on the Aroha National Gateway.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 6: LOGISTICS & WAREHOUSING */}
        <section className="px-4 sm:px-6 lg:px-8 py-14 border-t border-[#DFD8CB] bg-[#FAF8F2]">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-10">
              <span className="text-xs uppercase tracking-widest font-sans font-bold text-[#556448]">Supply Chain Backbone</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] mt-1">Logistics & Warehousing</h2>
              <p className="mt-1 text-xs sm:text-sm text-[#616857]">
                Dedicated agricultural freight carriers and certified modern warehouse infrastructure
              </p>
            </div>

            {/* Split Visual Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Transport Fleet Card */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] overflow-hidden">
                <div className="relative h-64 w-full bg-[#EAE4D6]">
                  <Image
                    src="/images/logistics-truck.jpg"
                    alt="Agricultural transport cargo truck on Indian highway"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif font-bold text-lg text-[#1E221B]">Dedicated Agri-Freight Fleet</h3>
                    <span className="text-[10px] uppercase font-bold text-[#3B532B] bg-[#E8F0E2] px-2 py-0.5 rounded border border-[#CCD8C4]">
                      GPS Telematics
                    </span>
                  </div>
                  <p className="text-xs text-[#5D6352] leading-relaxed">
                    Over 8,500 verified freight trucks optimized for rural farmgate pickups and long-distance inter-state trade corridors with automated e-Way bill issuance.
                  </p>
                </div>
              </div>

              {/* Warehouse Storage Card */}
              <div className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] overflow-hidden">
                <div className="relative h-64 w-full bg-[#EAE4D6]">
                  <Image
                    src="/images/logistics-warehouse.jpg"
                    alt="Modern grain storage and cold storage warehouse facility"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif font-bold text-lg text-[#1E221B]">WDRA Certified Warehousing</h3>
                    <span className="text-[10px] uppercase font-bold text-[#3B532B] bg-[#E8F0E2] px-2 py-0.5 rounded border border-[#CCD8C4]">
                      e-NWR Ready
                    </span>
                  </div>
                  <p className="text-xs text-[#5D6352] leading-relaxed">
                    Modern scientific grain storage and cold storage warehouses across key agricultural production hubs with digital moisture testing and certified pest management.
                  </p>
                </div>
              </div>
            </div>

            {/* Three Operational Specifications */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              <div className="p-5 rounded border border-[#DFD8CB] bg-[#F7F4EB]">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#5D6B51] block mb-1">Coverage Scope</span>
                <h4 className="font-bold text-sm text-[#1E221B] mb-2">18,000+ Rural & Urban PIN Codes</h4>
                <p className="text-xs text-[#5A6051] leading-relaxed">
                  Aggregated route algorithms consolidate partial lot loads from neighbouring FPOs to reduce freight rates up to 22%.
                </p>
              </div>

              <div className="p-5 rounded border border-[#DFD8CB] bg-[#F7F4EB]">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#5D6B51] block mb-1">Quality Control</span>
                <h4 className="font-bold text-sm text-[#1E221B] mb-2">Digital Weighment & Assay Slips</h4>
                <p className="text-xs text-[#5A6051] leading-relaxed">
                  Every lot receives certified digital weighbridge receipt and moisture grade analysis, eliminating weight deductions at destination.
                </p>
              </div>

              <div className="p-5 rounded border border-[#DFD8CB] bg-[#F7F4EB]">
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#5D6B51] block mb-1">Financial Protection</span>
                <h4 className="font-bold text-sm text-[#1E221B] mb-2">Transit Insurance & In-Escrow Settlement</h4>
                <p className="text-xs text-[#5A6051] leading-relaxed">
                  Comprehensive cargo insurance against spillage or transit delays, with funds held in banking escrow until delivery sign-off.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 7: TRUST & ECOSYSTEM */}
        <section className="px-4 sm:px-6 lg:px-8 py-14 border-t border-[#DFD8CB] bg-[#F4F1E8]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="text-xs uppercase tracking-widest font-sans font-bold text-[#556448]">Platform Integrity</span>
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1E221B] mt-1">Trust in Every Transaction</h2>
              <p className="mt-1 text-xs sm:text-sm text-[#616857]">
                Proven outcomes from verified agricultural producers and corporate sourcing heads
              </p>
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="p-6 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] flex flex-col justify-between">
                <p className="text-xs text-[#3E4536] italic leading-relaxed">
                  &ldquo;Direct selling through Aroha eliminated 8% middleman commission on our 450-tonne wheat harvest and cleared payment in our FPO bank account within 24 hours of weighbridge confirmation.&rdquo;
                </p>
                <div className="mt-6 pt-4 border-t border-[#ECE5D8]">
                  <span className="block font-bold text-xs text-[#1E221B]">Gurpreet Singh</span>
                  <span className="text-[11px] text-[#69705E]">Director, Malwa Farmer Producer Co. (Punjab)</span>
                </div>
              </div>

              <div className="p-6 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] flex flex-col justify-between">
                <p className="text-xs text-[#3E4536] italic leading-relaxed">
                  &ldquo;We procure 600 tonnes of Grade A wheat and mustard monthly through Aroha. Zero moisture disputes, authentic provenance, and reliable batch deliveries straight to our mill.&rdquo;
                </p>
                <div className="mt-6 pt-4 border-t border-[#ECE5D8]">
                  <span className="block font-bold text-xs text-[#1E221B]">Rajesh Singhal</span>
                  <span className="text-[11px] text-[#69705E]">Head of Procurement, Golden Grain Flour Mills</span>
                </div>
              </div>

              <div className="p-6 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] flex flex-col justify-between">
                <p className="text-xs text-[#3E4536] italic leading-relaxed">
                  &ldquo;Consolidated farm loads give our fleet guaranteed return trips from agricultural belts to industrial centers. Transparent digital trip sheets and prompt toll settlements.&rdquo;
                </p>
                <div className="mt-6 pt-4 border-t border-[#ECE5D8]">
                  <span className="block font-bold text-xs text-[#1E221B]">Devendra Joshi</span>
                  <span className="text-[11px] text-[#69705E]">Operations Head, Kisan Express Logistics</span>
                </div>
              </div>
            </div>

            {/* Dual Onboarding Gateways */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* For Farmers */}
              <div className="p-8 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#3B532B] bg-[#E8F0E2] px-2.5 py-1 rounded border border-[#CCD8C4]">
                    Producers & FPOs
                  </span>
                  <h3 className="font-serif font-bold text-xl text-[#1E221B] mt-4 mb-2">For Farmers & FPOs</h3>
                  <p className="text-xs text-[#5D6352] leading-relaxed mb-6">
                    List harvested crops with transparent digital grade testing, bypass informal trader deductions, and access verified buyers across India with guaranteed escrow settlements.
                  </p>
                </div>
                <Link href="/seller/register">
                  <button className="h-11 px-6 text-xs font-bold uppercase tracking-wider bg-[#3B532B] text-[#FAF8F2] rounded hover:bg-[#2D4021]">
                    Register as Farmer / FPO
                  </button>
                </Link>
              </div>

              {/* For Buyers */}
              <div className="p-8 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-[#7A5B18] bg-[#F7EEDC] px-2.5 py-1 rounded border border-[#E0D0B0]">
                    Institutional Procurement
                  </span>
                  <h3 className="font-serif font-bold text-xl text-[#1E221B] mt-4 mb-2">For Institutional Buyers & Millers</h3>
                  <p className="text-xs text-[#5D6352] leading-relaxed mb-6">
                    Source truckload volumes of grains, oilseeds, and pulses directly from certified farmgate origins with complete batch traceability, automated e-Way bills, and multi-origin logistics.
                  </p>
                </div>
                <Link href="/register">
                  <button className="h-11 px-6 text-xs font-bold uppercase tracking-wider border border-[#B3A996] text-[#28381D] rounded hover:bg-[#EAE4D6]">
                    Register as Institutional Buyer
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 8: FINAL CALL TO ACTION */}
        <section className="px-4 sm:px-6 lg:px-8 py-12">
          <div className="max-w-7xl mx-auto rounded-lg border border-[#3E5232] bg-[#23331C] text-[#F7F5EE] p-8 sm:p-12 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[#FAF8F2]">
              Transform Your Agricultural Trade Today.
            </h2>
            <p className="mt-4 text-xs sm:text-sm text-[#D4DEC9] max-w-xl mx-auto leading-relaxed">
              Connect with verified farmer producer organisations, access live mandi intelligence, and manage end-to-end freight dispatch on India&apos;s definitive agricultural network.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <button className="h-11 px-8 text-xs font-bold uppercase tracking-wider bg-[#BD8728] text-[#1D1B15] rounded hover:bg-[#A6751F]">
                  Create Aroha Account
                </button>
              </Link>
              <Link href="/marketplace">
                <button className="h-11 px-8 text-xs font-bold uppercase tracking-wider border border-[#7C8E6D] text-[#FAF8F2] rounded hover:bg-[#2F4225]">
                  Browse Live Marketplace
                </button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#31352A] bg-[#1E211A] text-[#D8D5CC] pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#2C3026]">
            {/* Column 1: Brand & Philosophy */}
            <div className="md:col-span-4">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded bg-[#3B532B] flex items-center justify-center text-[#F7F5EE]">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22V12" />
                    <path d="M12 12c0-4 3-7 7-7" />
                    <path d="M12 15c-3 0-5-2-5-5 0-3 3-5 5-5" />
                  </svg>
                </div>
                <span className="text-xl font-serif font-bold text-[#F7F5EE]">Aroha</span>
              </div>
              <p className="text-xs text-[#9B9E93] leading-relaxed max-w-sm">
                India&apos;s definitive agricultural trade and logistics exchange. Built to connect verified farmers and FPOs directly with food processors, millers, and institutional buyers.
              </p>
              <div className="mt-5 text-[11px] text-[#7A7E72]">
                Compliant with National Agricultural Market standards and electronic negotiable warehouse receipt systems.
              </div>
            </div>

            {/* Column 2: Platform Links */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#FAF8F2] mb-3 font-sans">Platform</h4>
              <ul className="space-y-2 text-xs text-[#A2A69A]">
                <li><Link href="/marketplace" className="hover:text-[#FAF8F2]">Marketplace</Link></li>
                <li><Link href="/categories" className="hover:text-[#FAF8F2]">Commodity Index</Link></li>
                <li><Link href="/fpo" className="hover:text-[#FAF8F2]">FPO Directory</Link></li>
                <li><Link href="/marketplace/sourcing" className="hover:text-[#FAF8F2]">Bulk Sourcing</Link></li>
              </ul>
            </div>

            {/* Column 3: Stakeholders */}
            <div className="md:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#FAF8F2] mb-3 font-sans">Stakeholders</h4>
              <ul className="space-y-2 text-xs text-[#A2A69A]">
                <li><Link href="/seller/register" className="hover:text-[#FAF8F2]">For Farmers</Link></li>
                <li><Link href="/fpo" className="hover:text-[#FAF8F2]">For FPO Collectives</Link></li>
                <li><Link href="/register" className="hover:text-[#FAF8F2]">For Millers & Processors</Link></li>
                <li><Link href="/login" className="hover:text-[#FAF8F2]">Logistics Partners</Link></li>
                <li><Link href="/admin" className="hover:text-[#FAF8F2]">Nodal Administrators</Link></li>
              </ul>
            </div>

            {/* Column 4: Institutional Certifications */}
            <div className="md:col-span-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#FAF8F2] mb-3 font-sans">Institutional Compliance</h4>
              <p className="text-xs text-[#9B9E93] leading-relaxed mb-4">
                Operating with banking escrow protections, certified digital assaying standards, and integrated GST e-Way billing.
              </p>
              <div className="flex flex-wrap gap-2 text-[10px] text-[#A6AB9E]">
                <span className="px-2.5 py-1 rounded bg-[#272B22] border border-[#383D31]">e-NAM Interoperable</span>
                <span className="px-2.5 py-1 rounded bg-[#272B22] border border-[#383D31]">FSSAI Assayed</span>
                <span className="px-2.5 py-1 rounded bg-[#272B22] border border-[#383D31]">WDRA Aligned</span>
                <span className="px-2.5 py-1 rounded bg-[#272B22] border border-[#383D31]">Digital India</span>
              </div>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#787D70]">
            <p>Aroha Agricultural Marketplace Exchange. All rights reserved.</p>
            <div className="flex gap-4 mt-3 sm:mt-0">
              <Link href="/marketplace" className="hover:text-[#A6AB9E]">Terms of Trade</Link>
              <Link href="/marketplace" className="hover:text-[#A6AB9E]">Privacy Policy</Link>
              <Link href="/marketplace" className="hover:text-[#A6AB9E]">Escrow Guidelines</Link>
              <Link href="/marketplace" className="hover:text-[#A6AB9E]">Quality Benchmarks</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
