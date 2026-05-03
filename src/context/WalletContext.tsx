import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import * as bitcoin from "bitcoinjs-lib";
import { z } from "zod";
import {
  createMnemonic,
  deriveAccountFromMnemonic,
  getNetworkObject
} from "@/bitcoin/wallet";
import { decryptSensitiveString, encryptSensitiveString } from "@/crypto/encryption";
import { buildPasswordVerifier, safeEquals } from "@/crypto/password";
import {
  clearPersistedWallet,
  getPersistedWallet,
  getThemePreference,
  savePersistedWallet,
  saveThemePreference
} from "@/storage/walletStorage";
import { createAndBroadcastTransaction, fetchAddressBalance, fetchFeeRates } from "@/services/mempool";
import type {
  FeeRates,
  PersistedWallet,
  PreparedTransaction,
  UnlockedSession,
  WalletNetwork,
  WalletType
} from "@/types/wallet";

const createWalletSchema = z.object({
  walletName: z.string().trim().min(1, "Wallet name is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  network: z.enum(["mainnet", "testnet"]),
  walletType: z.enum(["native_segwit", "taproot"])
});

type WalletStatus = "loading" | "setup" | "locked" | "unlocked";

interface WalletContextValue {
  status: WalletStatus;
  theme: "light" | "dark";
  wallet: PersistedWallet | null;
  session: UnlockedSession | null;
  balanceSats: number;
  feeRates: FeeRates | null;
  createWallet: (input: {
    walletName: string;
    password: string;
    network: WalletNetwork;
    walletType: WalletType;
    mnemonic?: string;
  }) => Promise<void>;
  unlockWallet: (password: string) => Promise<void>;
  lockWallet: () => void;
  refreshBalance: () => Promise<void>;
  refreshFeeRates: () => Promise<void>;
  sendBitcoin: (input: {
    toAddress: string;
    amountSats: number;
    feeRate: number;
  }) => Promise<PreparedTransaction>;
  clearWalletData: () => Promise<void>;
  setTheme: (theme: "light" | "dark") => Promise<void>;
  renameWallet: (newName: string) => Promise<void>;
  revealMnemonic: (password: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<WalletStatus>("loading");
  const [wallet, setWallet] = useState<PersistedWallet | null>(null);
  const [session, setSession] = useState<UnlockedSession | null>(null);
  const [balanceSats, setBalanceSats] = useState(0);
  const [feeRates, setFeeRates] = useState<FeeRates | null>(null);
  const [theme, setThemeState] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const bootstrap = async () => {
      const [storedWallet, storedTheme] = await Promise.all([
        getPersistedWallet(),
        getThemePreference()
      ]);
      setWallet(storedWallet);
      setThemeState(storedTheme);
      setStatus(storedWallet ? "locked" : "setup");
    };

    bootstrap().catch(() => {
      setStatus("setup");
    });
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!session) {
      setBalanceSats(0);
      return;
    }

    const balance = await fetchAddressBalance(session.account.address, session.network);
    setBalanceSats(balance);
  }, [session]);

  const refreshFeeRates = useCallback(async () => {
    if (!session) {
      setFeeRates(null);
      return;
    }

    const rates = await fetchFeeRates(session.network);
    setFeeRates(rates);
  }, [session]);

  useEffect(() => {
    if (status !== "unlocked") {
      return;
    }

    refreshBalance().catch(() => {
      setBalanceSats(0);
    });
    refreshFeeRates().catch(() => {
      setFeeRates(null);
    });
  }, [status, refreshBalance, refreshFeeRates]);

  const createWalletHandler = useCallback(
    async (input: {
      walletName: string;
      password: string;
      network: WalletNetwork;
      walletType: WalletType;
      mnemonic?: string;
    }) => {
      const parsed = createWalletSchema.parse(input);

      const mnemonic = input.mnemonic ?? (await createMnemonic());
      const encryptedMnemonic = await encryptSensitiveString(mnemonic, parsed.password);
      const passwordVerifier = await buildPasswordVerifier(parsed.password, encryptedMnemonic.salt);

      const newWallet: PersistedWallet = {
        version: 1,
        walletName: parsed.walletName,
        network: parsed.network,
        walletType: parsed.walletType,
        encryptedMnemonic,
        passwordVerifier,
        createdAt: new Date().toISOString()
      };

      await savePersistedWallet(newWallet);

      const account = deriveAccountFromMnemonic(mnemonic, parsed.network, parsed.walletType);
      setWallet(newWallet);
      setSession({
        mnemonic,
        account,
        network: parsed.network,
        walletName: parsed.walletName,
        walletType: parsed.walletType
      });
      setStatus("unlocked");
    },
    []
  );

  const unlockWallet = useCallback(
    async (password: string) => {
      if (!wallet) {
        throw new Error("No wallet exists yet.");
      }

      const candidateVerifier = await buildPasswordVerifier(
        password,
        wallet.encryptedMnemonic.salt
      );

      if (!safeEquals(candidateVerifier, wallet.passwordVerifier)) {
        throw new Error("Incorrect password.");
      }

      const mnemonic = await decryptSensitiveString(wallet.encryptedMnemonic, password);
      const selectedWalletType = wallet.walletType ?? "native_segwit";
      const account = deriveAccountFromMnemonic(mnemonic, wallet.network, selectedWalletType);
      setSession({
        mnemonic,
        account,
        network: wallet.network,
        walletName: wallet.walletName,
        walletType: selectedWalletType
      });
      setStatus("unlocked");
    },
    [wallet]
  );

  const lockWallet = useCallback(() => {
    setSession(null);
    setBalanceSats(0);
    setFeeRates(null);
    setStatus(wallet ? "locked" : "setup");
  }, [wallet]);

  const sendBitcoin = useCallback(
    async (input: { toAddress: string; amountSats: number; feeRate: number }) => {
      if (!session) {
        throw new Error("Wallet is locked.");
      }

      // Ensure destination address belongs to the selected network before signing.
      try {
        bitcoin.address.toOutputScript(input.toAddress, getNetworkObject(session.network));
      } catch {
        throw new Error("Invalid destination address for selected network.");
      }

      const tx = await createAndBroadcastTransaction({
        fromAddress: session.account.address,
        toAddress: input.toAddress,
        amountSats: input.amountSats,
        privateKeyWif: session.account.privateKeyWif,
        feeRate: input.feeRate,
        network: session.network,
        walletType: session.walletType
      });

      await refreshBalance();
      return tx;
    },
    [session, refreshBalance]
  );

  const clearWalletData = useCallback(async () => {
    await clearPersistedWallet();
    setWallet(null);
    setSession(null);
    setBalanceSats(0);
    setFeeRates(null);
    setStatus("setup");
  }, []);

  const setTheme = useCallback(async (nextTheme: "light" | "dark") => {
    await saveThemePreference(nextTheme);
    setThemeState(nextTheme);
  }, []);

  const renameWallet = useCallback(async (newName: string) => {
    if (!wallet || !session) throw new Error("Wallet is locked.");
    const trimmed = newName.trim();
    if (!trimmed) throw new Error("Wallet name cannot be empty.");
    const updatedWallet = { ...wallet, walletName: trimmed };
    await savePersistedWallet(updatedWallet);
    setWallet(updatedWallet);
    setSession((prev) => (prev ? { ...prev, walletName: trimmed } : prev));
  }, [wallet, session]);

  const revealMnemonic = useCallback(async (password: string): Promise<string> => {
    if (!wallet || !session) throw new Error("Wallet is locked.");
    const candidateVerifier = await buildPasswordVerifier(password, wallet.encryptedMnemonic.salt);
    if (!safeEquals(candidateVerifier, wallet.passwordVerifier)) {
      throw new Error("Incorrect password.");
    }
    return session.mnemonic;
  }, [wallet, session]);

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      theme,
      wallet,
      session,
      balanceSats,
      feeRates,
      createWallet: createWalletHandler,
      unlockWallet,
      lockWallet,
      refreshBalance,
      refreshFeeRates,
      sendBitcoin,
      clearWalletData,
      setTheme,
      renameWallet,
      revealMnemonic
    }),
    [
      status,
      theme,
      wallet,
      session,
      balanceSats,
      feeRates,
      createWalletHandler,
      unlockWallet,
      lockWallet,
      refreshBalance,
      refreshFeeRates,
      sendBitcoin,
      clearWalletData,
      setTheme,
      renameWallet,
      revealMnemonic
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export const useWalletContext = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWalletContext must be used inside WalletProvider.");
  }
  return context;
};
