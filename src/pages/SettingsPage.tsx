import { useState } from "react";
import { Button, Card, Flex, SegmentedControl, Separator, Text, TextField } from "@radix-ui/themes";

interface SettingsPageProps {
  theme: "light" | "dark";
  walletName: string;
  onBack: () => void;
  onThemeChange: (theme: "light" | "dark") => void;
  onRefreshFeeRates: () => Promise<void>;
  onRefreshBalance: () => Promise<void>;
  onLockWallet: () => void;
  onResetWallet: () => Promise<void>;
  onRenameWallet: (newName: string) => Promise<void>;
  onRevealMnemonic: (password: string) => Promise<string>;
}

export const SettingsPage = ({
  theme,
  walletName,
  onBack,
  onThemeChange,
  onRefreshFeeRates,
  onRefreshBalance,
  onLockWallet,
  onResetWallet,
  onRenameWallet,
  onRevealMnemonic
}: SettingsPageProps) => {
  const [nameInput, setNameInput] = useState(walletName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [revealPassword, setRevealPassword] = useState("");
  const [revealedMnemonic, setRevealedMnemonic] = useState<string | null>(null);
  const [revealLoading, setRevealLoading] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  const handleRename = async () => {
    if (!nameInput.trim()) {
      setNameError("Name cannot be empty.");
      return;
    }
    setNameSaving(true);
    setNameError(null);
    try {
      await onRenameWallet(nameInput.trim());
    } catch (err) {
      setNameError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setNameSaving(false);
    }
  };

  const handleReveal = async () => {
    setRevealLoading(true);
    setRevealError(null);
    try {
      const mnemonic = await onRevealMnemonic(revealPassword);
      setRevealedMnemonic(mnemonic);
      setRevealPassword("");
    } catch (err) {
      setRevealError(err instanceof Error ? err.message : "Failed to reveal.");
    } finally {
      setRevealLoading(false);
    }
  };

  const mnemonicWords = revealedMnemonic ? revealedMnemonic.split(" ") : [];

  return (
    <Flex direction="column" gap="3" className="wallet-home full-height">
      <Flex align="center" justify="between" className="wallet-subpage-header">
        <Button variant="ghost" onClick={onBack}>
          {"< Back"}
        </Button>
        <Text size="4" weight="bold">
          Settings
        </Text>
        <Text size="1" color="gray">
          BTC
        </Text>
      </Flex>

      <Card className="home-panel-card">
        <Flex direction="column" gap="3">
          <Text size="1" color="gray">
            Independent project by Shashank. Not affiliated with Mozilla, Bitcoin.org, or mempool.space.
          </Text>

          <Separator size="4" />

          {/* Wallet Name */}
          <Text size="2" weight="bold">Wallet Name</Text>
          <Flex gap="2" align="center">
            <TextField.Root
              style={{ flex: 1 }}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Wallet name"
            />
            <Button
              variant="soft"
              disabled={nameSaving || nameInput.trim() === walletName}
              onClick={handleRename}
            >
              {nameSaving ? "Saving…" : "Save"}
            </Button>
          </Flex>
          {nameError && <Text size="1" color="red">{nameError}</Text>}

          <Separator size="4" />

          {/* Theme */}
          <Text size="2" weight="bold">Theme</Text>
          <SegmentedControl.Root
            value={theme}
            onValueChange={(nextTheme) => onThemeChange(nextTheme as "light" | "dark")}
          >
            <SegmentedControl.Item value="light">Light</SegmentedControl.Item>
            <SegmentedControl.Item value="dark">Dark</SegmentedControl.Item>
          </SegmentedControl.Root>

          <Separator size="4" />

          {/* Recovery Phrase */}
          <Text size="2" weight="bold">Recovery Phrase</Text>
          {revealedMnemonic ? (
            <Flex direction="column" gap="2">
              <div className="mnemonic-grid">
                {mnemonicWords.map((word, i) => (
                  <div key={`${word}-${i}`} className="mnemonic-word">
                    <span className="mnemonic-index">{i + 1}.</span> {word}
                  </div>
                ))}
              </div>
              <Button
                variant="ghost"
                color="gray"
                size="1"
                onClick={() => setRevealedMnemonic(null)}
              >
                Hide
              </Button>
            </Flex>
          ) : (
            <Flex direction="column" gap="2">
              <TextField.Root
                type="password"
                value={revealPassword}
                onChange={(e) => setRevealPassword(e.target.value)}
                placeholder="Enter password to reveal"
                onKeyDown={(e) => { if (e.key === "Enter") handleReveal(); }}
              />
              {revealError && <Text size="1" color="red">{revealError}</Text>}
              <Button
                variant="soft"
                color="amber"
                disabled={revealLoading || !revealPassword}
                onClick={handleReveal}
              >
                {revealLoading ? "Verifying…" : "Show Recovery Phrase"}
              </Button>
            </Flex>
          )}

          <Separator size="4" />

          <Button variant="soft" onClick={onRefreshFeeRates}>
            Refresh fee estimates
          </Button>
          <Button variant="soft" onClick={onRefreshBalance}>
            Refresh balance
          </Button>
          <Button color="amber" onClick={onLockWallet}>
            Lock wallet
          </Button>
          <Button color="red" variant="soft" onClick={onResetWallet}>
            Reset wallet data
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
};
