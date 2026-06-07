import React from "react";

const LoadingSpinner = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
                {/* Modern Spinning Ring */}
                <div className="relative w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                </div>
                {/* Brand / Loading Message */}
                <div className="flex flex-col items-center">
                    <h3 className="text-lg font-semibold text-slate-800 tracking-wide">
                        TaskForge
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 animate-pulse">
                        Loading your workspace...
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
