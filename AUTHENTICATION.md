# Authentication implementation

This document points at the actual authentication code for anyone reviewing this
app's use of the Microsoft identity platform / Minecraft Services APIs.

Source: [`src/main/auth/`](./src/main/auth)

## Flow

1. **Microsoft OAuth 2.0** — `deviceCodeAuth.ts` implements the OAuth 2.0 Device
   Authorization Grant (RFC 8628) against `login.microsoftonline.com/consumers`
   (personal Microsoft accounts only, not organizational). No client secret is
   used anywhere — this is a public client app registration.
2. **Xbox Live authentication** — `xboxAuth.ts`, `authenticateWithXboxLive()`.
3. **XSTS authorization** — `xboxAuth.ts`, `authenticateWithXsts()`, with the
   relying party set to `rp://api.minecraftservices.com/`.
4. **Minecraft Services login** — `minecraftAuth.ts`, `loginToMinecraft()`.
5. **Minecraft profile + ownership check** — `minecraftAuth.ts`,
   `fetchMinecraftProfile()`. A 404 here is treated explicitly as "this account
   doesn't own Minecraft: Java Edition," not a generic error.

`accountManager.ts` orchestrates the above and is the only entry point the rest
of the app calls into (`login()`, `logout()`, `getMinecraftAccessToken()`,
`restoreSession()`).

## Token handling

- `tokenStore.ts`: the Microsoft refresh token is the only long-lived secret
  this app stores. It's encrypted with Electron's `safeStorage` (OS-backed —
  DPAPI on Windows) before ever touching disk. It is never stored in plaintext,
  never in `localStorage`, and never logged.
- Access tokens are held in memory only, for the duration of a session, and are
  never persisted.
- No token value is ever written to a log, console output, or the UI.

## What this app does not do

- No client secret (this is a public client, as required for a desktop app).
- No password entry — the user authenticates entirely on
  `login.microsoftonline.com`, never inside this app.
- No bypassing of license, ownership, or authentication checks — a failed
  ownership check (`fetchMinecraftProfile`'s 404 case) blocks sign-in rather
  than being worked around.
