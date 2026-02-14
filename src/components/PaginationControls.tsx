import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
}

export function PaginationControls({
  currentPage, totalPages, totalItems, startIndex, endIndex, goToPage,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        {startIndex}-{endIndex} de {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => goToPage(1)}>
          <ChevronsLeft size={14} />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => goToPage(currentPage - 1)}>
          <ChevronLeft size={14} />
        </Button>
        <span className="text-sm px-3 font-medium">{currentPage} / {totalPages}</span>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => goToPage(currentPage + 1)}>
          <ChevronRight size={14} />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => goToPage(totalPages)}>
          <ChevronsRight size={14} />
        </Button>
      </div>
    </div>
  );
}
