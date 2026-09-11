'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 sm:flex-row">
      <div className="text-xs text-muted-foreground">
        Showing Page <span className="font-semibold text-foreground">{page}</span> of{' '}
        <span className="font-semibold text-foreground">{totalPages}</span> (
        {total} total items)
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(page - 1, 1))}
          disabled={page <= 1 || isLoading}
          className="gap-1 text-xs"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .map((p, idx, arr) => {
              const prev = arr[idx - 1];
              const showEllipsis = prev && p - prev > 1;

              return (
                <div key={p} className="flex items-center gap-1">
                  {showEllipsis && <span className="px-1 text-xs text-muted-foreground">...</span>}
                  <Button
                    variant={p === page ? 'default' : 'outline'}
                    size="xs"
                    onClick={() => onPageChange(p)}
                    disabled={isLoading}
                    className={`h-7 w-7 text-xs ${
                      p === page ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                    }`}
                  >
                    {p}
                  </Button>
                </div>
              );
            })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(page + 1, totalPages))}
          disabled={page >= totalPages || isLoading}
          className="gap-1 text-xs"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
