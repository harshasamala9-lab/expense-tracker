import { AppError } from '../utils/AppError.js';

function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) {
    return AbortSignal.timeout(ms);
  }

  return undefined;
}

/**
 * Server-to-server client for the Python automation service.
 *
 * The browser never talks to Python directly. Express authenticates the
 * admin, then forwards the CSV with a shared X-Automation-Key header.
 */
export class AutomationClient {
  constructor({
    baseUrl = '',
    apiKey = '',
    fetchImpl = globalThis.fetch,
    requestTimeoutMs = 60_000,
    statusTimeoutMs = 8_000,
  } = {}) {
    this.baseUrl = String(baseUrl).replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.fetchImpl = fetchImpl;
    this.requestTimeoutMs = requestTimeoutMs;
    this.statusTimeoutMs = statusTimeoutMs;
  }

  get configured() {
    return Boolean(this.baseUrl && this.apiKey);
  }

  headers() {
    return { 'X-Automation-Key': this.apiKey };
  }

  async getStatus() {
    if (!this.configured) {
      return {
        configured: false,
        reachable: false,
        status: 'not_configured',
        message:
          'Set AUTOMATION_URL and AUTOMATION_KEY to connect the Python service.',
      };
    }

    try {
      const response = await this.fetchImpl(`${this.baseUrl}/health`, {
        headers: this.headers(),
        signal: timeoutSignal(this.statusTimeoutMs),
      });

      const payload = await response.json().catch(() => null);

      return {
        configured: true,
        reachable: response.ok,
        status: response.ok ? 'online' : 'offline',
        httpStatus: response.status,
        ...(payload ?? {}),
      };
    } catch (error) {
      return {
        configured: true,
        reachable: false,
        status: 'offline',
        message:
          error?.name === 'TimeoutError'
            ? 'The automation service did not respond in time.'
            : 'The automation service is unreachable.',
      };
    }
  }

  async importCsv(file) {
    if (!this.configured) {
      throw new AppError(
        503,
        'The Python automation service is not configured. Set AUTOMATION_URL and AUTOMATION_KEY.',
      );
    }

    if (!file?.buffer?.length) {
      throw new AppError(400, 'Choose a CSV file to import.');
    }

    const form = new FormData();
    const blob = new Blob([file.buffer], {
      type: file.mimetype || 'text/csv',
    });
    form.append('file', blob, file.originalname || 'expenses.csv');

    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/import`, {
        method: 'POST',
        headers: this.headers(),
        body: form,
        signal: timeoutSignal(this.requestTimeoutMs),
      });
    } catch (error) {
      if (error?.name === 'TimeoutError') {
        throw new AppError(
          504,
          'The automation service took too long to process this file.',
        );
      }

      throw new AppError(
        503,
        'The automation service is unavailable. Please try again.',
      );
    }

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new AppError(
        response.status >= 500 ? 502 : response.status,
        payload?.detail ||
          payload?.message ||
          'The automation service could not import this file.',
      );
    }

    return payload;
  }
}
