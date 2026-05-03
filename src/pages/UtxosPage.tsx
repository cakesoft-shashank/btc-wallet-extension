import { Button, Card, Flex, Text } from "@radix-ui/themes";

interface UtxosPageProps {
  utxoLoading: boolean;
  utxoCount: number;
  utxoTotalSats: number;
  onBack: () => void;
}

const satsToBtc = (sats: number): string => (sats / 100_000_000).toFixed(8);

export const UtxosPage = ({
  utxoLoading,
  utxoCount,
  utxoTotalSats,
  onBack
}: UtxosPageProps) => {
  return (
    <Flex direction="column" gap="3" className="wallet-home full-height">
      <Flex align="center" justify="between" className="wallet-subpage-header">
        <Button variant="ghost" onClick={onBack}>
          {"< Back"}
        </Button>
        <Text size="4" weight="bold">
          UTXOs
        </Text>
        <Text size="1" color="gray">
          BTC
        </Text>
      </Flex>

      <Card className="home-panel-card">
        <Flex direction="column" gap="2">
          <Text size="2" color="gray">
            Spendable outputs
          </Text>
          <Text size="5" weight="bold">
            {utxoLoading ? "Loading..." : `${utxoCount} UTXOs`}
          </Text>
          <Text size="2">Total UTXO value: {satsToBtc(utxoTotalSats)} BTC</Text>
        </Flex>
      </Card>
    </Flex>
  );
};
