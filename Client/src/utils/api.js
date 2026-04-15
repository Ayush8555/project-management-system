const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5009/api';

class ApiClient {
  constructor() {
    this.accessToken = localStorage.getItem('accessToken') || null;
  }

  setAccessToken(token) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }

  getAccessToken() {
    return this.accessToken || localStorage.getItem('accessToken');
  }

  async refreshAccessToken() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include', // Important: include cookies
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      this.setAccessToken(data.accessToken);
      return data.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.setAccessToken(null);
      // Redirect to login if refresh fails
      window.location.href = '/login';
      throw error;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    let token = this.getAccessToken();

    // Skip auth check for public endpoints
    const publicEndpoints = ['/auth/login', '/auth/register', '/auth/refresh'];
    const isPublicEndpoint = publicEndpoints.some(ep => endpoint.includes(ep));

    // If no token and not a public endpoint, try to get from localStorage
    if (!token && !isPublicEndpoint) {
      token = localStorage.getItem('accessToken');
      if (token) {
        this.accessToken = token;
      }
    }

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: 'include', // Important: include cookies for refresh token
    };

    try {
      let response = await fetch(url, config);

      // If 401 (Unauthorized), try to refresh token
      if (response.status === 401 && !isPublicEndpoint) {
        // If we have a token, try to refresh it
        if (token) {
          try {
            const newToken = await this.refreshAccessToken();
            // Retry the request with new token
            config.headers.Authorization = `Bearer ${newToken}`;
            response = await fetch(url, config);
          } catch (refreshError) {
            // Refresh failed, clear token and redirect only if not already on login
            this.setAccessToken(null);
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            throw new Error('Session expired. Please login again.');
          }
        } else {
          // No token at all - don't redirect if already on login or if auth is still loading
          // Just throw error and let components handle it
          throw new Error('Access token is required');
        }
      }

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Auth methods
  async register(name, email, password) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    if (data.accessToken) {
      this.setAccessToken(data.accessToken);
    }
    return data;
  }

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.accessToken) {
      this.setAccessToken(data.accessToken);
    }
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setAccessToken(null);
      // Clear any other auth-related data
      localStorage.removeItem('accessToken');
    }
  }

  async getCurrentUser() {
    return await this.request('/auth/me', {
      method: 'GET',
    });
  }

  async refreshToken() {
    return await this.refreshAccessToken();
  }

  // Workspace methods
  async getWorkspaces() {
    return await this.get('/workspaces');
  }

  async getWorkspace(id) {
    return await this.get(`/workspaces/${id}`);
  }

  async createWorkspace(data) {
    return await this.post('/workspaces', data);
  }

  async updateWorkspace(id, data) {
    return await this.put(`/workspaces/${id}`, data);
  }

  async deleteWorkspace(id) {
    return await this.delete(`/workspaces/${id}`);
  }

  async addWorkspaceMembers(workspaceId, userIds) {
    return await this.post(`/workspaces/${workspaceId}/members`, { userIds });
  }

  async removeWorkspaceMember(workspaceId, memberId) {
    return await this.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  }

  async inviteWorkspaceMember(workspaceId, email) {
    return await this.post(`/workspaces/${workspaceId}/invite`, { email });
  }

  // Project methods
  async getProjects(workspaceId = null) {
    const query = workspaceId ? `?workspaceId=${workspaceId}` : '';
    return await this.get(`/projects${query}`);
  }

  // Dashboard method — single call for all dashboard data
  async getDashboard(workspaceId) {
    return await this.get(`/dashboard?workspaceId=${workspaceId}`);
  }

  async getProject(id) {
    return await this.get(`/projects/${id}`);
  }

  async createProject(data) {
    return await this.post('/projects', data);
  }

  async updateProject(id, data) {
    return await this.put(`/projects/${id}`, data);
  }

  async deleteProject(id) {
    return await this.delete(`/projects/${id}`);
  }

  async addProjectMembers(projectId, userIds) {
    return await this.post(`/projects/${projectId}/members`, { userIds });
  }

  async removeProjectMember(projectId, memberId) {
    return await this.delete(`/projects/${projectId}/members/${memberId}`);
  }

  // Task methods
  async getTasks(projectId = null, status = null, assigneeId = null) {
    const params = new URLSearchParams();
    if (projectId) params.append('projectId', projectId);
    if (status) params.append('status', status);
    if (assigneeId) params.append('assigneeId', assigneeId);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await this.get(`/tasks${query}`);
  }

  async getTask(id) {
    return await this.get(`/tasks/${id}`);
  }

  async createTask(data) {
    return await this.post('/tasks', data);
  }

  async updateTask(id, data) {
    return await this.put(`/tasks/${id}`, data);
  }

  async deleteTask(id) {
    return await this.delete(`/tasks/${id}`);
  }

  // Comment methods
  async getComments(taskId) {
    return await this.get(`/comments?taskId=${taskId}`);
  }

  async createComment(data) {
    return await this.post('/comments', data);
  }

  async deleteComment(id) {
    return await this.delete(`/comments/${id}`);
  }

  // User methods
  async getUsers(workspaceId = null, search = null) {
    const params = new URLSearchParams();
    if (workspaceId) params.append('workspaceId', workspaceId);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return await this.get(`/users${query}`);
  }

  // Search method
  async search(query) {
    return await this.get(`/search?q=${encodeURIComponent(query)}`);
  }

  // Generic methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;

