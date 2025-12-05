import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setCurrentWorkspace } from "../features/workspaceSlice";
import { useNavigate } from "react-router-dom";
import CreateWorkspaceDialog from "./CreateWorkspaceDialog";

function WorkspaceDropdown() {

    const { workspaces } = useSelector((state) => state.workspace);
    const currentWorkspace = useSelector((state) => state.workspace?.currentWorkspace || null);
    const [isOpen, setIsOpen] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const dropdownRef = useRef(null);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const onSelectWorkspace = (organizationId) => {
        dispatch(setCurrentWorkspace(organizationId))
        setIsOpen(false);
        navigate('/')
    }

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button onClick={() => setIsOpen(prev => !prev)} className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800" >
                <div className="flex items-center gap-3">
                    {currentWorkspace?.image_url ? (
                        <img 
                            src={currentWorkspace.image_url} 
                            alt={currentWorkspace?.name || "Workspace"} 
                            className="w-8 h-8 rounded shadow"
                            onError={(e) => {
                                e.target.src = '/workspace_img_default.png';
                            }}
                        />
                    ) : (
                        <div className="w-8 h-8 rounded shadow bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                            <span className="text-xs font-semibold text-gray-600 dark:text-zinc-300">
                                {(currentWorkspace?.name || "W")[0].toUpperCase()}
                            </span>
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                            {currentWorkspace?.name || "Select Workspace"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0">
                    <div className="p-2">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>
                        {workspaces.length === 0 ? (
                            <div className="p-4 text-center text-sm text-gray-500 dark:text-zinc-400">
                                No workspaces yet
                            </div>
                        ) : (
                            workspaces.map((ws) => (
                                <div key={ws.id} onClick={() => onSelectWorkspace(ws.id)} className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800" >
                                    {ws.image_url ? (
                                        <img 
                                            src={ws.image_url} 
                                            alt={ws.name} 
                                            className="w-6 h-6 rounded" 
                                            onError={(e) => {
                                                e.target.src = '/workspace_img_default.png';
                                            }}
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
                                            <span className="text-[10px] font-semibold text-gray-600 dark:text-zinc-300">
                                                {ws.name[0].toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                            {ws.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                            {ws._count?.members || ws.members?.length || 0} members
                                        </p>
                                    </div>
                                    {currentWorkspace?.id === ws.id && (
                                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    <div 
                        onClick={() => {
                            setShowCreateDialog(true);
                            setIsOpen(false);
                        }}
                        className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800" 
                    >
                        <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300">
                            <Plus className="w-4 h-4" /> Create Workspace
                        </p>
                    </div>
                </div>
            )}
            
            {showCreateDialog && (
                <CreateWorkspaceDialog 
                    isOpen={showCreateDialog} 
                    setIsOpen={setShowCreateDialog} 
                />
            )}
        </div>
    );
}

export default WorkspaceDropdown;
