import React from "react";
import { LuChevronLeft, LuChevronRight } from "react-icons/lu";

const Pagination = ({
    currentPage,
    totalPages,
    totalResults = 0,
    limit,
    onPageChange,
}) => {
    if (totalResults === 0 || totalPages < 1) return null;

    // Helper to generate page range with ellipsis (e.g., 1 2 3 4 5 ... 99)
    const getPageNumbers = () => {
        const pages = [];
        const showMax = 5; // number of pages to show before/after ellipsis

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            if (currentPage <= 4) {
                // Near the start
                for (let i = 2; i <= 5; i++) {
                    pages.push(i);
                }
                pages.push("...");
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 3) {
                // Near the end
                pages.push("...");
                for (let i = totalPages - 4; i <= totalPages - 1; i++) {
                    pages.push(i);
                }
                pages.push(totalPages);
            } else {
                // In the middle
                pages.push("...");
                pages.push(currentPage - 1);
                pages.push(currentPage);
                pages.push(currentPage + 1);
                pages.push("...");
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const pages = getPageNumbers();
    const showingCount = Math.min(currentPage * limit, totalResults);

    return (
        <div className="fixed bottom-2 left-4 right-14 lg:left-64 xl:left-88 z-50 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-black bg-white/70 backdrop-blur-2xl px-5 py-2 shadow-[0_8px_40px_rgba(0,0,0,0.12)] transition-all duration-300">
            {/* Left and Center: Navigation Controls */}
            <div className="flex items-center gap-6">
                {/* Previous Button */}
                <button
                    onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-1 text-sm font-medium transition-all duration-200 ${currentPage === 1
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-slate-600 hover:text-indigo-600 active:scale-80 cursor-pointer"
                        }`}
                >
                    <LuChevronLeft className="text-lg" />
                    <span>Previous</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1.5">
                    {pages.map((page, index) => {
                        if (page === "...") {
                            return (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="w-8 h-8 flex items-center justify-center text-slate-400 font-medium"
                                >
                                    ...
                                </span>
                            );
                        }

                        const isActive = page === currentPage;
                        return (
                            <button
                                key={`page-${page}`}
                                onClick={() => onPageChange(page)}
                                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${isActive
                                    ? "bg-blue-500 text-white shadow-md shadow-blue-100 ring-2 ring-blue-600 ring-offset-2 cursor-default"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 cursor-pointer"
                                    }`}
                            >
                                {page}
                            </button>
                        );
                    })}
                </div>

                {/* Next Button */}
                <button
                    onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-1 text-sm font-medium transition-all duration-200 ${currentPage === totalPages
                        ? "text-gray-300 cursor-not-allowed"
                        : "text-slate-600 hover:text-indigo-600 active:scale-95 cursor-pointer"
                        }`}
                >
                    <span>Next</span>
                    <LuChevronRight className="text-lg" />
                </button>
            </div>

            {/* Right: Showing Counter */}
            <div className="text-sm text-slate-500 font-medium">
                Showing {showingCount.toLocaleString()} of {totalResults.toLocaleString()} results
            </div>
        </div>
    );
};

export default Pagination;
