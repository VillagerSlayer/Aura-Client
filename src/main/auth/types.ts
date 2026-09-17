export interface MinecraftProfile {
  id: string
  name: string
  skinUrl: string | null
}

export type AuthState =
  | { status: 'signed-out'; reason?: 'expired' }
  | { status: 'signing-in' }
  | { status: 'awaiting-device-code'; userCode: string; verificationUri: string; expiresAt: number }
  | { status: 'signed-in'; profile: MinecraftProfile }
  | { status: 'error'; message: string }

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
