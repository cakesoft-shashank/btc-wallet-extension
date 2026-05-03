import { useState } from "react";
import { Button, Card, Flex, Text, TextField } from "@radix-ui/themes";
import { AppHeader } from "@/components/AppHeader";
import { useWallet } from "@/hooks/useWallet";

export const UnlockPage = () => {
  const { wallet, unlockWallet } = useWallet();
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await unlockWallet(password);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock wallet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Flex direction="column" gap="4" className="full-height">
      <AppHeader
        title={wallet?.walletName ?? "Unlock Wallet"}
        subtitle="Enter your wallet password to decrypt keys in memory."
      />
      <Card>
        <Flex direction="column" gap="3">
          <Text size="2">Password</Text>
          <TextField.Root
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Wallet password"
          />
          {error ? (
            <Text size="2" color="red">
              {error}
            </Text>
          ) : null}
          <Button disabled={isSubmitting || password.length === 0} onClick={handleUnlock}>
            {isSubmitting ? "Unlocking..." : "Unlock"}
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
};
