/**
 * Generic Shimmer Skeleton Component
 */
export const Skeleton = ({ className }) => (
    <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded ${className}`} />
);

/**
 * Common layouts for Skeletons to replace Spinners/Loading Text
 */

export const StatsGridSkeleton = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex items-end justify-between mt-2">
                    <Skeleton className="h-8 w-12" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
        ))}
    </div>
);

export const ProjectOverviewSkeleton = () => (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden flex flex-col h-[400px]">
        <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
        </div>
        <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between">
                        <Skeleton className="h-5 w-48" />
                        <div className="flex gap-2">
                            <Skeleton className="h-5 w-16 rounded" />
                            <Skeleton className="h-5 w-5 rounded-full" />
                        </div>
                    </div>
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-4">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-24" />
                        </div>
                    </div>
                    <Skeleton className="h-1.5 w-full mt-1" />
                </div>
            ))}
        </div>
    </div>
);

export const RecentActivitySkeleton = () => (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden flex flex-col h-[400px]">
        <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
        </div>
        <div className="p-4 space-y-4">
            {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const ProjectCardSkeleton = () => (
    <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 flex flex-col h-full space-y-4">
        <div className="flex justify-between items-start">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex-1" />
        <div className="flex justify-between items-center pt-4">
            <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-24 rounded" />
            </div>
            <Skeleton className="h-6 w-16" />
        </div>
    </div>
);
