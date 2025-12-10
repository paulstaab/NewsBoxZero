# Authentication Contract

**Validation Endpoint**: `/index.php/apps/news/api/v1-3/feeds`

---

## Overview

Feedfront uses HTTP Basic authentication with Nextcloud app passwords. The `/feeds` endpoint is used for credential validation since it requires authentication (unlike `/version` which is public).

---

## Credential Validation

Use `GET /feeds` to validate credentials. This endpoint requires authentication and returns quickly with minimal data.

### Request

```http
GET /index.php/apps/news/api/v1-3/feeds HTTP/1.1
Authorization: Basic base64(username:password)
```

### Response (Success)

```typescript
interface FeedGetOut {
  feeds: Feed[];  // User's subscribed feeds
}
```

### Status Codes

| Code | Description |
|------|-------------|
| 200 | Valid credentials |
| 401 | Invalid credentials |
| 404 | Endpoint not found (wrong base URL) |

### Note

The `/version` endpoint does **not** require authentication and cannot be used to validate credentials.

---

## Authentication Flow

### 1. User Input

Login wizard collects:
- Server URL (e.g., `https://rss.example.com`)
- Username
- App password

### 2. Validation Request

```typescript
async function validateCredentials(
  baseUrl: string,
  username: string,
  password: string
): Promise<{ valid: boolean; error?: string }> {
  // Normalize URL
  const url = baseUrl.replace(/\/$/, '');
  
  // Enforce HTTPS
  if (!url.startsWith('https://')) {
    return { valid: false, error: 'Server URL must use HTTPS' };
  }
  
  // Build credentials
  const credentials = btoa(`${username}:${password}`);
  
  try {
    // Use /feeds endpoint for auth validation (requires authentication)
    const response = await fetch(
      `${url}/index.php/apps/news/api/v1-3/feeds`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.status === 401) {
      return { valid: false, error: 'Invalid username or password' };
    }
    
    if (response.status === 404) {
      return { valid: false, error: 'API endpoint not found. Check server URL.' };
    }
    
    if (!response.ok) {
      return { valid: false, error: `Server error: ${response.status}` };
    }
    
    // Success - credentials are valid
    return { valid: true };
    
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error or CORS
      return { valid: false, error: 'Unable to connect. Check URL and CORS settings.' };
    }
    return { valid: false, error: 'Connection failed' };
  }
}
```

### 3. Credential Storage

After successful validation:

```typescript
interface StoredSession {
  baseUrl: string;
  username: string;
  credentials: string;  // base64(username:password)
  rememberDevice: boolean;
}

function storeSession(session: StoredSession): void {
  const storage = session.rememberDevice ? localStorage : sessionStorage;
  storage.setItem('feedfront:session', JSON.stringify(session));
}

function loadSession(): StoredSession | null {
  // Try localStorage first (persistent), then sessionStorage
  const stored = localStorage.getItem('feedfront:session') 
              ?? sessionStorage.getItem('feedfront:session');
  
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function clearSession(): void {
  localStorage.removeItem('feedfront:session');
  sessionStorage.removeItem('feedfront:session');
}
```

### 4. Request Authorization

All API requests include the Authorization header:

```typescript
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = loadSession();
  if (!session) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(`${session.baseUrl}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${session.credentials}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    }
  });
  
  if (response.status === 401) {
    // Credentials expired or revoked
    clearSession();
    throw new AuthenticationError('Session expired. Please log in again.');
  }
  
  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }
  
  return response.json();
}
```

---

## Security Considerations

### HTTPS Enforcement

```typescript
function isSecureUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Allow localhost for development
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
```

### Credential Handling

1. **Never log credentials** - Exclude from console.log, error reports
2. **Clear on logout** - Remove from both localStorage and sessionStorage
3. **No persistence without consent** - Default to sessionStorage
4. **Recommend app passwords** - Advise users to create Nextcloud app passwords

### Error Messages

Provide actionable but secure error messages:

| Scenario | User Message |
|----------|--------------|
| Wrong password | "Invalid username or password" |
| Wrong URL | "Unable to find API. Please check the server URL." |
| Network error | "Unable to connect. Please check your internet connection." |
| CORS blocked | "Server is not configured to allow this app. Contact your administrator." |
| Token revoked | "Your session has expired. Please log in again." |

---

## Login Wizard States

```typescript
type WizardState = 
  | { step: 'url'; url: string }
  | { step: 'credentials'; url: string; username: string; password: string }
  | { step: 'validating'; url: string; username: string }
  | { step: 'error'; url: string; username: string; error: string }
  | { step: 'success'; session: StoredSession };
```

### UI Flow

```
┌─────────────┐
│ Enter URL   │
│ [________]  │
│    [Next]   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Enter Login │
│ User: [___] │
│ Pass: [___] │
│ ☐ Remember  │
│  [Connect]  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Validating  │
│    ⏳       │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
   ▼       ▼
┌─────┐ ┌─────┐
│ ✓   │ │ ✗   │
│Done │ │Error│
└─────┘ └─────┘
```

---

## App Password Guidance

Include in login wizard help text:

> **Tip:** For security, create a Nextcloud App Password instead of using your main password.
> 
> 1. Go to your Nextcloud Settings → Security
> 2. Scroll to "Devices & sessions"
> 3. Enter "Feedfront" as device name
> 4. Click "Create new app password"
> 5. Copy the generated password here
> 
> App passwords can be revoked anytime without affecting your main account.
