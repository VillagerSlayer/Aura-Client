// Azure AD "public client" registration for Gidget Launcher. This ID is not a secret —
// it identifies the app, and every player signs in with their own Microsoft account
// against it (same model every third-party Minecraft launcher uses). Empty until the
// app registration is created; login() will throw a clear error until it's set.
export const AZURE_CLIENT_ID = process.env.GIDGET_AZURE_CLIENT_ID ?? ''

// The `consumers` endpoint is required here, not `common` or `organizations` — Xbox
// Live/Minecraft auth is documented (minecraft.wiki "Microsoft authentication") as only
// working against the consumer-account surface. This is the modern Microsoft identity
// platform (v2.0) endpoint, which is what actually supports the device code grant —
// unlike the legacy login.live.com endpoint used by older launcher implementations.
export const MSA_DEVICE_CODE_URL =
  'https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode'
export const MSA_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token'
export const MSA_SCOPE = 'XboxLive.signin offline_access'

export const XBOX_USER_AUTH_URL = 'https://user.auth.xboxlive.com/user/authenticate'
export const XBOX_XSTS_AUTH_URL = 'https://xsts.auth.xboxlive.com/xsts/authorize'
export const MINECRAFT_LOGIN_URL =
  'https://api.minecraftservices.com/authentication/login_with_xbox'
export const MINECRAFT_PROFILE_URL = 'https://api.minecraftservices.com/minecraft/profile'
