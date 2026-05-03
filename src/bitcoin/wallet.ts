import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { HDKey } from "@scure/bip32";
import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoin-js/tiny-secp256k1-asmjs";
import type { WalletAccount, WalletNetwork, WalletType } from "@/types/wallet";

const NATIVE_SEGWIT_MAINNET_PATH = "m/84'/0'/0'/0/0";
const NATIVE_SEGWIT_TESTNET_PATH = "m/84'/1'/0'/0/0";
const TAPROOT_MAINNET_PATH = "m/86'/0'/0'/0/0";
const TAPROOT_TESTNET_PATH = "m/86'/1'/0'/0/0";
const ECPair = ECPairFactory(ecc);

const getBitcoinNetwork = (network: WalletNetwork): bitcoin.Network => {
  return network === "mainnet" ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
};

export const createMnemonic = async (): Promise<string> => {
  return generateMnemonic(wordlist, 256);
};

export const createMnemonicWithLength = async (
  words: 12 | 24 = 24
): Promise<string> => {
  const strength = words === 12 ? 128 : 256;
  return generateMnemonic(wordlist, strength);
};

export const isValidMnemonic = (mnemonic: string): boolean => {
  return validateMnemonic(mnemonic.trim(), wordlist);
};

export const deriveAccountFromMnemonic = (
  mnemonic: string,
  network: WalletNetwork,
  walletType: WalletType = "native_segwit"
): WalletAccount => {
  const trimmed = mnemonic.trim();
  if (!isValidMnemonic(trimmed)) {
    throw new Error("Invalid mnemonic.");
  }

  const seed = mnemonicToSeedSync(trimmed);
  const master = HDKey.fromMasterSeed(seed);
  const path =
    walletType === "taproot"
      ? network === "mainnet"
        ? TAPROOT_MAINNET_PATH
        : TAPROOT_TESTNET_PATH
      : network === "mainnet"
        ? NATIVE_SEGWIT_MAINNET_PATH
        : NATIVE_SEGWIT_TESTNET_PATH;
  const child = master.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error("Unable to derive account key material.");
  }

  const btcNetwork = getBitcoinNetwork(network);
  const pubkey = Buffer.from(child.publicKey);
  const payment =
    walletType === "taproot"
      ? bitcoin.payments.p2tr({
          internalPubkey: pubkey.subarray(1, 33),
          network: btcNetwork
        })
      : bitcoin.payments.p2wpkh({
          pubkey,
          network: btcNetwork
        });

  if (!payment.address) {
    throw new Error("Unable to derive wallet address.");
  }

  const keyPair = ECPair.fromPrivateKey(Buffer.from(child.privateKey), {
    network: btcNetwork
  });

  return {
    address: payment.address,
    publicKeyHex: pubkey.toString("hex"),
    privateKeyWif: keyPair.toWIF(),
    walletType
  };
};

export const deriveAddressAtIndex = (
  mnemonic: string,
  network: WalletNetwork,
  walletType: WalletType,
  index: number
): string => {
  const trimmed = mnemonic.trim();
  if (!isValidMnemonic(trimmed)) {
    throw new Error("Invalid mnemonic.");
  }

  const seed = mnemonicToSeedSync(trimmed);
  const master = HDKey.fromMasterSeed(seed);

  // BIP84 for native-segwit, BIP86 for taproot. Coin: 0 mainnet, 1 testnet.
  const coin = network === "mainnet" ? 0 : 1;
  const purpose = walletType === "taproot" ? 86 : 84;
  const path = `m/${purpose}'/${coin}'/0'/0/${index}`;
  const child = master.derive(path);

  if (!child.publicKey) {
    throw new Error("Unable to derive key at index.");
  }

  const btcNetwork = getBitcoinNetwork(network);
  const pubkey = Buffer.from(child.publicKey);
  const payment =
    walletType === "taproot"
      ? bitcoin.payments.p2tr({ internalPubkey: pubkey.subarray(1, 33), network: btcNetwork })
      : bitcoin.payments.p2wpkh({ pubkey, network: btcNetwork });

  if (!payment.address) {
    throw new Error("Unable to derive address at index.");
  }

  return payment.address;
};

export const getNetworkObject = (network: WalletNetwork): bitcoin.Network => {
  return getBitcoinNetwork(network);
};
