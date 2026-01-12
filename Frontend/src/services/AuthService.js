const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const API_BASE = 'http://localhost:5000';

async function apiFetch(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = options.headers ? { ...options.headers } : {};
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  try {
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  } catch (e) {}
  const res = await fetch(url, { ...options, headers });
  return res;
}

export { apiFetch };

export const authService = {
  // POST /api/auth/signup
  async signUp(userData) {
    await delay(200);
    console.log('AuthService.signUp sending:', userData);
    const response = await apiFetch('/api/Signup', {
      method: 'POST',
      body: JSON.stringify({ Email: userData.email, Password: userData.password, FullName: userData.fullName })
    });

    if (!response.ok) {
      const text = await response.text();
      let msg = `Request failed with status ${response.status}`;
      try {
        const json = JSON.parse(text);
        msg = json.message || msg;
      } catch (e) {
        msg = `${msg}: ${text}`;
      }
      throw new Error(msg);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON response but received: ${text}`);
    }

    const json = await response.json();
    if (json && json.token) {
      try { localStorage.setItem('token', json.token); } catch (e) {}
    }
    if (json && json.user) {
      try { localStorage.setItem('user', JSON.stringify(json.user)); } catch (e) {}
    }
    return json;
  },

  // POST /api/SignupRequest - request OTP for signup
  async requestOtp(userData) {
    await delay(150);
    console.log('AuthService.requestOtp sending:', userData);
    try {
      const response = await apiFetch('/api/SignupRequest', {
        method: 'POST',
        body: JSON.stringify({ Email: userData.email, FullName: userData.fullName, Password: userData.password })
      });

      if (!response.ok) {
        const text = await response.text();
        let msg = `Request failed with status ${response.status}`;
        try {
          const json = JSON.parse(text);
          msg = json.message || msg;
        } catch (e) {
          msg = `${msg}: ${text}`;
        }
        throw new Error(msg);
      }

      return response.json();
    } catch (err) {
      // Network or CORS error (fetch failed before getting a response)
      console.error('requestOtp network error:', err.message || err);
      throw new Error(`Network error when calling signup API: ${err.message || err}`);
    }
  },

  // POST /api/SignupVerify - verify otp and finalize signup
  async verifyOtp(data) {
    await delay(150);
    try {
      const response = await apiFetch('/api/SignupVerify', {
        method: 'POST',
        body: JSON.stringify({ Email: data.email, Otp: data.otp })
      });

      if (!response.ok) {
        const text = await response.text();
        let msg = `Request failed with status ${response.status}`;
        try {
          const json = JSON.parse(text);
          msg = json.message || msg;
        } catch (e) {
          msg = `${msg}: ${text}`;
        }
        throw new Error(msg);
      }

      const json = await response.json();
      if (json && json.token) {
        try { localStorage.setItem('token', json.token); } catch (e) {}
      }
      if (json && json.user) {
        try { localStorage.setItem('user', JSON.stringify(json.user)); } catch (e) {}
      }
      return json;
    } catch (err) {
      console.error('verifyOtp network error:', err.message || err);
      throw new Error(`Network error when verifying OTP: ${err.message || err}`);
    }
  },

  // Resend OTP (same as requestOtp)
  async resendOtp(userData) {
    return this.requestOtp(userData);
  },

  getToken() {
    try { return localStorage.getItem('token'); } catch (e) { return null; }
  },

  getUser() {
    try { const u = localStorage.getItem('user'); return u ? JSON.parse(u) : null; } catch (e) { return null; }
  },

  logout() {
    try { localStorage.removeItem('token'); localStorage.removeItem('user'); } catch (e) {}
  },

  // POST /api/auth/login
  async login(credentials) {
    await delay(150);
    console.log('AuthService.login sending:', credentials.email);
    try {
      const response = await apiFetch('/api/Signin', {
        method: 'POST',
        body: JSON.stringify({ Email: credentials.email, Password: credentials.password })
      });

      if (!response.ok) {
        const text = await response.text();
        let msg = `Request failed with status ${response.status}`;
        try {
          const json = JSON.parse(text);
          msg = json.message || msg;
        } catch (e) {
          msg = `${msg}: ${text}`;
        }
        throw new Error(msg);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON response but received: ${text}`);
      }

      const data = await response.json();
      // persist token and user for session
      if (data && data.token) {
        try { localStorage.setItem('token', data.token); } catch (e) {}
      }
      if (data && data.user) {
        try { localStorage.setItem('user', JSON.stringify(data.user)); } catch (e) {}
      }
      return data;
    } catch (err) {
      console.error('AuthService.login network error:', err.message || err);
      throw new Error(err.message || 'Network error during login');
    }
  },

  // POST /api/auth/google
  async signUpWithGoogle() {
    // Opens a popup to Google's OAuth endpoint which redirects to
    // `/google_oauth_callback.html` in `public/` that posts the id_token back.
    const CLIENT_ID = (process.env.REACT_APP_GOOGLE_CLIENT_ID || window.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID');
    if (!CLIENT_ID || CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
      throw new Error('Google client id not configured. Set REACT_APP_GOOGLE_CLIENT_ID');
    }

    // Allow an explicit redirect URI via env (useful if your app runs on a different origin/port)
    const REDIRECT_OVERRIDE = (process.env.REACT_APP_GOOGLE_REDIRECT_URI || window.REACT_APP_GOOGLE_REDIRECT_URI || '').trim();
    const redirectUri = REDIRECT_OVERRIDE && REDIRECT_OVERRIDE.length > 0 ? REDIRECT_OVERRIDE : `${window.location.origin}/google_oauth_callback.html`;
    // Create a cryptographic nonce and store it temporarily so we can validate
    // the id_token's nonce claim when the popup returns it (prevents replay).
    function makeNonce(len = 32) {
      try {
        const arr = new Uint8Array(len);
        window.crypto.getRandomValues(arr);
        return Array.from(arr).map(b => ('0' + b.toString(16)).slice(-2)).join('');
      } catch (e) {
        // fallback
        let s = '';
        for (let i = 0; i < len; i++) s += Math.floor(Math.random() * 16).toString(16);
        return s;
      }
    }

    const nonce = makeNonce(16);
    try { localStorage.setItem('google_oauth_nonce', nonce); } catch (e) {}

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=${encodeURIComponent('openid email profile')}&prompt=select_account&nonce=${encodeURIComponent(nonce)}`;

    return new Promise((resolve, reject) => {
      const width = 600, height = 700;
      const left = (window.screen.width / 2) - (width / 2);
      const top = (window.screen.height / 2) - (height / 2);
      const popup = window.open(authUrl, 'google_oauth', `width=${width},height=${height},top=${top},left=${left}`);

      if (!popup) return reject(new Error('Failed to open popup window. Check popup blockers.'));

      const timer = setTimeout(() => {
        try { popup.close(); } catch (e) {}
        reject(new Error('Google sign-in timed out'));
      }, 120000);

      function onMessage(e) {
        try {
          if (e.origin !== window.location.origin) return;
          const data = e.data || {};
          if (data.type !== 'google_oauth') return;
          window.removeEventListener('message', onMessage);
          clearTimeout(timer);
          const id_token = data.payload && (data.payload.id_token || data.payload.idToken);
          if (!id_token) return reject(new Error('No id_token received from Google'));

          // Validate nonce stored before opening popup matches the token's nonce claim
          try {
            const stored = localStorage.getItem('google_oauth_nonce');
            if (stored) {
              // decode JWT payload (base64url)
              const parts = id_token.split('.');
              if (parts.length >= 2) {
                const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
                const pad = b64.length % 4;
                const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
                const json = decodeURIComponent(escape(atob(padded)));
                let payload;
                try { payload = JSON.parse(json); } catch (e) { payload = null; }
                if (!payload || !payload.nonce || String(payload.nonce) !== String(stored)) {
                  localStorage.removeItem('google_oauth_nonce');
                  return reject(new Error('Invalid nonce in id_token'));
                }
              }
            }
          } catch (e) {
            // If decoding fails, fail-safe reject
            try { localStorage.removeItem('google_oauth_nonce'); } catch (er) {}
            return reject(new Error('Failed to validate id_token nonce'));
          }
          try { localStorage.removeItem('google_oauth_nonce'); } catch (e) {}

          // Send id_token to backend for verification and JWT issuance
          apiFetch('/api/GoogleAuth', {
            method: 'POST',
            body: JSON.stringify({ id_token })
          }).then(async (resp) => {
            if (!resp.ok) {
              const text = await resp.text();
              let msg = `Google sign-in failed with status ${resp.status}`;
              try { const json = JSON.parse(text); msg = json.message || msg; } catch (e) { msg = `${msg}: ${text}`; }
              return reject(new Error(msg));
            }
            const json = await resp.json();
            if (json && json.token) {
              try { localStorage.setItem('token', json.token); } catch (e) {}
            }
            if (json && json.user) {
              try { localStorage.setItem('user', JSON.stringify(json.user)); } catch (e) {}
            }
            resolve(json);
          }).catch(err => reject(new Error(err.message || 'Network error during Google sign-in')));
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      }

      window.addEventListener('message', onMessage);
    });
  },

  // Alias for Google login (frontend calls loginWithGoogle)
  async loginWithGoogle() {
    return this.signUpWithGoogle();
  },

  // POST /api/auth/logout
  async logout() {
    await delay(300);
    // TODO: Replace with actual API call
    return { success: true };
  }
};

// Function to check if the user is authenticated
export function isAuthenticated() {
  const token = localStorage.getItem('token');
  return !!token;
}