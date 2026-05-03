export type WalletNetwork = "mainnet" | "testnet";
export type WalletType = "native_segwit" | "taproot";

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
  kdfIterations: number;
}

export interface PersistedWallet {
  version: number;
  walletName: string;
  network: WalletNetwork;
  walletType: WalletType;
  encryptedMnemonic: EncryptedPayload;
  passwordVerifier: string;
  createdAt: string;
}

export interface WalletAccount {
  address: string;
  publicKeyHex: string;
  privateKeyWif: string;
  walletType: WalletType;
}

export interface UnlockedSession {
  mnemonic: string;
  account: WalletAccount;
  network: WalletNetwork;
  walletName: string;
  walletType: WalletType;
}

export interface FeeRates {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface PreparedTransaction {
  rawHex: string;
  feeSats: number;
  selectedInputs: number;
  changeSats: number;
  txid: string;
}
