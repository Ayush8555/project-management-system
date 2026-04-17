import { Plus } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import useSWR from 'swr'
import fetcher from '../utils/fetcher'
import StatsGrid from '../components/StatsGrid'
import ProjectOverview from '../components/ProjectOverview'
import RecentActivity from '../components/RecentActivity'
import TasksSummary from '../components/TasksSummary'
import CreateProjectDialog from '../components/CreateProjectDialog'
import { StatsGridSkeleton, ProjectOverviewSkeleton, RecentActivitySkeleton } from '../components/Skeletons'
import { useAuth } from '../contexts/AuthContext'
import { useSelector } from 'react-redux'

const Dashboard = () => {
    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const { currentWorkspace } = useSelector((state) => state.workspace)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const prevDialogOpenRef = useRef(false)

    const shouldFetch = isAuthenticated && !authLoading && currentWorkspace?.id

    const { data: dashboardData, isLoading, mutate } = useSWR(
        shouldFetch ? `/api/dashboard?workspaceId=${currentWorkspace.id}` : null,
        fetcher,
        {
            revalidateOnFocus: false, // Prevents excessive refocus fetching
            dedupingInterval: 30000 // 30s cache
        }
    )

    // Refresh dashboard when dialog closes (project was created)
    useEffect(() => {
        if (prevDialogOpenRef.current && !isDialogOpen && shouldFetch) {
            mutate()
        }
        prevDialogOpenRef.current = isDialogOpen
    }, [isDialogOpen, shouldFetch, mutate])

    return (
        <div className='max-w-6xl mx-auto'>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1"> Welcome back, {user?.name || 'User'} </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Here's what's happening with your projects today </p>
                </div>

                <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-5 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white space-x-2 hover:opacity-90 transition" >
                    <Plus size={16} /> New Project
                </button>

                <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {isLoading ? (
                <div className="mt-8 mb-8"><StatsGridSkeleton /></div>
            ) : (
                <StatsGrid
                    stats={dashboardData?.stats}
                    loading={false}
                    workspaceName={currentWorkspace?.name}
                />
            )}

            <div className="grid lg:grid-cols-3 gap-8 mt-8">
                <div className="lg:col-span-2 space-y-8">
                    {isLoading ? (
                        <>
                            <ProjectOverviewSkeleton />
                            <RecentActivitySkeleton />
                        </>
                    ) : (
                        <>
                            <ProjectOverview projects={dashboardData?.projects} loading={false} />
                            <RecentActivity tasks={dashboardData?.recentTasks} loading={false} />
                        </>
                    )}
                </div>
                <div>
                    {isLoading ? (
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 h-[400px]" />
                    ) : (
                        <TasksSummary
                            tasks={dashboardData?.myTasks}
                            loading={false}
                            userId={user?.id}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default Dashboard

