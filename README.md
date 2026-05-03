# Bitcoin Wallet Browser Extension

A minimal manifest V3 Bitcoin wallet extension for Chrome and Firefox, built with React, TypeScript, Vite, and Radix UI.

## Feature List

### Wallet setup and onboarding

- New wallet creation with custom wallet name.
- Password setup with confirmation and minimum length validation.
- 12-word or 24-word mnemonic generation.
- Explicit backup confirmation step before wallet creation completes.
- Network selection: mainnet or testnet.
- Address type selection:
	- Native SegWit (P2WPKH, BIP84)
	- Taproot (P2TR, BIP86)

### Authentication and session behavior

- Locked/unlocked wallet state machine in React context.
- Password-based unlock using a password verifier check.
- Decryption only at unlock time, with sensitive values kept in memory.
- Manual lock action from settings.
- Background alarm-based session marker cleanup in service worker.

### Wallet operations

- Balance refresh from mempool.space API.
- Fee estimation refresh from recommended fee endpoint.
- Receive screen with:
	- QR code generation
	- copy-to-clipboard address action
	- next/previous derived receive addresses by index
- Send screen with:
	- destination and amount entry
	- fee tier selection (fast/normal/economy)
	- network-aware destination validation
	- UTXO selection and PSBT signing
	- transaction broadcast to mempool.space

### Activity and UTXO visibility

- Recent transaction list for the primary wallet address.
- Transaction status display (confirmed/pending).
- Transaction detail page with:
	- amount
	- fee
	- date/time
	- full txid
	- parsed inputs and outputs
	- outbound link to mempool.space explorer
- UTXO summary page (count + total value).

### Settings and customization

- Wallet rename.
- Recovery phrase reveal gated by password re-entry.
- Theme preference toggle (light/dark) persisted to extension storage.
- Manual refresh controls for fees and balance.
- Full wallet reset (clears persisted wallet data).

## Security Model

Sensitive material is never persisted in plaintext:

- mnemonic
- seed
- private keys
- raw password

Persisted storage includes only:

- encrypted mnemonic payload (AES-GCM)
- PBKDF2 salt / IV / iteration metadata
- password verifier hash
- wallet metadata and preferences

Cryptography details:

- Encryption: AES-256-GCM via Web Crypto.
- KDF: PBKDF2-SHA256 with high iteration count.
- Constant-time style verifier comparison for password checks.

Unlocked secrets are held in memory only and cleared on lock/reset.

## Folder Structure

```text
chrome-ext-wallet/
├── package.json
├── popup.html
├── README.md
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── icons/
├── public/
│   ├── manifest.json
│   └── icons/
└── src/
		├── App.tsx
		├── background.ts
		├── main.tsx
		├── styles.css
		├── vite-env.d.ts
		├── bitcoin/
		│   └── wallet.ts
		├── components/
		│   └── AppHeader.tsx
		├── context/
		│   └── WalletContext.tsx
		├── crypto/
		│   ├── encryption.ts
		│   └── password.ts
		├── hooks/
		│   └── useWallet.ts
		├── layouts/
		│   └── PopupShell.tsx
		├── pages/
		│   ├── DashboardPage.tsx
		│   ├── OnboardingPage.tsx
		│   ├── ReceivePage.tsx
		│   ├── SendPage.tsx
		│   ├── SettingsPage.tsx
		│   ├── TransactionDetailPage.tsx
		│   ├── UnlockPage.tsx
		│   └── UtxosPage.tsx
		├── services/
		│   └── mempool.ts
		├── storage/
		│   └── walletStorage.ts
		├── types/
		│   └── wallet.ts
		└── utils/
				└── encoding.ts
```

## Development

Install dependencies:

```bash
npm install
```

Build extension:

```bash
npm run build
```

Create browser-specific zip artifacts:

```bash
npm run package:extensions
```

Optional single-browser packaging:

```bash
npm run package:chrome
npm run package:firefox
```

Artifacts are written to `release/`:

- `bitcoin-wallet-chrome-v<version>.zip`
- `bitcoin-wallet-firefox-v<version>.zip`

Watch mode build:

```bash
npm run dev
```

Type check:

```bash
npm run typecheck
```

Lint:

```bash
npm run lint
```

## Load Unpacked Extension in Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the generated `dist` folder.

## Load Unpacked Extension in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click Load Temporary Add-on.
3. Select `dist/manifest.json`.


## Architecture

### Runtime surfaces

1. Popup UI (React app): primary wallet experience and stateful interaction.
2. Background runtime:
	 - Chrome uses a Manifest V3 service worker.
	 - Firefox uses a background script (event-page style) from the same `background.js` entry.
3. WebExtension storage:
	 - `chrome.storage.local` for persisted wallet record and theme preference
	 - optional `chrome.storage.session` usage in background cleanup path
4. External data/provider APIs: mempool.space for balance, UTXOs, fees, tx history, and broadcast.

### State and control flow

- `WalletProvider` is the central orchestration layer.
- App state transitions follow: `loading -> setup | locked -> unlocked`.
- On bootstrap, persisted wallet/theme are loaded from storage.
- On unlock, mnemonic is decrypted, account is derived, and an in-memory session is created.
- UI pages consume wallet state and actions through the `useWallet` hook.

### Crypto and key handling

- Mnemonic generation uses BIP39 wordlists.
- Account derivation uses HD paths:
	- BIP84 for native SegWit
	- BIP86 for Taproot
- Encryption/decryption is handled by Web Crypto primitives.
- Private key material is derived in-memory from decrypted mnemonic.

### Transaction pipeline

1. Fetch spendable UTXOs for the sender address.
2. Select inputs according to amount + fee target.
3. Build PSBT with witness UTXO data.
4. Sign inputs (native SegWit or Taproot signer path).
5. Finalize and extract raw transaction hex.
6. Broadcast through mempool.space API.
7. Refresh balance after successful broadcast.

### UI composition

- `App.tsx` gates high-level routes by wallet status.
- `DashboardPage` handles home-level navigation to receive/send/utxos/settings/transaction details.
- Page components remain focused and presentational while wallet operations are provided by context.

