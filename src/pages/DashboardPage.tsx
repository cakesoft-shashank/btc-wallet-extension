import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  IconButton,
  Text
} from "@radix-ui/themes";
import {
  ArrowTopRightIcon,
  CardStackIcon,
  DownloadIcon,
  GearIcon
} from "@radix-ui/react-icons";
import QRCode from "qrcode";
import { useWallet } from "@/hooks/useWallet";
import { fetchAddressTransactions, fetchAddressUtxos } from "@/services/mempool";
import { deriveAddressAtIndex } from "@/bitcoin/wallet";
import { ReceivePage } from "@/pages/ReceivePage";
import { SendPage } from "@/pages/SendPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { UtxosPage } from "@/pages/UtxosPage";
import { TransactionDetailPage } from "@/pages/TransactionDetailPage";
import type { AddressTransaction } from "@/services/mempool";

type DashboardView = "home" | "receive" | "send" | "utxos" | "settings" | "transaction";

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
const btcToSats = (btc: string): number => Math.round(Number.parseFloat(btc || "0") * 100_000_000);

const shortenTxid = (txid: string): string => `${txid.slice(0, 8)}...${txid.slice(-8)}`;

interface RecentTransactionItem {
  txid: string;
  amountSats: number;
  confirmed: boolean;
  timestamp: number | null;
}

export const DashboardPage = () => {
  const {
    session,
    balanceSats,
    feeRates,
    refreshBalance,
    refreshFeeRates,
    sendBitcoin,
    lockWallet,
    clearWalletData,
    theme,
    setTheme,
    renameWallet,
    revealMnemonic
  } = useWallet();
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [addressCopied, setAddressCopied] = useState(false);
  const [toAddress, setToAddress] = useState("");
  const [amountBtc, setAmountBtc] = useState("");
  const [feeTier, setFeeTier] = useState("halfHourFee");
  const [sendState, setSendState] = useState<"idle" | "sending">("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);
  const [view, setView] = useState<DashboardView>("home");
  const [utxoCount, setUtxoCount] = useState(0);
  const [utxoTotalSats, setUtxoTotalSats] = useState(0);
  const [utxoLoading, setUtxoLoading] = useState(false);
  const [recentTxs, setRecentTxs] = useState<RecentTransactionItem[]>([]);
  const [recentTxLoading, setRecentTxLoading] = useState(false);
  const [balanceMode, setBalanceMode] = useState<"btc" | "sats">("btc");
  const [fullTxs, setFullTxs] = useState<AddressTransaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<{ tx: AddressTransaction; amountSats: number } | null>(null);
  const [receiveAddressIndex, setReceiveAddressIndex] = useState(0);

  const receiveAddress = useMemo(() => {
    if (!session) return "";
    try {
      return deriveAddressAtIndex(session.mnemonic, session.network, session.walletType, receiveAddressIndex);
    } catch {
      return session.account.address;
    }
  }, [session, receiveAddressIndex]);

  useEffect(() => {
    if (!session || !receiveAddress) {
      return;
    }

    QRCode.toDataURL(receiveAddress, {
      margin: 1,
      width: 190
    })
      .then((url: string) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [session, receiveAddress]);

  useEffect(() => {
    if (!session || view !== "utxos") {
      return;
    }

    setUtxoLoading(true);
    fetchAddressUtxos(session.account.address, session.network)
      .then((utxos) => {
        setUtxoCount(utxos.length);
        setUtxoTotalSats(utxos.reduce((sum, item) => sum + item.value, 0));
      })
      .catch(() => {
        setUtxoCount(0);
        setUtxoTotalSats(0);
      })
      .finally(() => {
        setUtxoLoading(false);
      });
  }, [session, view]);

  useEffect(() => {
    if (!session || view !== "home") {
      return;
    }

    setRecentTxLoading(true);
    fetchAddressTransactions(session.account.address, session.network)
      .then((txs) => {
        const mapped = txs.slice(0, 8).map((tx) => {
          const receivedSats = tx.vout
            .filter((output) => output.scriptpubkey_address === session.account.address)
            .reduce((sum, output) => sum + output.value, 0);

          const spentSats = tx.vin
            .filter((input) => input.prevout?.scriptpubkey_address === session.account.address)
            .reduce((sum, input) => sum + (input.prevout?.value ?? 0), 0);

          return {
            txid: tx.txid,
            amountSats: receivedSats - spentSats,
            confirmed: tx.status.confirmed,
            timestamp: tx.status.block_time ?? null
          };
        });
        setRecentTxs(mapped);
        setFullTxs(txs.slice(0, 8));
      })
      .catch(() => {
        setRecentTxs([]);
        setFullTxs([]);
      })
      .finally(() => {
        setRecentTxLoading(false);
      });
  }, [session, view]);

  const selectedFeeRate = useMemo(() => {
    if (!feeRates) {
      return 2;
    }

    if (feeTier === "fastestFee") {
      return feeRates.fastestFee;
    }
    if (feeTier === "hourFee") {
      return feeRates.hourFee;
    }
    if (feeTier === "economyFee") {
      return feeRates.economyFee;
    }
    return feeRates.halfHourFee;
  }, [feeRates, feeTier]);

  const balanceDisplay =
    balanceMode === "btc"
      ? `${satsToBtc(balanceSats)} BTC`
      : `${balanceSats.toLocaleString()} sats`;

  const formatSignedAmount = (sats: number): string => {
    return balanceMode === "btc"
      ? `${satsSignedToBtc(sats)} BTC`
      : `${satsSignedToSats(sats)} sats`;
  };

  if (!session) {
    return null;
  }

  const copyAddress = async () => {
    await navigator.clipboard.writeText(receiveAddress);
    setAddressCopied(true);
    setTimeout(() => setAddressCopied(false), 1300);
  };

  const onSend = async () => {
    setSendState("sending");
    setSendError(null);
    setTxid(null);

    const amountSats = btcToSats(amountBtc);
    if (!Number.isFinite(amountSats) || amountSats <= 0) {
      setSendState("idle");
      setSendError("Enter a valid amount.");
      return;
    }

    try {
      const tx = await sendBitcoin({
        toAddress,
        amountSats,
        feeRate: selectedFeeRate
      });
      setTxid(tx.txid);
      setAmountBtc("");
      setToAddress("");
      await refreshBalance();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "Unable to send transaction.");
    } finally {
      setSendState("idle");
    }
  };

  if (view === "receive") {
    return (
      <ReceivePage
        address={receiveAddress}
        qrDataUrl={qrDataUrl}
        addressCopied={addressCopied}
        onCopyAddress={copyAddress}
        onBack={() => setView("home")}
        addressIndex={receiveAddressIndex}
        onNextAddress={() => {
          setAddressCopied(false);
          setReceiveAddressIndex((i) => i + 1);
        }}
        onPrevAddress={receiveAddressIndex > 0 ? () => {
          setAddressCopied(false);
          setReceiveAddressIndex((i) => i - 1);
        } : undefined}
      />
    );
  }

  if (view === "send") {
    return (
      <SendPage
        toAddress={toAddress}
        amountBtc={amountBtc}
        feeTier={feeTier}
        selectedFeeRate={selectedFeeRate}
        sendState={sendState}
        sendError={sendError}
        txid={txid}
        canSend={!!feeRates}
        onBack={() => setView("home")}
        onToAddressChange={setToAddress}
        onAmountBtcChange={setAmountBtc}
        onFeeTierChange={setFeeTier}
        onSend={onSend}
      />
    );
  }

  if (view === "settings") {
    return (
      <SettingsPage
        theme={theme}
        walletName={session.walletName}
        onBack={() => setView("home")}
        onThemeChange={setTheme}
        onRefreshFeeRates={refreshFeeRates}
        onRefreshBalance={refreshBalance}
        onLockWallet={lockWallet}
        onResetWallet={clearWalletData}
        onRenameWallet={renameWallet}
        onRevealMnemonic={revealMnemonic}
      />
    );
  }

  if (view === "transaction" && selectedTx) {
    return (
      <TransactionDetailPage
        tx={selectedTx.tx}
        ownAddress={session.account.address}
        amountSats={selectedTx.amountSats}
        balanceMode={balanceMode}
        network={session.network}
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "utxos") {
    return (
      <UtxosPage
        utxoLoading={utxoLoading}
        utxoCount={utxoCount}
        utxoTotalSats={utxoTotalSats}
        onBack={() => setView("home")}
      />
    );
  }

  return (
    <Flex direction="column" gap="3" className="wallet-home full-height">
      <Flex justify="between" align="center" className="wallet-topbar">
        <Text size="6" weight="bold" className="wallet-brand">
            {session.walletName}
        </Text>
        <Flex gap="2" align="center">
          <IconButton aria-label="Open settings" variant="ghost" onClick={() => setView("settings")}>
            <GearIcon width={20} height={20}/>
          </IconButton>
        </Flex>
      </Flex>

      <Flex direction="column" align="center" gap="1" className="wallet-hero">
        <Flex align="center" gap="2">
          <button
            type="button"
            className="balance-toggle-button"
            onClick={() => setBalanceMode((current) => (current === "btc" ? "sats" : "btc"))}
            aria-label="Toggle balance units"
            title="Toggle BTC / sats"
          >
            <Text size="7" weight="bold">
              {balanceDisplay}
            </Text>
          </button>
          <IconButton variant="soft" radius="full" onClick={() => refreshBalance()}>
            ↻
          </IconButton>
        </Flex>
        <Text size="2" color="gray">
          {session.network === "mainnet" ? "Mainnet" : "Testnet"} • {session.walletType === "taproot" ? "Taproot" : "Native SegWit"}
        </Text>
      </Flex>

      {/* <Flex className="wallet-address-pill" align="center" justify="between" gap="3">
        <Flex align="center" gap="2" className="address-left-group">
          <Badge variant="surface">BTC</Badge>
          <Text size="2" className="mono-wrap">
            {shortenAddress(session.account.address)}
          </Text>
        </Flex>
        <Button size="1" variant="ghost" onClick={copyAddress}>
          {addressCopied ? "Copied" : "Copy"}
        </Button>
      </Flex> */}

      <Flex gap="3" className="wallet-actions-row">
        <Button className="wallet-action-tile" variant="soft" onClick={() => setView("receive")}>
          <Flex direction="column" align="center" gap="2">
            <DownloadIcon width={26} height={26} />
            <Text size="3">Receive</Text>
          </Flex>
        </Button>
        <Button className="wallet-action-tile" variant="soft" onClick={() => setView("send")}>
          <Flex direction="column" align="center" gap="2">
            <ArrowTopRightIcon width={26} height={26} />
            <Text size="3">Send</Text>
          </Flex>
        </Button>
        <Button className="wallet-action-tile" variant="soft" onClick={() => setView("utxos")}>
          <Flex direction="column" align="center" gap="2">
            <CardStackIcon width={26} height={26} />
            <Text size="3">UTXOs</Text>
          </Flex>
        </Button>
      </Flex>

      <Card className="home-panel-card">
        <Flex direction="column" gap="2">
          <Text size="2" color="gray">Recent transactions</Text>
          {recentTxLoading ? (
            <Text size="2">Scanning address...</Text>
          ) : null}
          {!recentTxLoading && recentTxs.length === 0 ? (
            <Text size="2" color="gray">No transactions found yet for this address.</Text>
          ) : null}
          {!recentTxLoading && recentTxs.length > 0 ? (
            <Flex direction="column" gap="2" className="recent-tx-list">
              {recentTxs.map((tx, i) => (
                <Flex
                  key={tx.txid}
                  align="center"
                  justify="between"
                  gap="2"
                  className="recent-tx-row"
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    const full = fullTxs[i];
                    if (full) {
                      setSelectedTx({ tx: full, amountSats: tx.amountSats });
                      setView("transaction");
                    }
                  }}
                >
                  <Flex direction="column" gap="1">
                    <Text size="2" className="mono-wrap">{shortenTxid(tx.txid)}</Text>
                    <Text size="1" color="gray">
                      {tx.confirmed ? "Confirmed" : "Pending"}
                      {tx.timestamp ? ` • ${new Date(tx.timestamp * 1000).toLocaleDateString()}` : ""}
                    </Text>
                  </Flex>
                  <Text size="2" color={tx.amountSats >= 0 ? "green" : "red"}>
                    {formatSignedAmount(tx.amountSats)}
                  </Text>
                </Flex>
              ))}
            </Flex>
          ) : null}
        </Flex>
      </Card>
    </Flex>
  );
};
