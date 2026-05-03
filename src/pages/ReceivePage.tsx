import { Button, Card, Flex, Text } from "@radix-ui/themes";

interface ReceivePageProps {
  address: string;
  qrDataUrl: string;
  addressCopied: boolean;
  addressIndex: number;
  onCopyAddress: () => Promise<void>;
  onBack: () => void;
  onNextAddress: () => void;
  onPrevAddress?: () => void;
}

export const ReceivePage = ({
  address,
  qrDataUrl,
  addressCopied,
  addressIndex,
  onCopyAddress,
  onBack,
  onNextAddress,
  onPrevAddress
}: ReceivePageProps) => {
  return (
    <Flex direction="column" gap="3" className="wallet-home full-height">
      <Flex align="center" justify="between" className="wallet-subpage-header">
        <Button variant="ghost" onClick={onBack}>
          {"< Back"}
        </Button>
        <Text size="4" weight="bold">
          Receive
        </Text>
        <Text size="1" color="gray">
          BTC
        </Text>
      </Flex>

      <Card className="home-panel-card">
        <Flex direction="column" align="center" gap="3">
          {qrDataUrl ? <img src={qrDataUrl} alt="Address QR" className="qr-image" /> : null}
          <Text size="1" className="mono-wrap">
            {address}
          </Text>
          <Button onClick={onCopyAddress}>{addressCopied ? "Copied" : "Copy address"}</Button>

          <Flex align="center" gap="3" mt="1">
            <Button
              variant="ghost"
              size="1"
              disabled={!onPrevAddress}
              onClick={onPrevAddress}
            >
              ← Prev
            </Button>
            <Text size="1" color="gray">
              Address #{addressIndex}
            </Text>
            <Button variant="ghost" size="1" onClick={onNextAddress}>
              Next →
            </Button>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
};
