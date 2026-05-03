import type { PersistedWallet } from "@/types/wallet";

const WALLET_KEY = "wallet_record";
const THEME_KEY = "wallet_theme";

const hasChromeStorage = () =>
  typeof chrome !== "undefined" && !!chrome.storage?.local;

export const getPersistedWallet = async (): Promise<PersistedWallet | null> => {
  if (!hasChromeStorage()) {
    return null;
  }

  const result = await chrome.storage.local.get(WALLET_KEY);
  return (result[WALLET_KEY] as PersistedWallet | undefined) ?? null;
};

export const savePersistedWallet = async (wallet: PersistedWallet): Promise<void> => {
  if (!hasChromeStorage()) {
    throw new Error("Chrome storage is unavailable.");
  }

  await chrome.storage.local.set({ [WALLET_KEY]: wallet });
};

export const clearPersistedWallet = async (): Promise<void> => {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.remove(WALLET_KEY);
};

export const getThemePreference = async (): Promise<"light" | "dark"> => {
  if (!hasChromeStorage()) {
    return "dark";
  }

  const result = await chrome.storage.local.get(THEME_KEY);
  return result[THEME_KEY] === "light" ? "light" : "dark";
};

export const saveThemePreference = async (theme: "light" | "dark"): Promise<void> => {
  if (!hasChromeStorage()) {
    return;
  }

  await chrome.storage.local.set({ [THEME_KEY]: theme });
};
