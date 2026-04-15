import { Plus } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import StatsGrid from '../components/StatsGrid'
import ProjectOverview from '../components/ProjectOverview'
import RecentActivity from '../components/RecentActivity'
import TasksSummary from '../components/TasksSummary'
import CreateProjectDialog from '../components/CreateProjectDialog'
import { useAuth } from '../contexts/AuthContext'
import { useSelector } from 'react-redux'
import apiClient from '../utils/api.js'

const Dashboard = () => {

    const { user, isAuthenticated, loading: authLoading } = useAuth()
    const { currentWorkspace } = useSelector((state) => state.workspace)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dashboardData, setDashboardData] = useState(null)
    const [loading, setLoading] = useState(true)
    const hasLoadedRef = useRef(false)
    const prevDialogOpenRef = useRef(false)

    // Single API call for all dashboard data
    useEffect(() => {
        const loadDashboard = async () => {
            if (authLoading || !isAuthenticated) {
                setLoading(false)
                return
            }
            if (!currentWorkspace?.id) {
                setLoading(false)
                return
            }
            const token = apiClient.getAccessToken()
            if (!token) {
                setLoading(false)
                return
            }
            if (hasLoadedRef.current === currentWorkspace.id) {
                return
            }

            setLoading(true)
            try {
                const data = await apiClient.getDashboard(currentWorkspace.id)
                setDashboardData(data)
                hasLoadedRef.current = currentWorkspace.id
            } catch (error) {
                console.error('Failed to load dashboard:', error)
            } finally {
                setLoading(false)
            }
        }

        loadDashboard()
    }, [currentWorkspace?.id, isAuthenticated, authLoading])

    // Refresh dashboard when dialog closes (project was created)
    useEffect(() => {
        if (prevDialogOpenRef.current && !isDialogOpen && currentWorkspace?.id && isAuthenticated) {
            const token = apiClient.getAccessToken()
            if (!token) return

            const refreshDashboard = async () => {
                try {
                    const data = await apiClient.getDashboard(currentWorkspace.id)
                    setDashboardData(data)
                    hasLoadedRef.current = null
                } catch (error) {
                    console.error('Failed to refresh dashboard:', error)
                }
            }
            refreshDashboard()
        }
        prevDialogOpenRef.current = isDialogOpen
    }, [isDialogOpen, currentWorkspace?.id, isAuthenticated])

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

            <StatsGrid
                stats={dashboardData?.stats}
                loading={loading}
                workspaceName={currentWorkspace?.name}
            />

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <ProjectOverview
                        projects={dashboardData?.projects}
                        loading={loading}
                    />
                    <RecentActivity
                        tasks={dashboardData?.recentTasks}
                        loading={loading}
                    />
                </div>
                <div>
                    <TasksSummary
                        tasks={dashboardData?.myTasks}
                        loading={loading}
                        userId={user?.id}
                    />
                </div>
            </div>
        </div>
    )
}

export default Dashboard
