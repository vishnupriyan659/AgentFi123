import { useState, useEffect, useRef } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import type { ParsedIntent } from "@/lib/intentParser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, ShieldCheck, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { useAgentStore } from "@/store/useAgentStore";
import {
  validateAndParseAmount,
  validateRecipient,
  buildTransferTransaction,
  verifyTransferInstruction,
  estimateFeeAndSimulate,
  verifyDevnetCluster,
  classifyWalletError,
  serializePreparedTransactionMessage,
  areMessagesEqual,
  type PreparedTransfer,
} from "@/lib/solanaTransferService";
import { verifySenderConsistency } from "@/lib/senderConsistency";
import { agentApi } from "@/services/agentApi";
import { PublicKey, Transaction } from "@solana/web3.js";

export const formatSol = (value: unknown, decimals = 6): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toFixed(decimals);
  }
  return "Not available";
};

export const formatLamports = (value: unknown): string => {
  if (typeof value === "bigint") {
    return value.toLocaleString("en-US");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return BigInt(Math.floor(value)).toLocaleString("en-US");
  }
  return "Not available";
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSign: (signature?: string) => void;
  intent: ParsedIntent | null;
  rawIntent: string;
  preparedTransfer?: PreparedTransfer | null;
}

export type TransferState =
  | "idle"
  | "validating"
  | "preparing"
  | "simulating"
  | "ready"
  | "signing"
  | "verifying"
  | "broadcasting"
  | "confirming"
  | "confirmed"
  | "pending"
  | "failed"
  | "rejected"
  | "expired";

export const ApprovalDialog = ({
  open,
  onOpenChange,
  onSign,
  intent,
  rawIntent,
  preparedTransfer,
}: Props) => {
  const { publicKey, connected, signTransaction, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [state, setState] = useState<TransferState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedTransfer | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const inFlightRef = useRef<boolean>(false);

  const connectionStatus = useAgentStore((s) => s.connectionStatus);
  const isDemo = connectionStatus === "demo";
  const solanaNetwork = import.meta.env.VITE_SOLANA_NETWORK || "devnet";

  const isNativeTransfer = intent?.action === "send";
  const recipientAddress = (intent?.target as any)?.recipient || intent?.target?.token || "";
  const amountStr = String(intent?.source?.amount || "0");

  const isProcessing =
    state === "validating" ||
    state === "preparing" ||
    state === "simulating" ||
    state === "signing" ||
    state === "verifying" ||
    state === "broadcasting" ||
    state === "confirming";

  // Modal open / close reset effect
  useEffect(() => {
    inFlightRef.current = false;
    if (!open) {
      setPrepared(null);
      setState("idle");
      setError(null);
      setTxSignature(null);
    }
  }, [open]);

  // Account Switch or Disconnect Reset Effect
  useEffect(() => {
    inFlightRef.current = false;
    setPrepared(null);
    setState("idle");
    setError(null);
    setTxSignature(null);
    if (open) {
      onOpenChange(false);
    }
  }, [publicKey]);

  // Single Prepared Transfer Preparation Effect
  useEffect(() => {
    let active = true;
    const requestPublicKeyStr = publicKey?.toBase58();

    async function preparePipeline() {
      if (!open || isDemo || !isNativeTransfer || !publicKey || !connection || !requestPublicKeyStr) {
        setPrepared(null);
        setState("idle");
        return;
      }

      setError(null);
      setPrepared(null);
      inFlightRef.current = false;

      // Fail-closed validation for required rawIntent string prop
      if (typeof rawIntent !== "string" || !rawIntent.trim()) {
        if (active) {
          setState("failed");
          setError("Invalid input: expected string for rawIntent, received undefined");
        }
        return;
      }

      // Reuse preparedTransfer from Trade.tsx if provided and fresh (<= 20 seconds old)
      if (preparedTransfer) {
        const isFresh = Date.now() - preparedTransfer.preparationTimestamp <= 20000;
        if (
          isFresh &&
          preparedTransfer.sender === requestPublicKeyStr &&
          preparedTransfer.lamports &&
          preparedTransfer.lamports > 0n
        ) {
          if (active) {
            setPrepared(preparedTransfer);
            setState("ready");
            setError(null);
          }
          return;
        }
      }

      // Checkpoint 1 & 4: Sender consistency check
      const consistencyCheck1 = verifySenderConsistency({
        connectedPublicKey: requestPublicKeyStr,
        parsedSender: requestPublicKeyStr,
      });
      if (!consistencyCheck1.valid) {
        if (active) {
          setState("failed");
          setError(consistencyCheck1.error || "Phantom account changed. Review the transfer again.");
        }
        return;
      }

      // 1. Cluster check
      if (solanaNetwork.toLowerCase() !== "devnet") {
        if (active) {
          setState("failed");
          setError("Solana Devnet is required for live test transfers.");
        }
        return;
      }

      const clusterOk = await verifyDevnetCluster(connection);
      if (!clusterOk || !active || publicKey.toBase58() !== requestPublicKeyStr) {
        if (active) {
          setState("failed");
          setError("Verified Solana Devnet connection required.");
        }
        return;
      }

      // 2. Local validation
      const parsedAmount = validateAndParseAmount(amountStr);
      const parsedRecipient = validateRecipient(recipientAddress, requestPublicKeyStr);

      if (!parsedAmount.valid || !parsedRecipient.valid || !parsedRecipient.publicKey) {
        if (active) {
          setState("failed");
          setError(parsedAmount.error || parsedRecipient.error || "Invalid transfer parameters.");
        }
        return;
      }

      // 3. Express backend validation (using normalized single payload contract)
      setState("validating");
      let backendProposal: any = null;
      try {
        const valData = await agentApi.validateTransfer({
          rawIntent: rawIntent.trim(),
          action: "send",
          token: "SOL",
          network: "devnet",
          sender: requestPublicKeyStr,
          recipient: parsedRecipient.publicKey.toBase58(),
          amount: amountStr,
        });

        if (!valData || !valData.valid) {
          if (active && publicKey.toBase58() === requestPublicKeyStr) {
            setState("failed");
            setError(valData?.error || "Backend transfer validation failed.");
          }
          return;
        }
        backendProposal = valData;
      } catch (backendErr: any) {
        if (active && publicKey.toBase58() === requestPublicKeyStr) {
          setState("failed");
          setError(backendErr.message || "Backend transfer validation failed.");
        }
        return;
      }

      // 4. Build single transaction with fresh blockhash
      setState("preparing");
      let blockhash = "";
      let lastValidBlockHeight = 0;
      try {
        const bhInfo = await connection.getLatestBlockhash("confirmed");
        blockhash = bhInfo.blockhash;
        lastValidBlockHeight = bhInfo.lastValidBlockHeight;
      } catch (e: any) {
        if (active && publicKey.toBase58() === requestPublicKeyStr) {
          setState("failed");
          setError("Failed to fetch fresh blockhash from Solana Devnet.");
        }
        return;
      }

      const tx = buildTransferTransaction(
        publicKey,
        parsedRecipient.publicKey,
        parsedAmount.lamports,
        blockhash
      );

      // Verify instruction
      const verifyRes = verifyTransferInstruction(
        tx,
        publicKey,
        parsedRecipient.publicKey,
        parsedAmount.lamports
      );

      if (!verifyRes.valid) {
        if (active && publicKey.toBase58() === requestPublicKeyStr) {
          setState("failed");
          setError(`Transfer instruction verification failed: ${verifyRes.error}`);
        }
        return;
      }

      const preparedMessageBytes = tx.serializeMessage();

      // 5. Devnet RPC Simulation
      setState("simulating");
      try {
        const walletBalanceSol = intent?.walletContext?.balance ?? 0;
        const simRes = await estimateFeeAndSimulate(
          connection,
          tx,
          walletBalanceSol,
          parsedAmount.lamports
        );

        if (!simRes.simulationPassed) {
          if (active && publicKey.toBase58() === requestPublicKeyStr) {
            setState("failed");
            setError(simRes.simulationError || "RPC transaction simulation failed.");
          }
          return;
        }

        const walletBalanceLamports = BigInt(Math.floor(walletBalanceSol * 1e9));
        const totalRequiredLamports = parsedAmount.lamports + simRes.feeLamports;
        const expectedRemainingLamports = walletBalanceLamports >= totalRequiredLamports
          ? walletBalanceLamports - totalRequiredLamports
          : 0n;
        const expectedRemainingSol = Number(expectedRemainingLamports) / 1e9;

        const preparedObj: PreparedTransfer = {
          transaction: tx,
          preparedMessageBytes,
          blockhash,
          lastValidBlockHeight,
          sender: requestPublicKeyStr,
          recipient: parsedRecipient.publicKey.toBase58(),
          lamports: parsedAmount.lamports,
          solAmount: parsedAmount.solAmount,
          estimatedFeeLamports: simRes.feeLamports,
          estimatedFeeSol: simRes.feeSol,
          walletBalanceLamports,
          walletBalanceSol,
          expectedRemainingLamports,
          expectedRemainingSol,
          simulation: simRes,
          backendProposal,
          preparationTimestamp: Date.now(),
        };

        // Metadata completeness guard
        if (
          preparedObj.lamports === undefined ||
          preparedObj.solAmount === undefined ||
          preparedObj.estimatedFeeLamports === undefined ||
          preparedObj.estimatedFeeSol === undefined ||
          preparedObj.walletBalanceLamports === undefined ||
          preparedObj.expectedRemainingLamports === undefined ||
          preparedObj.expectedRemainingSol === undefined
        ) {
          if (active && publicKey.toBase58() === requestPublicKeyStr) {
            setState("failed");
            setError("Missing required prepared metadata field prior to execution.");
          }
          return;
        }

        if (active && publicKey.toBase58() === requestPublicKeyStr) {
          setPrepared(preparedObj);
          inFlightRef.current = false;
          setState("ready");
        }
      } catch (err: any) {
        if (active && publicKey.toBase58() === requestPublicKeyStr) {
          setState("failed");
          setError(err.message || "Failed to prepare Devnet transaction.");
        }
      }
    }

    preparePipeline();

    return () => {
      active = false;
    };
  }, [open, intent, rawIntent, preparedTransfer, publicKey, connection, solanaNetwork, isDemo, isNativeTransfer]);

  // Helper to determine exact execution blocker string
  const getExecutionBlockerReason = (): string | null => {
    if (isDemo) return null;
    if (!connected) return "Wallet is disconnected. Please reconnect Phantom.";
    if (!publicKey) return "Wallet public key is unavailable.";
    if (typeof sendTransaction !== "function" && typeof signTransaction !== "function") return "Connected wallet does not provide sendTransaction.";
    if (typeof rawIntent !== "string" || !rawIntent.trim()) return "Invalid input: expected string for rawIntent, received undefined";
    if (state !== "ready") return `Pipeline is in ${state} state, not READY.`;
    if (
      !prepared ||
      typeof prepared.lamports !== "bigint" ||
      prepared.lamports <= 0n ||
      typeof prepared.solAmount !== "number" ||
      typeof prepared.estimatedFeeSol !== "number" ||
      typeof prepared.expectedRemainingSol !== "number"
    ) {
      return "Preparation data unavailable.";
    }
    if (inFlightRef.current) return "Transaction request is already in-flight.";
    return null;
  };

  const executionBlocker = getExecutionBlockerReason();
  const canExecute = executionBlocker === null;

  const handleSign = async () => {
    if (inFlightRef.current) {
      setError("Transaction request is already in-flight.");
      return;
    }

    inFlightRef.current = true;
    setError(null);

    try {
      if (isDemo) {
        setState("signing");
        await new Promise((res) => setTimeout(res, 800));
        setState("confirming");
        await new Promise((res) => setTimeout(res, 800));
        try {
          await fetch("http://localhost:5000/api/transfers/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              rawIntent: rawIntent || "Send 0.01 SOL to Demo",
              action: "send",
              token: "SOL",
              network: "devnet",
              sender: publicKey?.toBase58() || "11111111111111111111111111111111",
              recipient: recipientAddress || "11111111111111111111111111111111",
              amount: amountStr,
            }),
          });
        } catch (e) {
          console.error("Demo execution sync failed", e);
        }
        setState("confirmed");
        onSign("demo-signature-success");
        return;
      }

      if (!connected) {
        setState("failed");
        setError("Wallet is disconnected. Please reconnect Phantom.");
        setPrepared(null);
        return;
      }

      if (!publicKey) {
        setState("failed");
        setError("Wallet public key is unavailable.");
        setPrepared(null);
        return;
      }

      if (typeof sendTransaction !== "function" && typeof signTransaction !== "function") {
        setState("failed");
        setError("Connected wallet does not provide transaction execution methods.");
        setPrepared(null);
        return;
      }

      if (state !== "ready") {
        setError(`Transaction pipeline is in ${state} state, not READY.`);
        return;
      }

      if (
        !prepared ||
        typeof prepared.lamports !== "bigint" ||
        prepared.lamports <= 0n ||
        typeof prepared.solAmount !== "number" ||
        typeof prepared.estimatedFeeSol !== "number" ||
        typeof prepared.expectedRemainingSol !== "number"
      ) {
        setState("failed");
        setError("Preparation data unavailable. Cannot proceed with execution.");
        setPrepared(null);
        return;
      }

      // Pre-send Security Check 1: Devnet Cluster check
      const clusterOk = await verifyDevnetCluster(connection);
      if (!clusterOk) {
        setState("failed");
        setError("Phantom must be set to Solana Devnet.");
        setPrepared(null);
        return;
      }

      // Pre-send Security Check 2: Injected Phantom key verification if present
      const injectedSolana = (window as any).solana;
      if (injectedSolana?.publicKey) {
        const injectedKeyStr = injectedSolana.publicKey.toBase58();
        if (injectedKeyStr !== publicKey.toBase58()) {
          setState("failed");
          setError("Injected Phantom wallet account mismatch. Review the transfer again.");
          setPrepared(null);
          return;
        }
      }

      // Pre-send Security Check 3: Check sender consistency
      const senderKey = new PublicKey(prepared.sender);
      const recipientKey = new PublicKey(prepared.recipient);
      const consistencyBeforeSend = verifySenderConsistency({
        connectedPublicKey: publicKey.toBase58(),
        parsedSender: prepared.sender,
        backendProposalSender: prepared.backendProposal?.sender,
        preparedTxSender: prepared.sender,
        instructionSender: prepared.transaction.instructions[0]?.keys[0]?.pubkey?.toBase58(),
      });

      if (!consistencyBeforeSend.valid || !senderKey.equals(publicKey)) {
        setState("failed");
        setError(consistencyBeforeSend.error || "Phantom account changed. Review the transfer again.");
        setPrepared(null);
        return;
      }

      // Requirement 1 & 5: Fetch fresh blockhash & block height immediately before calling Phantom
      setState("preparing");
      let freshBlockhash = "";
      let freshLastValidBlockHeight = 0;
      let currentBlockHeight = 0;

      try {
        const bhInfo = await connection.getLatestBlockhash("confirmed");
        freshBlockhash = bhInfo.blockhash;
        freshLastValidBlockHeight = bhInfo.lastValidBlockHeight;
        currentBlockHeight = await connection.getBlockHeight("confirmed");
      } catch (bhErr: any) {
        setState("failed");
        setError(`Failed to fetch fresh blockhash from Solana Devnet: ${bhErr.message || bhErr}`);
        setPrepared(null);
        return;
      }

      // Rebuild NEW native SOL transaction with fresh blockhash
      const freshTx = buildTransferTransaction(
        senderKey,
        recipientKey,
        prepared.lamports,
        freshBlockhash
      );

      // Requirement 2: Verify fresh rebuilt transaction
      const verifyRes = verifyTransferInstruction(
        freshTx,
        senderKey,
        recipientKey,
        prepared.lamports
      );

      if (!verifyRes.valid) {
        setState("failed");
        setError(`Fresh transaction instruction verification failed: ${verifyRes.error}`);
        setPrepared(null);
        return;
      }

      // Requirement 3: Estimate fee & simulate fresh transaction immediately before invoking Phantom
      setState("simulating");
      const walletBalanceSol = prepared.walletBalanceSol ?? 0;
      const simRes = await estimateFeeAndSimulate(
        connection,
        freshTx,
        walletBalanceSol,
        prepared.lamports
      );

      if (!simRes.simulationPassed) {
        if (import.meta.env.DEV) {
          console.error("[Fresh Transaction RPC Simulation Failed]", {
            preparationTimestamp: prepared.preparationTimestamp,
            currentBlockHeight,
            lastValidBlockHeight: freshLastValidBlockHeight,
            simulationError: simRes.simulationError,
            logs: simRes.logs,
          });
        }
        setState("failed");
        setError(
          `Devnet RPC transaction simulation failed: ${simRes.simulationError || "RPC simulation rejected."}${
            simRes.logs && simRes.logs.length ? ` Logs: ${simRes.logs.join(" | ")}` : ""
          }`
        );
        setPrepared(null);
        return;
      }

      // Requirement 4: Call wallet-adapter sendTransaction with freshly rebuilt Transaction object
      setState("signing");

      const debugContext = {
        preparationTimestamp: prepared.preparationTimestamp,
        currentBlockHeight,
        preparedBlockhash: freshBlockhash,
        lastValidBlockHeight: freshLastValidBlockHeight,
        rpcEndpoint: connection.rpcEndpoint,
        simulationLogs: simRes.logs,
        simulationError: simRes.simulationError,
        hasSignature: false,
      };

      let signature: string;
      try {
        if (typeof sendTransaction === "function") {
          signature = await sendTransaction(freshTx, connection, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
          });
        } else if (typeof signTransaction === "function") {
          const signedTx = await signTransaction(freshTx);
          const rawBytes = signedTx.serialize();
          signature = await connection.sendRawTransaction(rawBytes, {
            skipPreflight: false,
            preflightCommitment: "confirmed",
            maxRetries: 3,
          });
        } else {
          throw new Error("No wallet transaction execution mechanism available.");
        }
        setTxSignature(signature);
        debugContext.hasSignature = true;
      } catch (err: any) {
        console.warn("Wallet sendTransaction error:", err);
        const classified = classifyWalletError(err, debugContext);
        setState(classified.type);
        setError(classified.message);
        setPrepared(null);
        return;
      }

      // Step 4: Confirm Transaction on-chain using fresh blockhash & lastValidBlockHeight
      setState("confirming");
      try {
        const confirmRes = await connection.confirmTransaction(
          {
            signature,
            blockhash: freshBlockhash,
            lastValidBlockHeight: freshLastValidBlockHeight,
          },
          "confirmed"
        );

        if (confirmRes.value.err) {
          setState("failed");
          setError(`Solana RPC transaction failed: ${JSON.stringify(confirmRes.value.err)}`);
          setPrepared(null);
          return;
        }

        try {
          await agentApi.submitTransactionResult(intent?.id || "devnet-transfer", signature, "confirmed");
        } catch (e) {
          console.warn("Backend result record skipped:", e);
        }

        setState("confirmed");
        onSign(signature);
      } catch (confirmErr: any) {
        console.warn("confirmTransaction exception, querying signature status fallback:", confirmErr);
        try {
          const statuses = await connection.getSignatureStatuses([signature]);
          const status = statuses.value[0];

          if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) {
            if (status.err) {
              setState("failed");
              setError(`Transaction confirmed on-chain with error: ${JSON.stringify(status.err)}`);
              setPrepared(null);
            } else {
              setState("confirmed");
              onSign(signature);
            }
          } else if (status && status.confirmationStatus === "processed") {
            setState("pending");
            setError(`Transaction pending confirmation on Devnet (Signature: ${signature}). Check Solana Explorer.`);
          } else {
            setState("pending");
            setError(`Confirmation unconfirmed. Signature: ${signature}. Please verify on Solana Explorer.`);
          }
        } catch (statusErr: any) {
          setState("pending");
          setError(`Confirmation status lookup error. Signature: ${signature}. Check Solana Explorer.`);
        }
      }
    } finally {
      inFlightRef.current = false;
    }
  };

  const getButtonText = () => {
    if (state === "signing") return "Opening Phantom…";
    if (state === "broadcasting" || state === "confirming") return "Confirming on Solana Devnet";
    if (state === "confirmed") return "Transfer Confirmed";
    if (state === "pending") return "Confirmation Pending";
    if (state === "rejected") return "Transaction Cancelled";
    if (state === "failed") return "Execution Failed";
    if (state === "expired") return "Preview Expired";
    return "Confirm & Send in Phantom";
  };

  if (!intent) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !isProcessing && onOpenChange(v)}>
      <DialogContent className="glass-card sm:max-w-2xl border-primary/20">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary mb-1">
            <ShieldCheck className="w-5 h-5" />
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">
              Solana Devnet Transfer Review
            </span>
          </div>
          <DialogTitle className="text-xl font-bold font-mono">
            {intent.label}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground font-mono">
            {intent.explanation}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Environment Safety Banner */}
          <div className="flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs font-mono text-warning">
            <Lock className="w-4 h-4 shrink-0" />
            <span>SOLANA DEVNET — TEST ONLY · Devnet SOL has no real monetary value.</span>
          </div>

          {/* Detailed Review Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-muted-foreground font-semibold uppercase text-xs">Action</span>
              <span className="font-bold font-mono text-primary">Native SOL Transfer</span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-muted-foreground font-semibold uppercase text-xs">Sender (You)</span>
              <span className="font-mono text-xs text-foreground break-all max-w-[320px] text-right">
                {publicKey ? publicKey.toBase58() : "Not Connected"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-muted-foreground font-semibold uppercase text-xs">Recipient</span>
              <span className="font-mono text-xs text-primary font-bold break-all max-w-[320px] text-right">
                {prepared ? prepared.recipient : recipientAddress || "Unspecified"}
              </span>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-muted-foreground font-semibold uppercase text-xs">Transfer Amount</span>
              <div className="text-right">
                <span className="font-mono font-bold text-foreground block">
                  {prepared?.solAmount !== undefined ? `${formatSol(prepared.solAmount)} SOL` : `${amountStr} SOL`}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatLamports(prepared?.lamports)} lamports
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
              <span className="text-muted-foreground font-semibold uppercase text-xs">Estimated Network Fee</span>
              <div className="text-right">
                <span className="font-mono font-bold text-warning block">
                  {formatSol(prepared?.estimatedFeeSol)} SOL
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatLamports(prepared?.estimatedFeeLamports)} lamports
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm pt-1">
              <span className="text-muted-foreground font-semibold uppercase text-xs">Expected Balance After</span>
              <span className="font-mono text-xs font-bold text-foreground">
                {prepared?.expectedRemainingSol !== undefined ? `${formatSol(prepared.expectedRemainingSol)} SOL` : "Not available"}
              </span>
            </div>
          </div>

          {/* Pipeline Verification Status */}
          <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-2 font-mono">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
              <span className="text-muted-foreground">Pipeline State</span>
              <span className="font-mono font-bold text-primary">{state.toUpperCase()}</span>
            </div>

            {state === "ready" && prepared?.simulation.simulationPassed && (
              <div className="flex items-center gap-1.5 text-xs text-success font-medium pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Backend validated & RPC simulated cleanly. Ready for Phantom confirmation.</span>
              </div>
            )}

            {(state === "confirmed" || state === "pending") && txSignature && (
              <div className="space-y-2 text-xs pt-1 border-t border-white/5">
                <div className="flex items-center gap-1.5 text-success font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{state === "confirmed" ? "Transfer Confirmed on Solana Devnet" : "Confirmation Pending on Solana Devnet"}</span>
                </div>
                <div className="font-mono text-[11px] text-muted-foreground break-all bg-black/30 p-2 rounded">
                  Signature: {txSignature}
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline text-xs"
                >
                  View on Solana Explorer <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-1.5 text-xs text-destructive font-mono bg-destructive/10 p-2.5 rounded-lg border border-destructive/20 break-all">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Reject
            </Button>
            <Button
              className="gap-2 bg-gradient-primary text-white hover:opacity-90 min-w-[240px]"
              onClick={() => void handleSign()}
              disabled={!canExecute}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {getButtonText()}…
                </>
              ) : (
                getButtonText()
              )}
            </Button>
          </div>
          {!canExecute && executionBlocker && state !== "confirmed" && (
            <div className="text-[11px] font-mono text-amber-400/90 text-right">
              {executionBlocker}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
