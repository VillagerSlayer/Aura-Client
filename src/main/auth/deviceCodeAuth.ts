import { AZURE_CLIENT_ID, MSA_DEVICE_CODE_URL, MSA_SCOPE, MSA_TOKEN_URL } from './constants'
import { AuthError } from './types'
import type { MsaTokens } from './msaClient'

export interface DeviceCodeRequest {
  deviceCode: string
  userCode: string
  verificationUri: string
  expiresAt: number
  intervalSeconds: number
}

interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
  message: string
}

interface DeviceTokenResponse {
  access_token: string
  refresh_token: string
  error?: string
  error_description?: string
}

export async function requestDeviceCode(): Promise<DeviceCodeRequest> {
  if (!AZURE_CLIENT_ID) {
    throw new AuthError(
      'Aura Client is not configured with an Azure Client ID yet. See ARCHITECTURE.md §8.'
    )
  }

  const response = await fetch(MSA_DEVICE_CODE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: AZURE_CLIENT_ID, scope: MSA_SCOPE })
  })
  if (!response.ok) {
    throw new AuthError(`Could not start Microsoft sign-in (${response.status})`)
  }
  const json = (await response.json()) as DeviceCodeResponse
  return {
    deviceCode: json.device_code,
    userCode: json.user_code,
    verificationUri: json.verification_uri,
    expiresAt: Date.now() + json.expires_in * 1000,
    intervalSeconds: json.interval
  }
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

// Polls the token endpoint per the OAuth 2.0 Device Authorization Grant (RFC 8628) until
// the user finishes signing in elsewhere, the code expires, or they decline. Runs entirely
// in the main process — the renderer just displays the code/URL and waits for the state
// change that follows.
export async function pollForDeviceToken(request: DeviceCodeRequest): Promise<MsaTokens> {
  let intervalMs = request.intervalSeconds * 1000

  while (Date.now() < request.expiresAt) {
    await sleep(intervalMs)

    const response = await fetch(MSA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: request.deviceCode
      })
    })
    const json = (await response.json()) as DeviceTokenResponse

    if (response.ok) {
      return { accessToken: json.access_token, refreshToken: json.refresh_token }
    }

    switch (json.error) {
      case 'authorization_pending':
        continue
      case 'slow_down':
        intervalMs += 5000
        continue
      case 'authorization_declined':
        throw new AuthError('Sign-in was declined.')
      case 'expired_token':
        throw new AuthError('The sign-in code expired. Try again.')
      default:
        throw new AuthError(
          json.error_description ?? `Microsoft sign-in failed (${response.status})`
        )
    }
  }

  throw new AuthError('The sign-in code expired. Try again.')
}
