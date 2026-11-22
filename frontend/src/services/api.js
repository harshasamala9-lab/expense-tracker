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

async function request(path, { method = 'GET', body } = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
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

export async function getExpenses(category) {
  const query = category
    ? `?category=${encodeURIComponent(category)}`
    : '';
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

export function getSummary() {
  return request('/summary');
}
