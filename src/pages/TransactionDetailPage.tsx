import { Button, Badge, Card, Flex, Separator, Text } from "@radix-ui/themes";
import type { AddressTransaction } from "@/services/mempool";

interface TransactionDetailPageProps {
  tx: AddressTransaction;
  ownAddress: string;
  amountSats: number;
  balanceMode: "btc" | "sats";
  network: "mainnet" | "testnet";
  onBack: () => void;
}

const satsToBtc = (sats: number): string => (sats / 100_000_000).toFixed(8);
const satsSignedToBtc = (sats: number): string => {
  const abs = Math.abs(sats) / 100_000_000;
  const sign = sats >= 0 ? "+" : "-";
  return `${sign}${abs.toFixed(8)}`;
};
const satsSignedToSats = (sats: number): string => {
  const sign = sats >= 0 ? "+" : "-";
  return `${sign}${Math.abs(sats).toLocaleString()}`;
};

const mempoolUrl = (txid: string, network: "mainnet" | "testnet") =>
  network === "mainnet"
    ? `https://mempool.space/tx/${txid}`
    : `https://mempool.space/testnet4/tx/${txid}`;

export const TransactionDetailPage = ({
  tx,
  ownAddress,
  amountSats,
  balanceMode,
  network,
  onBack
}: TransactionDetailPageProps) => {
  const signedAmount =
    balanceMode === "btc"
      ? `${satsSignedToBtc(amountSats)} BTC`
      : `${satsSignedToSats(amountSats)} sats`;

  const feeBtc = satsToBtc(tx.fee);
  const feeSats = tx.fee.toLocaleString();
  const feeDisplay = balanceMode === "btc" ? `${feeBtc} BTC` : `${feeSats} sats`;

  const dateStr = tx.status.block_time
    ? new Date(tx.status.block_time * 1000).toLocaleString()
    : "Unconfirmed";

  return (
    <Flex direction="column" gap="3" className="wallet-home full-height">
      <Flex align="center" justify="between" className="wallet-subpage-header">
        <Button variant="ghost" onClick={onBack}>
          {"< Back"}
        </Button>
        <Text size="4" weight="bold">
          Transaction
        </Text>
        <Badge color={tx.status.confirmed ? "green" : "amber"} variant="soft">
          {tx.status.confirmed ? "Confirmed" : "Pending"}
        </Badge>
      </Flex>

      <Card className="home-panel-card">
        <Flex direction="column" gap="3">
          {/* Amount */}
          <Flex justify="between" align="center">
            <Text size="2" color="gray">Amount</Text>
            <Text size="3" weight="bold" color={amountSats >= 0 ? "green" : "red"}>
              {signedAmount}
            </Text>
          </Flex>

          <Separator size="4" />

          {/* Fee */}
          <Flex justify="between" align="center">
            <Text size="2" color="gray">Network fee</Text>
            <Text size="2">{feeDisplay}</Text>
          </Flex>

          <Separator size="4" />

          {/* Date */}
          <Flex justify="between" align="center">
            <Text size="2" color="gray">Date</Text>
            <Text size="2">{dateStr}</Text>
          </Flex>

          <Separator size="4" />

          {/* TXID */}
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">Transaction ID</Text>
            <Text size="1" className="mono-wrap" style={{ wordBreak: "break-all" }}>
              {tx.txid}
            </Text>
          </Flex>

          <Separator size="4" />

          {/* Inputs */}
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Inputs ({tx.vin.length})</Text>
            {tx.vin.map((input, i) => (
              <Flex
                key={`vin-${i}`}
                justify="between"
                align="center"
                gap="2"
                style={{ opacity: input.prevout?.scriptpubkey_address === ownAddress ? 1 : 0.6 }}
              >
                <Text size="1" className="mono-wrap" style={{ wordBreak: "break-all", flex: 1 }}>
                  {input.prevout?.scriptpubkey_address ?? "Unknown"}
                  {input.prevout?.scriptpubkey_address === ownAddress && (
                    <Badge ml="1" size="1" variant="soft" color="blue">you</Badge>
                  )}
                </Text>
                <Text size="1" style={{ whiteSpace: "nowrap" }}>
                  {input.prevout ? `${satsToBtc(input.prevout.value)} BTC` : "—"}
                </Text>
              </Flex>
            ))}
          </Flex>

          <Separator size="4" />

          {/* Outputs */}
          <Flex direction="column" gap="2">
            <Text size="2" color="gray">Outputs ({tx.vout.length})</Text>
            {tx.vout.map((output, i) => (
              <Flex
                key={`vout-${i}`}
                justify="between"
                align="center"
                gap="2"
                style={{ opacity: output.scriptpubkey_address === ownAddress ? 1 : 0.6 }}
              >
                <Text size="1" className="mono-wrap" style={{ wordBreak: "break-all", flex: 1 }}>
                  {output.scriptpubkey_address ?? "Unknown"}
                  {output.scriptpubkey_address === ownAddress && (
                    <Badge ml="1" size="1" variant="soft" color="blue">you</Badge>
                  )}
                </Text>
                <Text size="1" style={{ whiteSpace: "nowrap" }}>
                  {satsToBtc(output.value)} BTC
                </Text>
              </Flex>
            ))}
          </Flex>

          <Separator size="4" />

          {/* External link */}
          <Button
            variant="soft"
            asChild
          >
            <a href={mempoolUrl(tx.txid, network)} target="_blank" rel="noreferrer">
              View on mempool.space ↗
            </a>
          </Button>
        </Flex>
      </Card>
    </Flex>
  );
};
