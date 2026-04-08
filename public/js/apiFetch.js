// /**
//  * apiFetch — Authenticated Fetch Wrapper
//  *
//  * Drop-in replacement for fetch() for all calls to our backend.
//  * Automatically:
//  *   1. Sends credentials (cookies) on every request
//  *   2. If the server returns 401 (expired access token), calls GET /token
//  *      to silently refresh the cookie, then retries the original request once
//  *   3. If refresh also fails (refresh token expired), logs the user out
//  */

// async function apiFetch(url, options = {}) {
//     // Always send cookies
//     const opts = {
//         ...options,
//         credentials: 'include',
//         headers: {
//             ...(options.headers || {}),
//         },
//     };

//     let response = await fetch(url, opts);

//     // If the access token has expired, try to refresh it silently
//     if (response.status === 401) {
//         const refreshed = await _refreshAccessToken();

//         if (refreshed) {
//             // Retry the original request with the fresh cookie
//             response = await fetch(url, opts);
//         } else {
//             // Refresh token also expired or invalid — log the user out
//             Auth.logout();
//             return response; // return the 401 so callers can handle it if needed
//         }
//     }

//     return response;
// }

// /**
//  * Calls GET /token to get a fresh accessToken cookie.
//  * Returns true if successful, false if the refresh token is invalid/expired.
//  */
// async function _refreshAccessToken() {
//     try {
//         const res = await fetch(`${API_CONFIG.baseUrl}/token`, {
//             method: 'GET',
//             credentials: 'include',
//         });
//         return res.ok; // 200 = cookie was refreshed, 401/403 = session dead
//     } catch {
//         return false;
//     }
// }

// // Make globally accessible
// window.apiFetch = apiFetch;


/**
 * apiFetch — Authenticated Fetch Wrapper
 */
class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized access - session expired') {
        super(message);
        this.name = 'UnauthorizedError';
        this.status = 401;
    }
}

// Singleton promise for ongoing refresh to prevent race conditions
let isRefreshing = null;

async function apiFetch(url, options = {}) {
    // Default to 'include' for our backend, but allow override for external services like n8n
    const opts = {
        credentials: 'include',
        ...options,
        headers: {
            ...(options.headers || {}),
        },
    };

    let response = await fetch(url, opts);

    // If unauthorized (401), try to refresh the token
    if (response.status === 401) {
        console.warn('Access token expired for:', url);

        // If body is FormData, it might have been consumed and can't be retried safely
        if (opts.body instanceof FormData) {
            console.error('Retrying a FormData request is not natively supported by apiFetch if the body was consumed. This request might fail on retry.');
        }

        // Singleton Refresh Pattern:
        // If we're already refreshing, wait for that promise to resolve
        if (!isRefreshing) {
            console.log('Starting singleton silent refresh...');
            isRefreshing = _refreshAccessToken();
        } else {
            console.log('Refresh already in progress. Waiting...');
        }

        const refreshed = await isRefreshing;

        // Reset the singleton promise after completion (success or failure)
        // We use a small delay or check to ensure all concurrent callers get the result
        // before we reset it for the next "natural" expiry.
        if (refreshed) {
            // Once refreshed, we clear the promise so the next 401 (much later) can trigger a new one
            isRefreshing = null;
            console.info('Token refreshed. Retrying request:', url);
            return await fetch(url, opts);
        } else {
            isRefreshing = null;
            console.error('Silent refresh failed. Redirecting to login.');
            if (window.Auth) {
                Auth.logout();
            }
            throw new UnauthorizedError();
        }
    }

    return response;
}

/**
 * Calls GET /token to get a fresh accessToken cookie.
 */
async function _refreshAccessToken() {
    try {
        const res = await fetch(API_CONFIG.endpoints.refreshToken, {
            method: 'GET',
            credentials: 'include',
        });
        return res.ok;
    } catch (err) {
        console.error('Error during silent refresh:', err);
        return false;
    }
}

// Make globally accessible
window.apiFetch = apiFetch;
