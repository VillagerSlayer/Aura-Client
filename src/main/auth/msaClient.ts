import { AZURE_CLIENT_ID, MSA_SCOPE, MSA_TOKEN_URL } from './constants'
import { AuthError } from './types'

export interface MsaTokens {
  accessToken: string
  refreshToken: string
}

interface MsaTokenResponse {
  access_token: string
  refresh_token: string
  error?: string
  error_description?: string
}

export async function refreshMsaTokens(refreshToken: string): Promise<MsaTokens> {
  const response = await fetch(MSA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: AZURE_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: MSA_SCOPE
    })
  })
  const json = (await response.json()) as MsaTokenResponse
  if (!response.ok || json.error) {
    throw new AuthError(
      json.error_description ?? `Microsoft token refresh failed (${response.status})`
    )
  }
  return { accessToken: json.access_token, refreshToken: json.refresh_token }
}
