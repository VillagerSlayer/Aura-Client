import { app, safeStorage } from 'electron'
import { readFile, writeFile, rm } from 'fs/promises'
import { join } from 'path'
import type { MinecraftProfile } from './types'

interface StoredAccount {
  profile: MinecraftProfile
  refreshToken: string
}

function authFilePath(): string {
  return join(app.getPath('userData'), 'auth.dat')
}

// Only the Microsoft refresh token is sensitive here; it's what would let someone
// silently re-authenticate as this player, so it's the one thing that must never sit
// on disk in plaintext. It's encrypted with the OS-backed key (DPAPI on Windows) via
// safeStorage, which ties the ciphertext to this Windows user account.
export async function saveAccount(profile: MinecraftProfile, refreshToken: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    // No OS-backed encryption available on this machine — don't fall back to
    // plaintext. The user just signs in again next launch instead.
    return
  }
  const payload: StoredAccount = { profile, refreshToken }
  const encrypted = safeStorage.encryptString(JSON.stringify(payload))
  await writeFile(authFilePath(), encrypted)
}

export async function loadAccount(): Promise<StoredAccount | null> {
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    const encrypted = await readFile(authFilePath())
    const decrypted = safeStorage.decryptString(encrypted)
    return JSON.parse(decrypted) as StoredAccount
  } catch {
    return null
  }
}

export async function clearAccount(): Promise<void> {
  await rm(authFilePath(), { force: true })
}
