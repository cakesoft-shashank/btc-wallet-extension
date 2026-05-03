import {
  Badge,
  Button,
  Card,
  Flex,
  SegmentedControl,
  Text,
  TextField
} from "@radix-ui/themes";

interface SendPageProps {
  toAddress: string;
  amountBtc: string;
  feeTier: string;
  selectedFeeRate: number;
  sendState: "idle" | "sending";
  sendError: string | null;
  txid: string | null;
  canSend: boolean;
  onBack: () => void;
  onToAddressChange: (value: string) => void;
  onAmountBtcChange: (value: string) => void;
  onFeeTierChange: (value: string) => void;
  onSend: () => Promise<void>;
}

export const SendPage = ({
  toAddress,
  amountBtc,
  feeTier,
  selectedFeeRate,
  sendState,
  sendError,
  txid,
  canSend,
  onBack,
  onToAddressChange,
  onAmountBtcChange,
  onFeeTierChange,
  onSend
}: SendPageProps) => {
  return (
    <Flex direction="column" gap="3" className="wallet-home full-height">
      <Flex align="center" justify="between" className="wallet-subpage-header">
        <Button variant="ghost" onClick={onBack}>
          {"< Back"}
        </Button>
        <Text size="4" weight="bold">
          Send
        </Text>
        <Text size="1" color="gray">
          BTC
        </Text>
      </Flex>

      <Card className="home-panel-card">
        <Flex direction="column" gap="3">
          <Text size="2">Destination address</Text>
          <TextField.Root
            value={toAddress}
            onChange={(event) => onToAddressChange(event.target.value)}
            placeholder="bc1... / tb1..."
          />

          <Text size="2">Amount (BTC)</Text>
          <TextField.Root
            value={amountBtc}
            onChange={(event) => onAmountBtcChange(event.target.value)}
            placeholder="0.00010000"
          />

          <Text size="2">Fee priority</Text>
          <SegmentedControl.Root value={feeTier} onValueChange={onFeeTierChange} size="2">
            <SegmentedControl.Item value="fastestFee">Fast</SegmentedControl.Item>
            <SegmentedControl.Item value="halfHourFee">Normal</SegmentedControl.Item>
            <SegmentedControl.Item value="economyFee">Eco</SegmentedControl.Item>
          </SegmentedControl.Root>

          <Text size="2" color="gray">
            Selected fee: {selectedFeeRate} sat/vB
          </Text>

          {sendError ? (
            <Text size="2" color="red">
              {sendError}
            </Text>
          ) : null}

          {txid ? (
            <Flex align="center" gap="2" wrap="wrap">
              <Badge color="green">Broadcasted</Badge>
              <Text size="1" className="mono-wrap">
                {txid}
              </Text>
            </Flex>
          ) : null}

          <Button onClick={onSend} disabled={sendState === "sending" || !canSend}>
            {sendState === "sending" ? "Sending..." : "Send Bitcoin"}
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
};
