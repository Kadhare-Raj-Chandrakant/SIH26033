'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { MarketplaceNavbar } from '@/components/marketplace/marketplace-navbar';
import { fetchCategories, type Category } from '@/lib/api';

const CATEGORY_META: Record<string, { crops: string; states: string; badge: string }> = {
  'cereals-grains': {
    crops: 'Sharbati Wheat, Pusa 1121 Basmati, Maize, Barley',
    states: 'Punjab, Haryana, Madhya Pradesh, Rajasthan',
    badge: 'Staple Grains',
  },
  'pulses-legumes': {
    crops: 'Desi Chana, Green Gram (Moong), Black Gram (Urad), Pigeon Pea (Tur)',
    states: 'Madhya Pradesh, Rajasthan, Maharashtra, Karnataka',
    badge: 'High Protein',
  },
  'oilseeds': {
    crops: 'Yellow Mustard, Soybean, Groundnut, Sesame',
    states: 'Rajasthan, Gujarat, Madhya Pradesh, Maharashtra',
    badge: 'Industrial & Edible Oils',
  },
  'vegetables': {
    crops: 'Nashik Red Onion, Kufri Jyoti Potato, Hybrid Tomato',
    states: 'Maharashtra, Uttar Pradesh, Andhra Pradesh, Gujarat',
    badge: 'Fresh Farmgate Harvest',
  },
  'spices-condiments': {
    crops: 'Guntur Dry Red Chilli, Nizamabad Turmeric, Unjha Cumin',
    states: 'Andhra Pradesh, Telangana, Gujarat, Rajasthan',
    badge: 'Export Quality Assayed',
  },
  'fruits': {
    crops: 'Alphonso & Banganapalli Mango, Robusta Banana, Shimla Royal Apple',
    states: 'Maharashtra, Andhra Pradesh, Himachal Pradesh, Tamil Nadu',
    badge: 'Cold Storage Transit',
  },
};

export default function CategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: categoriesResponse, isLoading, isError } = useQuery<{ success: boolean; data: Category[] }>({
    queryKey: ['marketplace-categories'],
    queryFn: fetchCategories,
  });

  const categories = categoriesResponse?.data || [];

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F5EE] text-[#1E221B]">
      <MarketplaceNavbar />

      {/* Header Banner */}
      <section className="border-b border-[#DFD8CB] bg-[#FAF8F2] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#E2EDE2] text-[#233D22] border border-[#CCDBCB] mb-2.5">
              National Commodity Classification
            </span>
            <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#1E221B]">
              Agricultural Commodity Directory
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#616857] leading-relaxed">
              Browse certified produce lots categorized by APMC commodity standards, verified farmgate origins, and wholesale trading specifications.
            </p>
          </div>

          {/* Search Box */}
          <div className="mt-6 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category, grains, pulses, spices..."
              className="w-full h-10 px-3.5 text-xs bg-[#FFFFFF] border border-[#DFD8CB] rounded text-[#1E221B] placeholder-[#8A9082] focus:outline-none focus:border-[#233D22]"
            />
          </div>
        </div>
      </section>

      {/* Main Grid View */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {isLoading && (
          <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
            <p className="text-sm font-serif font-bold text-[#1E221B]">
              Loading Commodity Categories...
            </p>
          </div>
        )}

        {isError && (
          <div className="p-8 text-center border border-[#E5B5B5] rounded-lg bg-[#FDF2F2]">
            <h3 className="font-serif font-bold text-base text-[#9B1C1C]">
              Unable to Load Commodity Categories
            </h3>
            <p className="mt-1 text-xs text-[#771D1D]">
              Please refresh or check your network connection.
            </p>
          </div>
        )}

        {!isLoading && !isError && filteredCategories.length === 0 && (
          <div className="p-12 text-center border border-[#DFD8CB] rounded-lg bg-[#FCFAF6]">
            <h3 className="font-serif font-bold text-lg text-[#1E221B]">
              No Categories Found
            </h3>
            <p className="mt-1 text-xs text-[#6B7260]">
              No commodity category matches &ldquo;{searchQuery}&rdquo;.
            </p>
          </div>
        )}

        {!isLoading && !isError && filteredCategories.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCategories.map((category) => {
              const meta = CATEGORY_META[category.slug] || {
                crops: 'Various commercial varieties',
                states: 'Pan-India Production Belts',
                badge: 'Certified Produce',
              };

              return (
                <div
                  key={category.id}
                  className="rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E8F0E2] text-[#233D22] px-2 py-0.5 rounded border border-[#CCDBCB]">
                        {meta.badge}
                      </span>
                      <span className="text-xs font-mono text-[#7A8070]">
                        {(category as any)._count?.products || 0} Batches
                      </span>
                    </div>

                    <h2 className="text-xl font-serif font-bold text-[#1E221B]">
                      {category.name}
                    </h2>

                    <p className="mt-2 text-xs text-[#5D6352] leading-relaxed">
                      {category.description ||
                        `Direct trade procurement for certified ${category.name.toLowerCase()} lots.`}
                    </p>

                    <div className="mt-4 pt-3 border-t border-[#ECE5D8] space-y-1.5 text-xs">
                      <div>
                        <span className="text-[#7A8070] block text-[10px] uppercase font-bold">Key Commodities</span>
                        <span className="font-medium text-[#1E221B]">{meta.crops}</span>
                      </div>
                      <div className="pt-1">
                        <span className="text-[#7A8070] block text-[10px] uppercase font-bold">Primary Producing States</span>
                        <span className="font-medium text-[#1E221B]">{meta.states}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#ECE5D8]">
                    <Link
                      href={`/marketplace?categoryId=${category.id}`}
                      className="inline-flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] rounded transition-colors"
                    >
                      <span>Explore {category.name}</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#DFD8CB] bg-[#FAF8F2] py-8 text-center text-xs text-[#6B7260]">
        <div className="max-w-7xl mx-auto px-4">
          <p>Aroha Agricultural Marketplace Commodity Classification Index</p>
        </div>
      </footer>
    </div>
  );
}
