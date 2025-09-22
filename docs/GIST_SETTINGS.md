# Global Gist Settings

The launcher now provides a single source of truth for GitHub Gist credentials that any gist-enabled app can reuse. This guide explains how to open the Settings modal, what persists between sessions, and how individual apps stay in sync with the shared configuration.

## Apps that honor the global settings

The following experiences automatically read and write the global gist configuration:

- **CatPad** – keeps note sync settings aligned with the shared gist ID, filename, and token preferences.
- **Zen Do** – mirrors the launcher defaults in its Sync drawer so task pushes and pulls use the same gist connection.
- **Cat Typing Speed Test** – pre-fills the gist ID and keeps the opt-in token memory toggle consistent with the rest of the suite.

Future apps that adopt gist sync should consume the launcher settings store to ensure a single set of credentials governs every integration.

## Opening the Settings modal

1. Open the launcher (`/`) and look at the top-right corner of the header.
2. Click the **Settings** button (gear icon) to open the modal.
3. Choose the **Gist Sync** tab to edit the shared gist ID, default filename, and token retention toggle.

The launcher persists the most recent settings immediately, so closing the modal or navigating into an app keeps the values available everywhere.

## Persistence model

- The non-sensitive options (gist ID, default filename, remember-token flag, and sync enablement) are stored in a first-party cookie named `g1:gist-settings` with `path=/`, so every launcher app running on the same origin can read them.
- Cookies are saved with a 30-day expiration and `SameSite=Lax`, preventing cross-site leakage while allowing same-origin navigation.
- Personal Access Tokens (PATs) never ride in cookies. They live only in memory unless the **Remember this token on this device** toggle is enabled, in which case the token is written to `localStorage` under `g1:gist-token` and cleared when the toggle is disabled.
- Clearing the cookie or local storage resets the global configuration; each app falls back to local defaults until the user re-enters credentials.

## Per-app form behavior

- **CatPad** and **Zen Do** read the shared gist ID, filename, and remember-token preference on load, so their forms render whatever the launcher last stored. Updating any of those fields inside the app immediately updates the global cookie and broadcasts the change back to the launcher.
- **Cat Typing Speed Test** mirrors the gist ID from the cookie when the page initializes and applies token updates through the shared remember-token flag. Toggling token persistence from the launcher or another app takes effect on the next refresh.
- Because every app writes through the same settings channel, editing gist credentials in one place automatically updates the forms everywhere else, preventing accidental drift between environments.

## Operational notes

- Treat stored PATs as sensitive—advise users to leave the remember-token toggle off on shared devices.
- Contributors adding gist integration to new apps should import the shared settings helpers rather than inventing separate storage, keeping consent and persistence consistent across the catalog.
