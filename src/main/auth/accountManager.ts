import { shell } from 'electron'
import { requestDeviceCode, pollForDeviceToken } from './deviceCodeAuth'
import { refreshMsaTokens } from './msaClient'
import { authenticateWithXboxLive, authenticateWithXsts } from './xboxAuth'
import { fetchMinecraftProfile, loginToMinecraft } from './minecraftAuth'
import { clearAccount, loadAccount, saveAccount } from './tokenStore'
import { AuthError, type AuthState, type MinecraftProfile } from './types'

type Listener = (state: AuthState) => void

interface ChainResult {
  profile: MinecraftProfile
  minecraftAccessToken: string
}

class AccountManager {
  private state: AuthState = { status: 'signed-out' }
  private listeners = new Set<Listener>()

  getState(): AuthState {
    return this.state
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setState(next: AuthState): void {
    this.state = next
    for (const listener of this.listeners) listener(next)
  }

  // Called once at app startup: tries to silently resume the last signed-in account
  // from its stored refresh token, with no UI shown unless that fails.
  async restoreSession(): Promise<void> {
    const stored = await loadAccount()
    if (!stored) return
    try {
      const msaTokens = await refreshMsaTokens(stored.refreshToken)
      const { profile } = await this.completeXboxToMinecraftChain(msaTokens.accessToken)
      // Microsoft rotates the refresh token on every use — persist the new one, or
      // the next launch's refresh would be using an already-invalidated token.
      await saveAccount(profile, msaTokens.refreshToken)
      this.setState({ status: 'signed-in', profile })
    } catch {
      // Refresh token expired or revoked — surface this distinctly from "never
      // signed in" so the UI can tell the user their session ended, not just
      // that no account is connected.
      await clearAccount()
      this.setState({ status: 'signed-out', reason: 'expired' })
    }
  }

  // Device Authorization Grant: request a code, show it to the user (and open the
  // verification page for them), then poll in the background until they finish
  // signing in on that page — the same official Microsoft flow used for signing
  // into Xbox on a TV or console. No embedded browser window involved.
  async login(): Promise<void> {
    this.setState({ status: 'signing-in' })
    try {
      const deviceCode = await requestDeviceCode()
      this.setState({
        status: 'awaiting-device-code',
        userCode: deviceCode.userCode,
        verificationUri: deviceCode.verificationUri,
        expiresAt: deviceCode.expiresAt
      })
      shell.openExternal(deviceCode.verificationUri)

      const msaTokens = await pollForDeviceToken(deviceCode)
      const { profile } = await this.completeXboxToMinecraftChain(msaTokens.accessToken)
      await saveAccount(profile, msaTokens.refreshToken)
      this.setState({ status: 'signed-in', profile })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed.'
      this.setState({ status: 'error', message })
    }
  }

  async logout(): Promise<void> {
    await clearAccount()
    this.setState({ status: 'signed-out' })
  }

  // For the future launch pipeline: Minecraft access tokens are short-lived
  // (~24h) and deliberately never cached, so this always does a fresh
  // MSA-refresh → Xbox → XSTS → Minecraft round trip. If the stored refresh
  // token has since expired or been revoked, this resets to signed-out so the
  // launcher can prompt the user to sign in again instead of trying to launch
  // with a dead session.
  async getMinecraftAccessToken(): Promise<string> {
    const stored = await loadAccount()
    if (!stored) {
      this.setState({ status: 'signed-out' })
      throw new AuthError('Not signed in.')
    }
    try {
      const msaTokens = await refreshMsaTokens(stored.refreshToken)
      const { profile, minecraftAccessToken } = await this.completeXboxToMinecraftChain(
        msaTokens.accessToken
      )
      await saveAccount(profile, msaTokens.refreshToken)
      this.setState({ status: 'signed-in', profile })
      return minecraftAccessToken
    } catch (error) {
      await clearAccount()
      this.setState({ status: 'signed-out', reason: 'expired' })
      throw error
    }
  }

  private async completeXboxToMinecraftChain(msaAccessToken: string): Promise<ChainResult> {
    const xboxLive = await authenticateWithXboxLive(msaAccessToken)
    const xsts = await authenticateWithXsts(xboxLive.token)
    const minecraftAccessToken = await loginToMinecraft(xsts)
    const profile = await fetchMinecraftProfile(minecraftAccessToken)
    return { profile, minecraftAccessToken }
  }
}

export const accountManager = new AccountManager()
