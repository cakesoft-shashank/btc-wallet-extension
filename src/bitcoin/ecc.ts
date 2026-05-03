import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "@bitcoin-js/tiny-secp256k1-asmjs";

let initialized = false;

export const ensureBitcoinEcc = (): void => {
  if (initialized) {
    return;
  }

  bitcoin.initEccLib(ecc as never);
  initialized = true;
};
