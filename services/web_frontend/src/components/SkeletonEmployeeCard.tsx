export const SkeletonEmployeeCard = () => {
  return (
    <div className="relative h-[282px] overflow-hidden rounded-[20px] border border-[#dfe8ef] bg-white shadow-[0_16px_36px_-28px_rgba(35,74,110,0.28)]">
      <div className="h-[118px] bg-[linear-gradient(145deg,#f8fbff_0%,#f2f7fb_100%)] px-5 pb-2 pt-4">
        <div className="flex h-full items-start gap-4">
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-full bg-slate-200/70" />

          <div className="flex h-full min-w-0 flex-1 flex-col pt-0.5">
            <div className="h-5 w-4/5 animate-pulse rounded-md bg-slate-200/65" />
            <div className="mt-2 h-4 w-3/5 animate-pulse rounded-md bg-slate-200/55" />
            <div className="mt-2 h-3.5 w-5/6 animate-pulse rounded-md bg-slate-200/50" />
            <div className="mt-auto h-4 w-20 animate-pulse rounded bg-slate-200/45" />
          </div>
        </div>
      </div>

      <div className="absolute left-0 right-0 top-[117px] h-px bg-[#dce7ef]" />
      <div className="absolute left-5 top-[116px] h-[3px] w-16 rounded-full bg-slate-300/80" />

      <div className="h-[164px] px-5 pb-4 pt-3">
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex h-7 items-center gap-3">
              <div className="h-7 w-7 shrink-0 animate-pulse rounded-[8px] bg-slate-200/55" />
              <div
                className={`h-3.5 animate-pulse rounded-md bg-slate-200/50 ${
                  index === 3 ? 'w-5/6' : index === 1 ? 'w-2/5' : 'w-3/5'
                }`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
