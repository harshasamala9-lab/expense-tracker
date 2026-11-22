const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(
  /\/+$/,
  '',
);

export class ApiError extends Error {
  constructor(message, status = 0, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function fallbackMessage(status) {
  if (status === 404) {
    return 'The requested record could not be found.';
  }
  if (status === 503) {
    return 'The server is temporarily unavailable. Please try again.';
  }
  if (status >= 500) {
    return 'The server ran into a problem. Please try again.';
  }
  return 'The request could not be completed.';
}

function readToken() {
  if (typeof window === 'undefined') {
    return '';
  }
  try {
    return window.localStorage.getItem('accessToken') ?? '';
  } catch {
    return '';
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {
    Accept: 'application/json',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
  };

  const token = auth ? readToken() : '';
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Unable to reach the server. Check your connection and try again.',
    );
  }

  let payload = null;
  if (response.status !== 204) {
    const text = await response.text();
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.message || fallbackMessage(response.status),
      response.status,
      payload?.details,
    );
  }

  return payload;
}

// Auth

export async function login(email, password) {
  const payload = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  return payload;
}

export async function supabaseLogin(accessToken) {
  const payload = await request('/auth/supabase-login', {
    method: 'POST',
    body: { access_token: accessToken },
    auth: false,
  });
  return payload;
}

export async function me() {
  return request('/auth/me');
}

// Expenses (existing)

export async function getExpenses(category) {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  const data = await request(`/expenses${query}`);
  return data?.expenses ?? [];
}

export function createExpense(payload) {
  return request('/expenses', { method: 'POST', body: payload });
}

export function updateExpense(id, payload) {
  return request(`/expenses/${id}`, { method: 'PUT', body: payload });
}

export function deleteExpense(id) {
  return request(`/expenses/${id}`, { method: 'DELETE' });
}

export async function getSummary() {
  const data = await request('/summary');
  return data ?? {};
}

// Admin analytics

export async function getAdminAnalytics({ days } = {}) {
  const query = days ? `?days=${encodeURIComponent(days)}` : '';
  return request(`/admin/analytics${query}`);
}

export async function getAutomationStatus() {
  return request('/admin/automation/status');
}

// Tasks

export async function listTasks({ status, task_type, priority, assigned_to, overdue, search, sort, page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (task_type) params.set('task_type', task_type);
  if (priority) params.set('priority', priority);
  if (assigned_to) params.set('assigned_to', assigned_to);
  if (overdue !== undefined) params.set('overdue', String(overdue));
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));

  const query = params.toString();
  const data = await request(`/admin/tasks${query ? `?${query}` : ''}`);
  return data ?? { tasks: [], pagination: { total: 0 } };
}

export async function getTaskSummary() {
  return request('/admin/tasks/summary');
}

export async function getTask(id) {
  return request(`/admin/tasks/${id}`);
}

export async function createTask(payload) {
  return request('/admin/tasks', { method: 'POST', body: payload });
}

export async function updateTask(id, payload) {
  return request(`/admin/tasks/${id}`, { method: 'PATCH', body: payload });
}

export async function startTask(id, note) {
  return request(`/admin/tasks/${id}/start`, {
    method: 'POST',
    body: note ? { note } : undefined,
  });
}

export async function completeTask(id, note) {
  return request(`/admin/tasks/${id}/complete`, {
    method: 'POST',
    body: note ? { note } : undefined,
  });
}

export async function cancelTask(id, note) {
  return request(`/admin/tasks/${id}/cancel`, {
    method: 'POST',
    body: note ? { note } : undefined,
  });
}

export async function assignTask(id, assigned_to) {
  return request(`/admin/tasks/${id}/assign`, {
    method: 'POST',
    body: { assigned_to },
  });
}

export async function addTaskNote(id, note) {
  return request(`/admin/tasks/${id}/notes`, {
    method: 'POST',
    body: { note },
  });
}

// Notifications

export async function listNotifications({ status, severity, notification_type, task_id, search, page, pageSize } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (severity) params.set('severity', severity);
  if (notification_type) params.set('notification_type', notification_type);
  if (task_id) params.set('task_id', task_id);
  if (search) params.set('search', search);
  if (page) params.set('page', String(page));
  if (pageSize) params.set('pageSize', String(pageSize));

  const query = params.toString();
  const data = await request(`/admin/notifications${query ? `?${query}` : ''}`);
  return data ?? { notifications: [], pagination: { total: 0 }, unreadCount: 0 };
}

export async function getNotificationUnreadCount() {
  const data = await request('/admin/notifications/unread-count');
  return data?.unreadCount ?? 0;
}

export async function markNotificationRead(id) {
  return request(`/admin/notifications/${id}/read`, { method: 'POST' });
}

export async function markAllNotificationsRead() {
  return request('/admin/notifications/read-all', { method: 'POST' });
}

// Realtime

export function openRealtimeStream(onEvent, onError) {
  const token = readToken();
  const controller = new AbortController();
  const stream = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/realtime`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (!response.ok || !response.body) {
        onError?.(new ApiError(fallbackMessage(response.status), response.status));
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';
        for (const raw of events) {
          if (!raw.trim()) continue;
          const type = raw.match(/^event: (.+)$/m)?.[1]?.trim();
          const dataLine = raw.match(/^data: (.+)$/m)?.[1];
          const data = dataLine ? JSON.parse(dataLine) : null;
          if (type) onEvent?.({ type, data });
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        onError?.(error);
      }
    }
  };

  void stream();

  return { close: () => controller.abort() };
}
