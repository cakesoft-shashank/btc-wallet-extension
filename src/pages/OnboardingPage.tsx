import { useState } from "react";
import {
  Button,
  Card,
  Checkbox,
  Flex,
  Select,
  Text,
  TextField
} from "@radix-ui/themes";
import { AppHeader } from "@/components/AppHeader";
import { createMnemonicWithLength } from "@/bitcoin/wallet";
import { useWallet } from "@/hooks/useWallet";
import type { WalletNetwork, WalletType } from "@/types/wallet";

type OnboardingStep = "intro" | "setup" | "mnemonic";

export const OnboardingPage = () => {
  const { createWallet } = useWallet();
  const [step, setStep] = useState<OnboardingStep>("intro");
  const [walletName, setWalletName] = useState("My Bitcoin Wallet");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [network, setNetwork] = useState<WalletNetwork>("testnet");
  const [walletType, setWalletType] = useState<WalletType>("native_segwit");
  const [mnemonicLength, setMnemonicLength] = useState<12 | 24>(12);
  const [mnemonic, setMnemonic] = useState("");
  const [confirmedBackup, setConfirmedBackup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSetupNext = async () => {
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const generated = await createMnemonicWithLength(mnemonicLength);
      setMnemonic(generated);
      setConfirmedBackup(false);
      setStep("mnemonic");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate mnemonic.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async () => {
    setError(null);

    if (!mnemonic) {
      setError("Mnemonic is not available. Please go back and retry.");
      return;
    }

    if (!confirmedBackup) {
      setError("Confirm you have written down your Mnemonic.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createWallet({
        walletName,
        password,
        network,
        walletType,
        mnemonic
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create wallet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "intro") {
    return (
      <Flex direction="column" gap="4" className="full-height" justify="between">
        <Flex direction="column" gap="4">
          <AppHeader
            title="Welcome"
            subtitle="Minimal non-custodial Bitcoin wallet for Firefox and Chrome."
          />
          <Card>
            <Flex direction="column" gap="3">
              <Text size="2">You control your keys and Mnemonic.</Text>
              <Text size="2" color="gray">
                Your Mnemonic and private key are encrypted before storage.
              </Text>
              <Text size="2" color="gray">
                Next you will create a password and back up your mnemonic phrase.
              </Text>
            </Flex>
          </Card>
        </Flex>

        <Button size="3" onClick={() => setStep("setup")}>
          Get Started
        </Button>
      </Flex>
    );
  }

  if (step === "mnemonic") {
    const mnemonicWordCount = mnemonic.split(" ").filter(Boolean).length;

    return (
      <Flex direction="column" gap="4" className="full-height" justify="between">
        <Flex direction="column" gap="4">
          <AppHeader
            title="Mnemonic"
            subtitle={`Write these ${mnemonicWordCount} words in order and store them offline.`}
          />

          <Card>
            <Flex direction="column" gap="3">
              <Text size="2" className="mnemonic-grid">
                {mnemonic
                  .split(" ")
                  .map((word, index) => `${index + 1}. ${word}`)
                  .join("\n")}
              </Text>

              <Flex gap="2" align="start">
                <Checkbox
                  checked={confirmedBackup}
                  onCheckedChange={(checked) => setConfirmedBackup(checked === true)}
                />
                <Text size="2">I saved my Mnemonic securely.</Text>
              </Flex>

              {error ? (
                <Text size="2" color="red">
                  {error}
                </Text>
              ) : null}
            </Flex>
          </Card>
        </Flex>

        <Flex gap="2">
          <Button variant="soft" onClick={() => setStep("setup")}>
            Back
          </Button>
          <Button disabled={isSubmitting} onClick={handleCreate}>
            {isSubmitting ? "Creating..." : "I saved it, create wallet"}
          </Button>
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap="4" className="full-height">
      <AppHeader
        title="Create Wallet"
        subtitle="Private key material is encrypted before storage."
      />

      <Card>
        <Flex direction="column" gap="3">
          <Text size="2">Wallet name</Text>
          <TextField.Root
            value={walletName}
            onChange={(event) => setWalletName(event.target.value)}
            placeholder="Wallet name"
          />

          <Text size="2">Network</Text>
          <Select.Root
            value={network}
            onValueChange={(nextValue) => setNetwork(nextValue as WalletNetwork)}
          >
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="testnet">Testnet</Select.Item>
              <Select.Item value="mainnet">Mainnet</Select.Item>
            </Select.Content>
          </Select.Root>

          <Text size="2">Wallet type</Text>
          <Select.Root
            value={walletType}
            onValueChange={(nextValue) => setWalletType(nextValue as WalletType)}
          >
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="native_segwit">Native SegWit (P2WPKH)</Select.Item>
              <Select.Item value="taproot">Taproot (P2TR)</Select.Item>
            </Select.Content>
          </Select.Root>

          <Text size="2">Password</Text>
          <TextField.Root
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
          />

          <Text size="2">Confirm password</Text>
          <TextField.Root
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repeat password"
          />

        <Text size="2">Mnemonic length</Text>
          <Select.Root
            value={String(mnemonicLength)}
            onValueChange={(nextValue) => setMnemonicLength(nextValue === "12" ? 12 : 24)}
          >
            <Select.Trigger />
            <Select.Content>
              <Select.Item value="12">12 words</Select.Item>
              <Select.Item value="24">24 words</Select.Item>
            </Select.Content>
          </Select.Root>

          {error ? (
            <Text size="2" color="red">
              {error}
            </Text>
          ) : null}

          <Button disabled={isSubmitting} onClick={handleSetupNext}>
            {isSubmitting ? "Preparing..." : "Continue"}
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
};
