import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import apiClient from "../utils/api.js";

// Async thunks for API calls
export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchWorkspaces',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiClient.getWorkspaces();
      return response.workspaces || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const fetchWorkspace = createAsyncThunk(
  'workspace/fetchWorkspace',
  async (workspaceId, { rejectWithValue }) => {
    try {
      const response = await apiClient.getWorkspace(workspaceId);
      return response.workspace;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createWorkspace = createAsyncThunk(
  'workspace/createWorkspace',
  async (workspaceData, { rejectWithValue }) => {
    try {
      const response = await apiClient.createWorkspace(workspaceData);
      return response.workspace;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  workspaces: [],
  currentWorkspace: null,
  loading: false,
  error: null,
};

const workspaceSlice = createSlice({
  name: "workspace",
  initialState,
  reducers: {
    setCurrentWorkspace: (state, action) => {
      const workspaceId = action.payload;
      localStorage.setItem("currentWorkspaceId", workspaceId);
      state.currentWorkspace = state.workspaces.find((w) => w.id === workspaceId) || null;
    },
    clearWorkspaces: (state) => {
      state.workspaces = [];
      state.currentWorkspace = null;
      localStorage.removeItem("currentWorkspaceId");
    },
  },
  extraReducers: (builder) => {
    // Fetch workspaces
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces = action.payload;
        
        // Set current workspace if stored in localStorage
        const storedWorkspaceId = localStorage.getItem("currentWorkspaceId");
        if (storedWorkspaceId && action.payload.length > 0) {
          const workspace = action.payload.find((w) => w.id === storedWorkspaceId);
          if (workspace) {
            state.currentWorkspace = workspace;
          } else if (action.payload.length > 0) {
            // If stored workspace not found, use first workspace
            state.currentWorkspace = action.payload[0];
            localStorage.setItem("currentWorkspaceId", action.payload[0].id);
          }
        } else if (action.payload.length > 0) {
          // No stored workspace, use first one
          state.currentWorkspace = action.payload[0];
          localStorage.setItem("currentWorkspaceId", action.payload[0].id);
        }
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch single workspace
    builder
      .addCase(fetchWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        state.currentWorkspace = action.payload;
        // Update in workspaces array if exists
        const index = state.workspaces.findIndex((w) => w.id === action.payload.id);
        if (index !== -1) {
          state.workspaces[index] = action.payload;
        } else {
          state.workspaces.push(action.payload);
        }
        localStorage.setItem("currentWorkspaceId", action.payload.id);
      })
      .addCase(fetchWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Create workspace
    builder
      .addCase(createWorkspace.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createWorkspace.fulfilled, (state, action) => {
        state.loading = false;
        state.workspaces.push(action.payload);
        state.currentWorkspace = action.payload;
        localStorage.setItem("currentWorkspaceId", action.payload.id);
      })
      .addCase(createWorkspace.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setCurrentWorkspace, clearWorkspaces } = workspaceSlice.actions;
export default workspaceSlice.reducer;
