'use client';

import type { PaginationMeta } from '@/lib/api';

interface PaginationControlsProps {
  meta: PaginationMeta;
  onPageChange: (newPage: number) => void;
  isLoading?: boolean;
}

export function PaginationControls({
  meta,
  onPageChange,
  isLoading,
}: PaginationControlsProps) {
  const { page, totalPages, total } = meta;

  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-[#DFD8CB] pt-6 sm:flex-row">
      <div className="text-xs text-[#6B7260]">
        Showing Page <span className="font-bold text-[#1E221B]">{page}</span> of{' '}
        <span className="font-bold text-[#1E221B]">{totalPages}</span> (
        {total} total batches)
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page <= 1 || isLoading}
          className="h-8 px-3 text-xs font-semibold text-[#283C22] border border-[#DFD8CB] bg-[#FFFFFF] rounded hover:bg-[#F2EFE7] disabled:opacity-50"
        >
          Previous
        </button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const showEllipsis = prev && p - prev > 1;

              return (
                <div key={p} className="flex items-center gap-1">
                  {showEllipsis && <span className="px-1 text-xs text-[#6B7260]">...</span>}
                  <button
                    onClick={() => onPageChange(p)}
                    disabled={isLoading}
                    className={`h-8 w-8 text-xs font-semibold rounded border transition-colors ${
                      p === page
                        ? 'bg-[#233D22] text-[#FAF8F2] border-[#233D22]'
                        : 'bg-[#FFFFFF] text-[#283C22] border-[#DFD8CB] hover:bg-[#F2EFE7]'
                    }`}
                  >
                    {p}
                  </button>
                </div>
              );
            })}
        </div>

        <button
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page >= totalPages || isLoading}
          className="h-8 px-3 text-xs font-semibold text-[#283C22] border border-[#DFD8CB] bg-[#FFFFFF] rounded hover:bg-[#F2EFE7] disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
