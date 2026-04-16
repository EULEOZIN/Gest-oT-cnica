// Auto-detectar API URL baseado no ambiente
const API_BASE = (() => {
  if (typeof window === 'undefined') return '/api';
  const hostname = window.location.hostname;
  if (hostname === 'localhost') return 'http://localhost:4000/api';
  // Produção - usar URL do Render
  return 'https://gest-ot-cnica.onrender.com/api';
})();

let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

export const getAuthToken = () => authToken;

export const isAuthenticated = () => !!authToken;

// Wrapper que tenta API e falha silenciosamente para localStorage
const tryApi = async <T>(apiFn: () => Promise<T>, fallback: T): Promise<T> => {
  if (!authToken) return fallback;
  try {
    return await apiFn();
  } catch (error) {
    console.warn('API sync failed, using local cache:', error);
    return fallback;
  }
};

// Sync functions - Tentam API, salvam localStorage se falhar
export const syncAgents = async (data: any[]) => {
  if (!authToken) return;
  try {
    // Deleta todos e recria (simplificado para demo)
    await apiRequest('/agents', { method: 'DELETE' });
    for (const agent of data) {
      await apiRequest('/agents', { method: 'POST', body: JSON.stringify(agent) });
    }
  } catch (e) {
    console.warn('Agents sync failed:', e);
  }
};

export const syncIncidents = async (data: any[]) => {
  if (!authToken) return;
  try {
    for (const incident of data) {
      if (incident.id && typeof incident.id === 'string') {
        await apiRequest(`/incidents/${incident.id}`, { method: 'PUT', body: JSON.stringify(incident) });
      } else {
        await apiRequest('/incidents', { method: 'POST', body: JSON.stringify(incident) });
      }
    }
  } catch (e) {
    console.warn('Incidents sync failed:', e);
  }
};

export const syncMeetings = async (data: any[]) => {
  if (!authToken) return;
  try {
    for (const meeting of data) {
      if (meeting.id && typeof meeting.id === 'string') {
        await apiRequest(`/meetings/${meeting.id}`, { method: 'PUT', body: JSON.stringify(meeting) });
      } else {
        await apiRequest('/meetings', { method: 'POST', body: JSON.stringify(meeting) });
      }
    }
  } catch (e) {
    console.warn('Meetings sync failed:', e);
  }
};

export const syncDailyNotes = async (data: any[]) => {
  if (!authToken) return;
  try {
    for (const note of data) {
      if (note.id && typeof note.id === 'string') {
        await apiRequest(`/daily-notes/${note.id}`, { method: 'PUT', body: JSON.stringify(note) });
      } else {
        await apiRequest('/daily-notes', { method: 'POST', body: JSON.stringify(note) });
      }
    }
  } catch (e) {
    console.warn('DailyNotes sync failed:', e);
  }
};

export const syncSchedule = async (data: any) => {
  if (!authToken) return;
  try {
    await apiRequest('/schedules', { method: 'POST', body: JSON.stringify(data) });
  } catch (e) {
    console.warn('Schedule sync failed:', e);
  }
};

export const syncSettings = async (data: any) => {
  if (!authToken) return;
  try {
    await apiRequest('/settings', { method: 'PUT', body: JSON.stringify(data) });
  } catch (e) {
    console.warn('Settings sync failed:', e);
  }
};

export const syncNotifications = async (data: any[]) => {
  if (!authToken) return;
  try {
    for (const notification of data) {
      if (notification.id && typeof notification.id === 'string') {
        await apiRequest(`/notifications/${notification.id}/read`, { method: 'PUT' });
      }
    }
  } catch (e) {
    console.warn('Notifications sync failed:', e);
  }
};

const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response.json();
};

// Auth
export const login = (username: string, password: string) =>
  apiRequest<{ accessToken: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const getMe = () => apiRequest<{ user: any }>('/auth/me');

export const logout = () => apiRequest<{ message: string }>('/auth/logout', { method: 'POST' });

export const changePassword = (currentPassword: string, newPassword: string) =>
  apiRequest<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

// Settings
export const getSettings = () => apiRequest<any>('/settings');

export const updateSettings = (data: any) =>
  apiRequest<any>('/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// Agents
export const getAgents = () => apiRequest<any[]>('/agents');

export const createAgent = (data: any) =>
  apiRequest<any>('/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAgent = (id: string, data: any) =>
  apiRequest<any>(`/agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteAgent = (id: string) =>
  apiRequest<any>(`/agents/${id}`, { method: 'DELETE' });

// Incidents
export const getIncidents = () => apiRequest<any[]>('/incidents');

export const createIncident = (data: any) =>
  apiRequest<any>('/incidents', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateIncident = (id: string, data: any) =>
  apiRequest<any>(`/incidents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteIncident = (id: string) =>
  apiRequest<any>(`/incidents/${id}`, { method: 'DELETE' });

// Meetings
export const getMeetings = () => apiRequest<any[]>('/meetings');

export const createMeeting = (data: any) =>
  apiRequest<any>('/meetings', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateMeeting = (id: string, data: any) =>
  apiRequest<any>(`/meetings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteMeeting = (id: string) =>
  apiRequest<any>(`/meetings/${id}`, { method: 'DELETE' });

// Daily Notes
export const getDailyNotes = () => apiRequest<any[]>('/daily-notes');

export const createDailyNote = (data: any) =>
  apiRequest<any>('/daily-notes', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateDailyNote = (id: string, data: any) =>
  apiRequest<any>(`/daily-notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

export const deleteDailyNote = (id: string) =>
  apiRequest<any>(`/daily-notes/${id}`, { method: 'DELETE' });

// Notifications
export const getNotifications = () => apiRequest<any[]>('/notifications');

export const markNotificationRead = (id: string) =>
  apiRequest<any>(`/notifications/${id}/read`, { method: 'PUT' });

export const markAllNotificationsRead = () =>
  apiRequest<any>('/notifications/read-all', { method: 'PUT' });

// Report Exports
export const getReportExports = () => apiRequest<any[]>('/report-exports');

export const createReportExport = (data: any) =>
  apiRequest<any>('/report-exports', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// Schedules
export const getSchedules = () => apiRequest<any[]>('/schedules');

export const createSchedule = (data: any) =>
  apiRequest<any>('/schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateSchedule = (id: string, data: any) =>
  apiRequest<any>(`/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// Migration
export const importLocalStorage = (data: {
  appSettings?: any;
  agents?: any[];
  incidents?: any[];
  meetings?: any[];
  dashboardDailyNotes?: any[];
  meetingNotifications?: any[];
  dailyNoteNotifications?: any[];
  reportExports?: any[];
  schedule?: any;
}) => apiRequest<{ message: string; imported: any }>('/migration/local-storage', {
  method: 'POST',
  body: JSON.stringify(data),
});