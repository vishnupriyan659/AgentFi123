import { Connection, PublicKey, SystemProgram, SystemInstruction, Transaction, clusterApiUrl } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

export const MAX_DEVNET_TRANSFER_SOL = 0.05;
export const ESTIMATED_DEFAULT_FEE_LAMPORTS = 5000n;
export const DEVNET_GENESIS_HASH = "EtWTRABZaYqXxicM2PbsjdpRiNgMjhwgMBExDHH5v55";

let cachedDevnetVerified: boolean | null = null;

export type WalletErrorClassification = "rejected" | "failed";

export interface WalletErrorDetails {
  type: WalletErrorClassification;
  message: string;
  debugInfo?: Record<string, any>;
}

/**
 * Classifies wallet / Phantom execution errors into genuine user rejection vs technical failure with full sanitized cause debugging.
 */
export function classifyWalletError(error: any, context?: Record<string, any>): WalletErrorDetails {
  if (!error) {
    return { type: "failed", message: "Unknown wallet error occurred." };
  }

  const code = error.code ?? error.error?.code ?? error.data?.code;
  const causeMsg = error.cause?.message || (typeof error.cause === "string" ? error.cause : undefined);
  const rawMsg = error.message || error.reason || (typeof error === "string" ? error : "Wallet operation failed.");

  let fullMessage = rawMsg;
  if (causeMsg && !rawMsg.includes(causeMsg)) {
    fullMessage = `${rawMsg} (Cause: ${causeMsg})`;
  }
  if (code !== undefined) {
    if (code === -32603) {
      fullMessage = `Internal Phantom error (-32603): ${fullMessage}`;
    } else if (!fullMessage.includes(`[Error ${code}]`)) {
      fullMessage = `[Error ${code}] ${fullMessage}`;
    }
  }

  const debugInfo = {
    name: error.name || error.constructor?.name || "Error",
    code,
    message: rawMsg,
    cause: error.cause,
    causeMessage: causeMsg,
    errorObj: error.error,
    walletAdapterError: error.constructor?.name,
    ...context,
  };

  if (typeof process !== "undefined" && (process.env?.NODE_ENV === "development" || (import.meta as any)?.env?.DEV)) {
    console.error("[Phantom/Wallet Execution Error Debug]", debugInfo);
  }

  const isUserRejectedCode = code === 4001;
  const isUserRejectedText = /user\s+(rejected|cancelled|canceled)|reject(ed)?\s+by\s+user/i.test(fullMessage);

  if (isUserRejectedCode || isUserRejectedText) {
    return {
      type: "rejected",
      message: "Transaction cancelled in Phantom. Nothing was sent.",
      debugInfo,
    };
  }

  return {
    type: "failed",
    message: fullMessage || "Phantom transaction execution failed.",
    debugInfo,
  };
}

/**
 * Verifies that the current connection genuinely communicates with Solana Devnet by comparing genesis hashes.
 */
export async function verifyDevnetCluster(connection: Connection): Promise<boolean> {
  if (cachedDevnetVerified !== null) return cachedDevnetVerified;
  try {
    const configHash = await connection.getGenesisHash();
    if (configHash === DEVNET_GENESIS_HASH) {
      cachedDevnetVerified = true;
      return true;
    }

    const refConn = new Connection(clusterApiUrl(WalletAdapterNetwork.Devnet), "confirmed");
    const refHash = await refConn.getGenesisHash();

    const matches = (configHash === refHash);
    cachedDevnetVerified = matches;
    return matches;
  } catch (e) {
    console.warn("Devnet cluster genesis hash check failed:", e);
    cachedDevnetVerified = false;
    return false;
  }
}

/**
 * Serializes transaction message cleanly across Node, Browser, and JSDOM test environments.
 */
export function serializePreparedTransactionMessage(tx: Transaction): Uint8Array {
  try {
    return tx.serializeMessage();
  } catch {
    const fromStr = tx.instructions[0]?.keys[0]?.pubkey.toBase58() || "";
    const toStr = tx.instructions[0]?.keys[1]?.pubkey.toBase58() || "";
    const ixData = tx.instructions[0]?.data ? new Uint8Array(tx.instructions[0].data) : new Uint8Array(0);
    const dataStr = Array.from(ixData).map(b => b.toString(16).padStart(2, '0')).join('');
    const blockhashStr = tx.recentBlockhash || "";
    const text = `${fromStr}:${toStr}:${dataStr}:${blockhashStr}`;
    return new TextEncoder().encode(text);
  }
}

/**
 * Compares two byte arrays byte-for-byte.
 */
export function areMessagesEqual(bytesA: Uint8Array, bytesB: Uint8Array): boolean {
  if (bytesA.length !== bytesB.length) return false;
  for (let i = 0; i < bytesA.length; i++) {
    if (bytesA[i] !== bytesB[i]) return false;
  }
  return true;
}

export interface AmountValidationResult {
  valid: boolean;
  solAmount: number;
  lamports: bigint;
  error?: string;
}

export interface RecipientValidationResult {
  valid: boolean;
  publicKey?: PublicKey;
  error?: string;
}

export interface InstructionVerificationResult {
  valid: boolean;
  error?: string;
}

export interface FeeAndSimulationResult {
  feeLamports: bigint;
  feeSol: number;
  simulationPassed: boolean;
  simulationError?: string;
  logs?: string[];
}

export interface PreparedTransfer {
  transaction: Transaction;
  preparedMessageBytes: Uint8Array;
  blockhash: string;
  lastValidBlockHeight: number;
  sender: string;
  recipient: string;
  lamports: bigint;
  solAmount: number;
  estimatedFeeLamports: bigint;
  estimatedFeeSol: number;
  walletBalanceLamports: bigint;
  walletBalanceSol: number;
  expectedRemainingLamports: bigint;
  expectedRemainingSol: number;
  simulation: FeeAndSimulationResult;
  backendProposal: any;
  preparationTimestamp: number;
}

/**
 * Validates decimal amount string strictly for native SOL transfer.
 */
export function validateAndParseAmount(amountStr: string): AmountValidationResult {
  const trimmed = amountStr.trim();
  if (!trimmed) {
    return { valid: false, solAmount: 0, lamports: 0n, error: "Amount string is empty." };
  }

  const num = Number(trimmed);
  if (!Number.isFinite(num) || Number.isNaN(num)) {
    return { valid: false, solAmount: 0, lamports: 0n, error: "Invalid numeric amount." };
  }

  if (num <= 0) {
    return { valid: false, solAmount: 0, lamports: 0n, error: "Transfer amount must be greater than 0." };
  }

  if (num > MAX_DEVNET_TRANSFER_SOL) {
    return { 
      valid: false, 
      solAmount: num, 
      lamports: 0n, 
      error: `Hackathon Devnet test cap exceeded. Maximum allowed transfer is ${MAX_DEVNET_TRANSFER_SOL} SOL.` 
    };
  }

  const parts = trimmed.split(".");
  if (parts.length > 2) {
    return { valid: false, solAmount: 0, lamports: 0n, error: "Malformed decimal number." };
  }

  const decimals = parts[1] || "";
  if (decimals.length > 9) {
    return { valid: false, solAmount: num, lamports: 0n, error: "Amount cannot exceed 9 decimal places." };
  }

  const whole = parts[0] || "0";
  const fractionPadded = decimals.padEnd(9, "0");
  
  try {
    const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fractionPadded);
    return { valid: true, solAmount: num, lamports };
  } catch (e: any) {
    return { valid: false, solAmount: 0, lamports: 0n, error: "Failed to convert amount to lamports." };
  }
}

/**
 * Validates recipient Solana public key.
 */
export function validateRecipient(
  recipientStr: string,
  senderPublicKeyStr?: string
): RecipientValidationResult {
  const trimmed = recipientStr.trim();
  if (!trimmed) {
    return { valid: false, error: "Recipient wallet address is required." };
  }

  let pubkey: PublicKey;
  try {
    pubkey = new PublicKey(trimmed);
  } catch {
    return { valid: false, error: "Invalid Solana public key format." };
  }

  if (!PublicKey.isOnCurve(pubkey.toBuffer())) {
    return { valid: false, error: "Recipient address is not an on-curve user wallet." };
  }

  if (senderPublicKeyStr) {
    try {
      const senderKey = new PublicKey(senderPublicKeyStr);
      if (pubkey.equals(senderKey)) {
        return { valid: false, error: "Self-transfer is not permitted." };
      }
    } catch {
      // ignore sender parse error here
    }
  }

  return { valid: true, publicKey: pubkey };
}

/**
 * Builds a native SOL transfer Transaction using ONLY the official @solana/web3.js SystemProgram.transfer helper.
 * Strictly requires lamports to be a positive safe integer <= 50,000,000 (0.05 SOL).
 */
export function buildTransferTransaction(
  fromPubkey: PublicKey,
  toPubkey: PublicKey,
  lamports: bigint,
  blockhash: string
): Transaction {
  const lamportsNum = Number(lamports);
  if (!Number.isSafeInteger(lamportsNum) || lamportsNum <= 0 || lamportsNum > 50_000_000) {
    throw new Error("Lamport amount must be a positive safe integer <= 50,000,000 lamports (0.05 SOL).");
  }

  const transaction = new Transaction({
    feePayer: fromPubkey,
    recentBlockhash: blockhash,
  });

  transaction.add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports: lamportsNum,
    })
  );

  return transaction;
}

/**
 * Verifies that a constructed Transaction contains strictly 1 instruction,
 * and decodes it using official SystemInstruction.decodeTransfer() to verify expected fromPubkey, toPubkey, and lamports.
 */
export function verifyTransferInstruction(
  tx: Transaction,
  expectedFrom: PublicKey,
  expectedTo: PublicKey,
  expectedLamports: bigint
): InstructionVerificationResult {
  if (tx.instructions.length !== 1) {
    return { valid: false, error: `Transaction must contain exactly 1 instruction, found ${tx.instructions.length}.` };
  }

  const ix = tx.instructions[0];
  if (!ix.programId.equals(SystemProgram.programId)) {
    return { valid: false, error: `Instruction program ID ${ix.programId.toBase58()} does not match SystemProgram.` };
  }

  try {
    const decoded = SystemInstruction.decodeTransfer(ix);
    if (!decoded.fromPubkey.equals(expectedFrom)) {
      return { valid: false, error: "Source wallet mismatch in SystemInstruction transfer." };
    }
    if (!decoded.toPubkey.equals(expectedTo)) {
      return { valid: false, error: "Recipient wallet mismatch in SystemInstruction transfer." };
    }
    if (BigInt(decoded.lamports) !== expectedLamports) {
      return { 
        valid: false, 
        error: `Lamports in SystemInstruction (${decoded.lamports}) does not match expected amount (${expectedLamports}).` 
      };
    }
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: `Failed to decode SystemInstruction transfer: ${e.message || e}` };
  }
}

/**
 * Estimates fee and runs a real Devnet RPC simulation for a prepared native transfer.
 */
export async function estimateFeeAndSimulate(
  connection: Connection,
  tx: Transaction,
  walletBalanceSol: number,
  transferLamports: bigint
): Promise<FeeAndSimulationResult> {
  try {
    const message = tx.compileMessage();
    const feeRes = await connection.getFeeForMessage(message, "confirmed");
    const feeLamports = BigInt(feeRes?.value ?? 5000);
    const feeSol = Number(feeLamports) / 1e9;

    const totalRequiredLamports = transferLamports + feeLamports;
    const walletBalanceLamports = BigInt(Math.floor(walletBalanceSol * 1e9));

    if (walletBalanceLamports < totalRequiredLamports) {
      return {
        feeLamports,
        feeSol,
        simulationPassed: false,
        simulationError: `Insufficient SOL balance. Required: ${((Number(totalRequiredLamports)) / 1e9).toFixed(6)} SOL (Transfer + Fee), Available: ${walletBalanceSol.toFixed(6)} SOL.`
      };
    }

    const simRes = await connection.simulateTransaction(tx);
    const passed = simRes.value.err == null;
    const errStr = simRes.value.err ? JSON.stringify(simRes.value.err) : undefined;

    return {
      feeLamports,
      feeSol,
      simulationPassed: passed,
      simulationError: errStr,
      logs: simRes.value.logs ?? undefined
    };
  } catch (e: any) {
    return {
      feeLamports: ESTIMATED_DEFAULT_FEE_LAMPORTS,
      feeSol: 0.000005,
      simulationPassed: false,
      simulationError: e.message || "Devnet simulation failed."
    };
  }
}
