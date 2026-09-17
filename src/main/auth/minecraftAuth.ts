import { MINECRAFT_LOGIN_URL, MINECRAFT_PROFILE_URL } from './constants'
import { AuthError, type MinecraftProfile } from './types'
import type { XboxToken } from './xboxAuth'

interface MinecraftLoginResponse {
  access_token: string
}

interface MinecraftProfileResponse {
  id: string
  name: string
  skins: Array<{ url: string; state: 'ACTIVE' | 'INACTIVE' }>
}

export async function loginToMinecraft(xsts: XboxToken): Promise<string> {
  const response = await fetch(MINECRAFT_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ identityToken: `XBL3.0 x=${xsts.userHash};${xsts.token}` })
  })
  if (!response.ok) {
    throw new AuthError(`Minecraft login failed (${response.status})`)
  }
  const json = (await response.json()) as MinecraftLoginResponse
  return json.access_token
}

export async function fetchMinecraftProfile(
  minecraftAccessToken: string
): Promise<MinecraftProfile> {
  const response = await fetch(MINECRAFT_PROFILE_URL, {
    headers: { Authorization: `Bearer ${minecraftAccessToken}` }
  })
  if (response.status === 404) {
    throw new AuthError('This Microsoft account does not own Minecraft: Java Edition.')
  }
  if (!response.ok) {
    throw new AuthError(`Could not load Minecraft profile (${response.status})`)
  }
  const json = (await response.json()) as MinecraftProfileResponse
  const activeSkin = json.skins.find((skin) => skin.state === 'ACTIVE')
  return { id: json.id, name: json.name, skinUrl: activeSkin?.url ?? null }
}
