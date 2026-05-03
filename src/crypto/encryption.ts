import { base64ToBytes, bytesToBase64 } from "@/utils/encoding";
import type { EncryptedPayload } from "@/types/wallet";

const KDF_ITERATIONS = 250_000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const asArrayBuffer = (bytes: Uint8Array): ArrayBuffer => {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
};

const deriveKey = async (
  password: string,
  salt: Uint8Array,
  usages: KeyUsage[]
): Promise<CryptoKey> => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: asArrayBuffer(salt),
      iterations: KDF_ITERATIONS
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    usages
  );
};

export const encryptSensitiveString = async (
  value: string,
  password: string
): Promise<EncryptedPayload> => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt, ["encrypt"]);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv
    },
    key,
    textEncoder.encode(value)
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    iv: bytesToBase64(iv),
    salt: bytesToBase64(salt),
    kdfIterations: KDF_ITERATIONS
  };
};

export const decryptSensitiveString = async (
  payload: EncryptedPayload,
  password: string
): Promise<string> => {
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);

  const key = await deriveKey(password, salt, ["decrypt"]);
  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: asArrayBuffer(iv)
    },
    key,
    asArrayBuffer(ciphertext)
  );

  return textDecoder.decode(plaintextBuffer);
};
