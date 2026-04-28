import { useLocalStorage } from '@vueuse/core';
import axios from 'axios';
import { RequestCache } from '@/services/request-cache.service';

interface OAuthStatePayload {
  createdAt: number;
  csrf: string;
  requestId: string;
  returnTo: string;
  version: 1;
}

const token = useLocalStorage<string | null>('twitch-token', null);
const csrfToken = useLocalStorage<string | null>('csrf-token', null);
const lastValidatedAt = useLocalStorage<number>('twitch-token-validated-at', 0);

const clientId = import.meta.env.VITE_TWITCH_CLIENT_ID;
const CALLBACK_PATH = '/twitch/callback';
const OAUTH_STATE_SESSION_KEY = 'twitch-oauth-pending-states';
const OAUTH_STATE_TTL_MS = 5 * 60 * 1000;
let oauthRedirectInProgress = false;

function getCurrentRoutePath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

function isSafeReturnToPath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.startsWith(CALLBACK_PATH);
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getCallbackRedirectUri(): string {
  return new URL(CALLBACK_PATH, window.location.origin).toString();
}

function buildState(returnToPath: string): OAuthStatePayload {
  return {
    createdAt: Date.now(),
    csrf: generateId(),
    requestId: generateId(),
    returnTo: returnToPath,
    version: 1,
  };
}

function encodeState(state: OAuthStatePayload): string {
  return btoa(JSON.stringify(state));
}

function decodeState(state: string): OAuthStatePayload | null {
  try {
    const parsed = JSON.parse(atob(state)) as Partial<OAuthStatePayload>;
    if (
      parsed.version !== 1
      || typeof parsed.csrf !== 'string'
      || typeof parsed.requestId !== 'string'
      || typeof parsed.returnTo !== 'string'
      || typeof parsed.createdAt !== 'number'
    ) {
      return null;
    }
    return parsed as OAuthStatePayload;
  } catch {
    return null;
  }
}

function isFreshState(createdAt: number): boolean {
  return Date.now() - createdAt <= OAUTH_STATE_TTL_MS;
}

function prunePendingStates(states: Record<string, OAuthStatePayload>): Record<string, OAuthStatePayload> {
  const now = Date.now();
  const prunedEntries = Object.entries(states).filter(([, state]) => now - state.createdAt <= OAUTH_STATE_TTL_MS);
  return Object.fromEntries(prunedEntries);
}

function getPendingStates(): Record<string, OAuthStatePayload> {
  try {
    const raw = sessionStorage.getItem(OAUTH_STATE_SESSION_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, OAuthStatePayload> : {};
    const pruned = prunePendingStates(parsed);
    if (Object.keys(pruned).length !== Object.keys(parsed).length) {
      setPendingStates(pruned);
    }
    return pruned;
  } catch {
    return {};
  }
}

function setPendingStates(states: Record<string, OAuthStatePayload>): void {
  try {
    sessionStorage.setItem(OAUTH_STATE_SESSION_KEY, JSON.stringify(states));
  } catch {
    // Ignore session storage failures and continue with state fallback.
  }
}

function storePendingState(state: OAuthStatePayload): void {
  const pendingStates = getPendingStates();
  pendingStates[state.requestId] = state;
  setPendingStates(pendingStates);
}

function takePendingState(requestId: string): OAuthStatePayload | null {
  const pendingStates = getPendingStates();
  const pendingState = pendingStates[requestId] ?? null;
  if (pendingState) {
    delete pendingStates[requestId];
    setPendingStates(pendingStates);
  }
  return pendingState;
}

export function beginOAuth(returnToPath: string = getCurrentRoutePath()): void {
  if (oauthRedirectInProgress) {
    return;
  }
  oauthRedirectInProgress = true;

  const safeReturnPath = isSafeReturnToPath(returnToPath) ? returnToPath : '/bottom-bar';
  const state = buildState(safeReturnPath);

  csrfToken.value = state.csrf;
  storePendingState(state);

  const redirectUri = getCallbackRedirectUri();
  const encodedState = encodeState(state);
  window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=channel:read:ads&state=${encodeURIComponent(encodedState)}`;

  // Safety valve in case navigation is blocked and we stay on the page.
  window.setTimeout(() => {
    oauthRedirectInProgress = false;
  }, 5000);
}

export function completeOAuthFromCallback(): string {
  const queryParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = queryParams.get('access_token');
  const rawState = queryParams.get('state');

  if (!accessToken || !rawState) {
    throw new Error('OAuth callback is missing required access token or state');
  }

  const state = decodeState(rawState);
  if (!state) {
    throw new Error('OAuth callback state is invalid');
  }
  if (!isFreshState(state.createdAt)) {
    throw new Error('OAuth callback state expired');
  }

  const pendingState = takePendingState(state.requestId);
  if (pendingState && pendingState.csrf !== state.csrf) {
    throw new Error('CSRF token mismatch');
  }

  const returnTo = pendingState?.returnTo ?? state.returnTo;
  if (!isSafeReturnToPath(returnTo)) {
    throw new Error('OAuth callback return path is invalid');
  }

  token.value = accessToken;
  csrfToken.value = null;
  lastValidatedAt.value = Date.now();

  const callbackUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, '', callbackUrl);

  return returnTo;
}

function buildConfig(config?: any) {
  const headers = {
    ...(config?.headers ?? {}),
  };

  if (token.value) {
    headers.Authorization = `Bearer ${token.value}`;
    headers['Client-ID'] = clientId;
  }

  return {
    ...config,
    headers,
  };
}

export function ensureAuthHeaders(): boolean {
  return Boolean(token.value);
}

export function ensureAuthForRoute(returnToPath: string = getCurrentRoutePath()): boolean {
  if (ensureAuthHeaders()) {
    return true;
  }
  beginOAuth(returnToPath);
  return false;
}

export async function validateTokenWithTTL(ttlMs: number): Promise<boolean> {
  if (!ensureAuthHeaders()) {
    return false;
  }

  const now = Date.now();
  if (lastValidatedAt.value && now - lastValidatedAt.value < ttlMs) {
    return true;
  }

  try {
    await RequestCache.request('https://id.twitch.tv/oauth2/validate', {
      headers: {
        Authorization: `Bearer ${token.value}`,
      },
      method: 'GET',
    }, 10);
    lastValidatedAt.value = now;
    return true;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      lastValidatedAt.value = 0;
      return false;
    }
    throw error;
  }
}

export async function twitchRequest<T>(
  url: string,
  config?: any,
  ttlSeconds: number = 10,
): Promise<T> {
  if (!ensureAuthHeaders()) {
    beginOAuth(getCurrentRoutePath());
    throw new Error('TWITCH_TOKEN_MISSING');
  }

  const requestConfig = buildConfig(config);

  try {
    return await RequestCache.request<T>(url, requestConfig, ttlSeconds);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      console.debug(`[TwitchAuth] 401 for ${url}. Retrying with refreshed headers.`);
      ensureAuthHeaders();
      try {
        return await RequestCache.request<T>(url, buildConfig(config), ttlSeconds);
      } catch (retryError) {
        if (axios.isAxiosError(retryError) && retryError.response?.status === 401) {
          console.warn(`[TwitchAuth] Retry 401 for ${url}. Validating token.`);
          const isValid = await validateTokenWithTTL(0);
          if (!isValid) {
            console.warn('[TwitchAuth] Token invalid. Redirecting to OAuth.');
            beginOAuth(getCurrentRoutePath());
          }
        }
        throw retryError;
      }
    }
    throw error;
  }
}
