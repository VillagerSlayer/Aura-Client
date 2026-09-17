# Aura Client

A custom Minecraft: Java Edition launcher, built with Electron and TypeScript.

**Status: in active development.** Not yet publicly released.

## What it does

Aura Client is a desktop launcher for Minecraft: Java Edition, focused on a clean, modern
interface and built-in mod/profile management. Planned and in-progress features include:

- Sign in with your own Microsoft/Xbox account (standard OAuth 2.0 device authorization
  flow — the same approach used by other third-party launchers)
- Per-profile Minecraft version and Fabric mod-loader management
- Browsing and installing mods, resource packs, and shaders via Modrinth
- Hardware-aware JVM performance tuning
- A saved-servers list with live status pings
- Cosmetic customization (capes, name badges) visible to other Aura Client users
- Playtime tracking

## Tech stack

- Electron + React + TypeScript
- Node.js for the launcher backend (auth, downloads, process management)
- Standard Mojang/Microsoft APIs only — no unofficial or reverse-engineered endpoints

## Authentication

Aura Client authenticates players via Microsoft's official identity platform:
Microsoft OAuth 2.0 → Xbox Live → XSTS → Minecraft Services, using a public client
app registration (no client secret, same model every legitimate third-party launcher
uses). No passwords are ever handled directly by the launcher.

## License

TBD.
