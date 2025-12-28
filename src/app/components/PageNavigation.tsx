'use client'

type PageNavigationProps = {
    currentPage: number;
    totalPages: number;
    onNext: () => void;
    onPrev: () => void;
    canGoNext: boolean;
    canGoPrev: boolean;
};

export default function PageNavigation({
    currentPage,
    totalPages,
    onNext,
    onPrev,
    canGoNext,
    canGoPrev,
}: PageNavigationProps) {
    return (
        <div className="flex items-center gap-4">
            <button
                onClick={onPrev}
                disabled={!canGoPrev}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    canGoPrev
                        ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
            >
                ← Prev
            </button>
            
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
            </div>
            
            <button
                onClick={onNext}
                disabled={!canGoNext}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    canGoNext
                        ? 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
            >
                Next →
            </button>
        </div>
    );
}

