import React from 'react';

export const SkeletonEmployeeCard = () => {
  return (
    <div className="relative group p-6 bg-white/70 border border-white/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] rounded-2xl flex flex-col h-[320px] overflow-hidden">
      {/* TOP: Avatar and Primary Info Skeleton */}
      <div className="flex items-start gap-4">
        {/* Avatar skeleton */}
        <div className="h-16 w-16 rounded-full bg-slate-200/50 animate-pulse flex-shrink-0" />

        {/* Info skeleton */}
        <div className="flex-1 pt-1 space-y-3 w-full">
          {/* Name */}
          <div className="h-5 bg-slate-200/50 rounded-md w-3/4 animate-pulse" />
          {/* Job Title */}
          <div className="h-4 bg-slate-200/50 rounded-md w-1/2 animate-pulse" />

          {/* Badges */}
          <div className="mt-2.5 flex items-center gap-2">
            <div className="h-5 bg-slate-200/50 rounded-full w-16 animate-pulse" />
            <div className="h-5 bg-slate-200/50 rounded-full w-20 animate-pulse" />
          </div>
        </div>
      </div>

      {/* BOTTOM: Contact Info Block Skeleton */}
      <div className="mt-auto pt-6">
        <div className="flex flex-col gap-3 bg-primary/[0.02] rounded-xl p-4 border border-primary/5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3.5">
              <div className="h-8 w-8 rounded-full bg-slate-200/50 animate-pulse flex-shrink-0" />
              <div className="h-4 bg-slate-200/50 rounded-md w-full max-w-[200px] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
