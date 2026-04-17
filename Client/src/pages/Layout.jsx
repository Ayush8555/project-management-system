import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { fetchWorkspaces } from '../features/workspaceSlice'
import { useAuth } from '../contexts/AuthContext'
import { Loader2Icon } from 'lucide-react'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const { loading, workspaces } = useSelector((state) => state.workspace)
    const { isAuthenticated, loading: authLoading } = useAuth()
    const dispatch = useDispatch()

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [dispatch])

    // Fetch workspaces when authenticated
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            dispatch(fetchWorkspaces())
        }
    }, [isAuthenticated, authLoading, dispatch])

    // Show app shell skeleton while checking auth or loading workspaces
    if (authLoading || (isAuthenticated && loading && workspaces.length === 0)) {
        return (
            <div className="flex h-screen bg-white dark:bg-zinc-950">
                {/* Fake Sidebar */}
                <div className="w-68 hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 p-4 gap-4 animate-pulse">
                    <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded mb-8" />
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded" />)}
                </div>
                <div className="flex-1 flex flex-col">
                    {/* Fake Navbar */}
                    <div className="h-[60px] border-b border-zinc-200 dark:border-zinc-800 p-4 flex justify-between animate-pulse">
                        <div className="w-48 h-8 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
                    </div>
                    {/* Content area spinner fallback */}
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2Icon className="size-7 text-blue-500 animate-spin" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

export default Layout
