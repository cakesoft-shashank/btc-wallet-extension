import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "@bitcoin-js/tiny-secp256k1-asmjs";
import type { FeeRates, PreparedTransaction, WalletNetwork, WalletType } from "@/types/wallet";
import { getNetworkObject } from "@/bitcoin/wallet";
import { ensureBitcoinEcc } from "@/bitcoin/ecc";

ensureBitcoinEcc();

const ECPair = ECPairFactory(ecc);

interface Utxo {
  txid: string;
  vout: number;
  value: number;
}

export interface AddressUtxo {
  txid: string;
  vout: number;
  value: number;
}

export interface AddressTransaction {
  txid: string;
  fee: number;
  status: {
    confirmed: boolean;
    block_time?: number;
  };
  vin: Array<{
    prevout?: {
      scriptpubkey_address?: string;
      value: number;
    };
  }>;
  vout: Array<{
    scriptpubkey_address?: string;
    value: number;
  }>;
}

const DUST_THRESHOLD = 546;

const apiBase = (network: WalletNetwork): string => {
  return network === "mainnet"
    ? "https://mempool.space/api"
    : "https://mempool.space/testnet4/api";
};

const asJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`Network request failed (${response.status}).`);
  }
  return (await response.json()) as T;
};

export const fetchAddressBalance = async (
  address: string,
  network: WalletNetwork
): Promise<number> => {
  const response = await fetch(`${apiBase(network)}/address/${address}`);
  const data = await asJson<{
    chain_stats: { funded_txo_sum: number; spent_txo_sum: number };
    mempool_stats: { funded_txo_sum: number; spent_txo_sum: number };
  }>(response);

  const confirmed = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
  const pending = data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
  return confirmed + pending;
};

export const fetchFeeRates = async (network: WalletNetwork): Promise<FeeRates> => {
  const response = await fetch(`${apiBase(network)}/v1/fees/recommended`);
  return asJson<FeeRates>(response);
};

const fetchUtxos = async (address: string, network: WalletNetwork): Promise<Utxo[]> => {
  const response = await fetch(`${apiBase(network)}/address/${address}/utxo`);
  return asJson<Utxo[]>(response);
};

export const fetchAddressUtxos = async (
  address: string,
  network: WalletNetwork
): Promise<AddressUtxo[]> => {
  return fetchUtxos(address, network);
};

export const fetchAddressTransactions = async (
  address: string,
  network: WalletNetwork
): Promise<AddressTransaction[]> => {
  const response = await fetch(`${apiBase(network)}/address/${address}/txs`);
  return asJson<AddressTransaction[]>(response);
};

const estimateVbytes = (inputs: number, outputs: number): number => {
  return inputs * 68 + outputs * 31 + 10;
};

const loadWitnessUtxo = async (
  txid: string,
  vout: number,
  network: WalletNetwork
): Promise<{ script: Buffer; value: number }> => {
  const txHexResponse = await fetch(`${apiBase(network)}/tx/${txid}/hex`);
  if (!txHexResponse.ok) {
    throw new Error("Unable to fetch transaction hex for selected UTXO.");
  }

  const txHex = await txHexResponse.text();
  const tx = bitcoin.Transaction.fromHex(txHex.trim());
  const output = tx.outs[vout];

  if (!output) {
    throw new Error("UTXO output index not found.");
  }

  return {
    script: output.script,
    value: output.value
  };
};

const selectUtxos = (
  utxos: Utxo[],
  amountSats: number,
  feeRate: number
): { selected: Utxo[]; feeSats: number; changeSats: number } => {
  let runningTotal = 0;
  const selected: Utxo[] = [];

  for (const utxo of utxos) {
    selected.push(utxo);
    runningTotal += utxo.value;

    const tentativeFee = Math.ceil(estimateVbytes(selected.length, 2) * feeRate);
    const required = amountSats + tentativeFee;
    if (runningTotal >= required) {
      const changeSats = runningTotal - required;
      if (changeSats >= DUST_THRESHOLD) {
        return { selected, feeSats: tentativeFee, changeSats };
      }

      const noChangeFee = Math.ceil(estimateVbytes(selected.length, 1) * feeRate);
      const noChangeRequired = amountSats + noChangeFee;
      if (runningTotal >= noChangeRequired) {
        return {
          selected,
          feeSats: noChangeFee,
          changeSats: 0
        };
      }
    }
  }

  throw new Error("Insufficient spendable balance for amount + fee.");
};

export const createAndBroadcastTransaction = async (params: {
  fromAddress: string;
  toAddress: string;
  amountSats: number;
  privateKeyWif: string;
  feeRate: number;
  network: WalletNetwork;
  walletType: WalletType;
}): Promise<PreparedTransaction> => {
  const { fromAddress, toAddress, amountSats, privateKeyWif, feeRate, network, walletType } =
    params;

  if (amountSats <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  const utxos = await fetchUtxos(fromAddress, network);
  if (utxos.length === 0) {
    throw new Error("No spendable UTXOs found for this wallet.");
  }

  const { selected, feeSats, changeSats } = selectUtxos(utxos, amountSats, feeRate);
  const btcNetwork = getNetworkObject(network);
  const keyPair = ECPair.fromWIF(privateKeyWif, btcNetwork);
  const psbt = new bitcoin.Psbt({ network: btcNetwork });

  const tapInternalKey = keyPair.publicKey.subarray(1, 33);
  const tweakedPrivateKey = ecc.privateAdd(
    keyPair.privateKey,
    bitcoin.crypto.taggedHash("TapTweak", tapInternalKey)
  );

  if (!tweakedPrivateKey) {
    throw new Error("Unable to derive taproot signing key.");
  }

  const taprootSigner = ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
    network: btcNetwork
  });

  for (const utxo of selected) {
    const witnessUtxo = await loadWitnessUtxo(utxo.txid, utxo.vout, network);
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      witnessUtxo,
      ...(walletType === "taproot" ? { tapInternalKey } : {})
    });
  }

  psbt.addOutput({
    address: toAddress,
    value: amountSats
  });

  if (changeSats >= DUST_THRESHOLD) {
    psbt.addOutput({
      address: fromAddress,
      value: changeSats
    });
  }

  selected.forEach((_, index) => {
    psbt.signInput(index, walletType === "taproot" ? taprootSigner : keyPair);
  });

  psbt.finalizeAllInputs();
  const tx = psbt.extractTransaction();
  const rawHex = tx.toHex();
  const txid = tx.getId();

  const response = await fetch(`${apiBase(network)}/tx`, {
    method: "POST",
    body: rawHex,
    headers: {
      "Content-Type": "text/plain"
    }
  });

  if (!response.ok) {
    throw new Error("Broadcast failed. Verify amount, fee and destination address.");
  }

  return {
    rawHex,
    feeSats,
    selectedInputs: selected.length,
    changeSats,
    txid
  };
};
