import { XBOX_USER_AUTH_URL, XBOX_XSTS_AUTH_URL } from './constants'
import { AuthError } from './types'

export interface XboxToken {
  token: string
  userHash: string
}

interface XboxAuthResponse {
  Token: string
  DisplayClaims: { xui: Array<{ uhs: string }> }
}

interface XstsErrorResponse {
  XErr?: number
  Message?: string
}

// Common XSTS failure codes, documented by the community-maintained Minecraft
// authentication scheme (Mojang doesn't publish this API itself).
const XSTS_ERROR_MESSAGES: Record<number, string> = {
  2148916233:
    'This Microsoft account has no Xbox profile. Sign in to xbox.com once to create one, then try again.',
  2148916235: 'Xbox Live is not available in this account’s region.',
  2148916236: 'This account needs adult verification on the Xbox website.',
  2148916237: 'This account needs adult verification on the Xbox website.',
  2148916238:
    'This is a child account and must be added to a Microsoft Family group before it can sign in.'
}

export async function authenticateWithXboxLive(msaAccessToken: string): Promise<XboxToken> {
  const response = await fetch(XBOX_USER_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: {
        AuthMethod: 'RPS',
        SiteName: 'user.auth.xboxlive.com',
        RpsTicket: `d=${msaAccessToken}`
      },
      RelyingParty: 'http://auth.xboxlive.com',
      TokenType: 'JWT'
    })
  })
  if (!response.ok) {
    throw new AuthError(`Xbox Live authentication failed (${response.status})`)
  }
  const json = (await response.json()) as XboxAuthResponse
  return { token: json.Token, userHash: json.DisplayClaims.xui[0].uhs }
}

export async function authenticateWithXsts(xboxLiveToken: string): Promise<XboxToken> {
  const response = await fetch(XBOX_XSTS_AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      Properties: { SandboxId: 'RETAIL', UserTokens: [xboxLiveToken] },
      RelyingParty: 'rp://api.minecraftservices.com/',
      TokenType: 'JWT'
    })
  })
  const json = (await response.json()) as XboxAuthResponse & XstsErrorResponse
  if (!response.ok) {
    const friendly = json.XErr ? XSTS_ERROR_MESSAGES[json.XErr] : undefined
    throw new AuthError(
      friendly ?? json.Message ?? `Xbox security token request failed (${response.status})`
    )
  }
  return { token: json.Token, userHash: json.DisplayClaims.xui[0].uhs }
}
