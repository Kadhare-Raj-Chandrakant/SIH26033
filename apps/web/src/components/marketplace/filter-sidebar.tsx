'use client';

import { useState, useEffect } from 'react';
import type { Category, MarketplaceQueryParams, FilterOptionsData } from '@/lib/api';

const DATASET_STATES_AND_DISTRICTS: Record<string, string[]> = {
  'Andhra Pradesh': ['Annamayya', 'Chittor', 'Dr.B.R.A.Konaseema', 'Guntur'],
  'Gujarat': ['Mehsana', 'Morbi'],
  'Haryana': ['Ambala'],
  'Himachal Pradesh': ['Shimla'],
  'Karnataka': ['Chikkaballapur', 'Mandya'],
  'Madhya Pradesh': ['Balaghat', 'Chhatarpur', 'Indore', 'Khargone', 'Mandsaur', 'Neemuch'],
  'Rajasthan': ['Baran', 'Ganganagar'],
  'Uttar Pradesh': ['Agra'],
  'West Bengal': ['Coochbehar', 'Darjeeling'],
};

const ALL_DATASET_STATES = Object.keys(DATASET_STATES_AND_DISTRICTS).sort();

interface FilterSidebarProps {
  categories: Category[];
  filters: MarketplaceQueryParams;
  filterOptions?: FilterOptionsData;
  onFilterChange: (newFilters: Partial<MarketplaceQueryParams>) => void;
  onResetFilters: () => void;
  isLoading?: boolean;
}

export function FilterSidebar({
  categories,
  filters,
  filterOptions,
  onFilterChange,
  onResetFilters,
  isLoading,
}: FilterSidebarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [minPriceInput, setMinPriceInput] = useState(filters.minPrice?.toString() || '');
  const [maxPriceInput, setMaxPriceInput] = useState(filters.maxPrice?.toString() || '');

  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  useEffect(() => {
    setMinPriceInput(filters.minPrice?.toString() || '');
  }, [filters.minPrice]);

  useEffect(() => {
    setMaxPriceInput(filters.maxPrice?.toString() || '');
  }, [filters.maxPrice]);

  const availableStates = filterOptions?.states?.length
    ? filterOptions.states
    : ALL_DATASET_STATES;

  const availableDistricts = filters.state
    ? filterOptions?.districtsByState?.[filters.state] ||
      DATASET_STATES_AND_DISTRICTS[filters.state] ||
      []
    : filterOptions?.allDistricts ||
      Array.from(new Set(Object.values(DATASET_STATES_AND_DISTRICTS).flat())).sort();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({
      search: searchInput.trim() || undefined,
      page: 1,
    });
  };

  const handleStateChange = (selectedState: string) => {
    onFilterChange({
      state: selectedState || undefined,
      district: undefined,
      page: 1,
    });
  };

  const handleDistrictChange = (selectedDistrict: string) => {
    onFilterChange({
      district: selectedDistrict || undefined,
      page: 1,
    });
  };

  const handlePriceApply = () => {
    const min = minPriceInput ? parseFloat(minPriceInput) : undefined;
    const max = maxPriceInput ? parseFloat(maxPriceInput) : undefined;

    onFilterChange({
      minPrice: min !== undefined && !isNaN(min) && min >= 0 ? min : undefined,
      maxPrice: max !== undefined && !isNaN(max) && max >= 0 ? max : undefined,
      page: 1,
    });
  };

  const handleCategoryClick = (categoryId?: string) => {
    onFilterChange({
      categoryId: filters.categoryId === categoryId ? undefined : categoryId,
      page: 1,
    });
  };

  const handleReset = () => {
    setSearchInput('');
    setMinPriceInput('');
    setMaxPriceInput('');
    onResetFilters();
  };

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.categoryId ||
      filters.state ||
      filters.district ||
      filters.location ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      (filters.sort && filters.sort !== 'newest')
  );

  return (
    <div className="space-y-6 rounded-lg border border-[#DFD8CB] bg-[#FCFAF6] p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#ECE5D8] pb-3.5">
        <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-[#1E221B]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#233D22]">
            <line x1="4" x2="20" y1="21" y2="21" />
            <line x1="4" x2="20" y1="14" y2="14" />
            <line x1="4" x2="20" y1="7" y2="7" />
            <circle cx="14" cy="7" r="2" />
            <circle cx="8" cy="14" r="2" />
            <circle cx="16" cy="21" r="2" />
          </svg>
          <span>Filters</span>
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            disabled={isLoading}
            className="text-[11px] font-semibold text-[#8B4513] hover:underline"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Search Input */}
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#52594B]">
          Search Crops
        </label>
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              id="marketplace-search-input"
              placeholder="Wheat, rice, mandi..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-9 pl-3 pr-8 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] placeholder-[#8A9082] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  onFilterChange({ search: undefined, page: 1 });
                }}
                className="absolute right-2.5 top-2.5 text-[#7A8070] hover:text-[#1E221B]"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            id="marketplace-search-button"
            disabled={isLoading}
            className="w-full h-8 bg-[#233D22] hover:bg-[#1C321B] text-[#FAF8F2] text-xs font-bold uppercase tracking-wider rounded"
          >
            Search
          </button>
        </form>
      </div>

      {/* State Filter */}
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#52594B]">
          Filter by State
        </label>
        <select
          value={filters.state || ''}
          onChange={(e) => handleStateChange(e.target.value)}
          className="w-full h-9 px-3 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
        >
          <option value="">All States ({availableStates.length})</option>
          {availableStates.map((stateName) => (
            <option key={stateName} value={stateName}>
              {stateName}
            </option>
          ))}
        </select>
      </div>

      {/* District Filter */}
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#52594B]">
          Filter by District
        </label>
        <select
          value={filters.district || ''}
          onChange={(e) => handleDistrictChange(e.target.value)}
          className="w-full h-9 px-3 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
        >
          <option value="">
            {filters.state ? `All Districts in ${filters.state}` : 'All Districts'}
          </option>
          {availableDistricts.map((distName) => (
            <option key={distName} value={distName}>
              {distName}
            </option>
          ))}
        </select>
      </div>

      {/* Categories */}
      <div>
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-[#52594B]">
          Commodity Category
        </label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handleCategoryClick(undefined)}
            className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
              !filters.categoryId
                ? 'bg-[#233D22] text-[#FAF8F2] border-[#233D22]'
                : 'bg-[#F7F5EE] text-[#484E40] border-[#DFD8CB] hover:bg-[#EAE4D6]'
            }`}
          >
            All Produce
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors ${
                filters.categoryId === cat.id
                  ? 'bg-[#233D22] text-[#FAF8F2] border-[#233D22]'
                  : 'bg-[#F7F5EE] text-[#484E40] border-[#DFD8CB] hover:bg-[#EAE4D6]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#52594B]">
          Price Range (₹ / Quintal)
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            min="0"
            value={minPriceInput}
            onChange={(e) => setMinPriceInput(e.target.value)}
            className="w-full h-8 px-2.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22]"
          />
          <span className="text-xs text-[#7A8070]">to</span>
          <input
            type="number"
            placeholder="Max"
            min="0"
            value={maxPriceInput}
            onChange={(e) => setMaxPriceInput(e.target.value)}
            className="w-full h-8 px-2.5 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22]"
          />
        </div>
        <button
          type="button"
          onClick={handlePriceApply}
          disabled={isLoading}
          className="mt-2 w-full h-8 text-xs font-semibold uppercase tracking-wider border border-[#C8C0AF] bg-[#FFFFFF] hover:bg-[#EAE4D6] rounded text-[#233D22]"
        >
          Apply Price
        </button>
      </div>

      {/* Sort Order */}
      <div>
        <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#52594B]">
          Sort Order
        </label>
        <select
          value={filters.sort || 'newest'}
          onChange={(e) =>
            onFilterChange({
              sort: e.target.value as MarketplaceQueryParams['sort'],
              page: 1,
            })
          }
          className="w-full h-9 px-3 text-xs bg-[#F7F5EE] border border-[#DFD8CB] rounded text-[#1E221B] focus:outline-none focus:border-[#233D22] focus:bg-[#FFFFFF]"
        >
          <option value="newest">Newest Arrivals</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="name_asc">Produce: A to Z</option>
          <option value="name_desc">Produce: Z to A</option>
        </select>
      </div>
    </div>
  );
}
