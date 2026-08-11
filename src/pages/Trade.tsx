import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { NativeTransferReviewCard, type ValidationSummary } from "@/components/intent/NativeTransferReviewCard";
import { ApprovalDialog } from "@/components/intent/ApprovalDialog";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { StatusOverlay } from "@/components/intent/StatusOverlay";
import { DemoSuccessModal } from "@/components/demo/DemoSuccessModal";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, ShieldCheck, Wallet, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { useSolBalance } from "@/hooks/useSolBalance";
import { useTransactions } from "@/hooks/useTransactions";
import { parseIntent, extractTransferDetails, type ParsedIntent } from "@/lib/intentParser";
import { Link } from "react-router-dom";
import { useAgentStore } from "@/store/useAgentStore";
import { simulateIntentInDemo } from "@/services/demoAgentEngine";
import {
  validateAndParseAmount,
  validateRecipient,
  buildTransferTransaction,
  verifyTransferInstruction,
  estimateFeeAndSimulate,
  verifyDevnetCluster,
  type PreparedTransfer,
} from "@/lib/solanaTransferService";
import { verifySenderConsistency } from "@/lib/senderConsistency";
import { agentApi } from "@/services/agentApi";

const PLACEHOLDER = "Send 0.01 SOL to 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

const EXAMPLE_INTENTS = [
  "Send 0.01 SOL to 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "Send 0.005 SOL to 26k7v156xed111111111111111111111111111111111",
  "Send 0.02 SOL to 9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
];

export default function Trade() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const { setVisible } = useWalletModal();
  const { balance, loading: balanceLoading } = useSolBalance();
  const { addTransaction } = useTransactions();

  const [intent, setIntent] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedIntent | null>(null);
  const [prepared, setPrepared] = useState<PreparedTransfer | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [demoSuccessOpen, setDemoSuccessOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);

  const [validation, setValidation] = useState<ValidationSummary>({
    backendValid: false,
    clusterValid: false,
    recipientValid: false,
    onCurveValid: false,
    selfTransferValid: false,
    capValid: false,
    senderMatchValid: false,
    balanceValid: false,
  });

  const connectionStatus = useAgentStore((s) => s.connectionStatus);
  const isDemo = connectionStatus === "demo";

  // Requirement 1: Clear all state immediately when publicKey changes or wallet disconnects
  useEffect(() => {
    setIntent("");
    setParsed(null);
    setPrepared(null);
    setParseError(null);
    setReviewOpen(false);
    setStatusOpen(false);
    setShowSuccess(false);
    setTxSignature(null);
    setValidation({
      backendValid: false,
      clusterValid: false,
      recipientValid: false,
      onCurveValid: false,
      selfTransferValid: false,
      capValid: false,
      senderMatchValid: false,
      balanceValid: false,
    });
  }, [publicKey]);

  const handleParse = async () => {
    if (parsing) return;
    if (!connected && !isDemo) {
      setVisible(true);
      return;
    }

    setParsed(null);
    setPrepared(null);
    setParseError(null);
    setParsing(true);
    const text = intent.trim();
    const requestKeyStr = publicKey?.toBase58();

    try {
      if (isDemo) {
        simulateIntentInDemo("demo-intent", text);
      }

      // Check strict transfer details extraction first
      const details = extractTransferDetails(text);
      if (!details) {
        setParseError("Invalid native SOL transfer intent format. Expected: Send <amount> SOL to <recipient-public-key>");
        setParsing(false);
        return;
      }

      const result = await parseIntent(text, {
        walletBalance: balance ?? 0,
        senderPublicKey: requestKeyStr,
        preferredSlippage: 0.5,
        riskTolerance: "medium",
      });

      // Requirement 3: Stale async response check
      if (publicKey?.toBase58() !== requestKeyStr) {
        return;
      }

      setParsed(result);

      // Run Section B & C validations for native SOL transfer
      if (connected && publicKey) {
        setSimulating(true);
        const recipientStr = (result.target as any)?.recipient || "";
        const amountStr = String(result.source.amount || "0");

        // 1. Local checks
        const parsedAmount = validateAndParseAmount(amountStr);
        const parsedRecipient = validateRecipient(recipientStr, publicKey.toBase58());
        const clusterOk = await verifyDevnetCluster(connection);
        const senderMatchOk = verifySenderConsistency({
          connectedPublicKey: publicKey.toBase58(),
          parsedSender: publicKey.toBase58(),
        }).valid;

        // 2. Backend validation call with offline handling
        let backendValid = false;
        let backendErrorStr: string | undefined = undefined;
        let backendProposal: any = null;

        try {
          const valRes = await agentApi.validateTransfer({
            rawIntent: text,
            action: "send",
            token: "SOL",
            network: "devnet",
            sender: publicKey.toBase58(),
            recipient: parsedRecipient.publicKey?.toBase58() || recipientStr,
            amount: amountStr,
          });

          if (valRes?.valid) {
            // Frontend & Backend Normalized Comparison
            const feLamports = parsedAmount.lamports.toString();
            const beLamports = valRes.lamports;
            const feRecipient = parsedRecipient.publicKey?.toBase58().toLowerCase();
            const beRecipient = valRes.recipient.toLowerCase();
            const feSender = publicKey.toBase58().toLowerCase();
            const beSender = valRes.sender.toLowerCase();

            if (
              valRes.action === "send" &&
              valRes.token === "SOL" &&
              valRes.network === "devnet" &&
              valRes.amount === amountStr &&
              beLamports === feLamports &&
              beRecipient === feRecipient &&
              beSender === feSender
            ) {
              backendValid = true;
              backendProposal = valRes;
            } else {
              backendValid = false;
              backendErrorStr = "Frontend and backend normalized proposal mismatch.";
            }
          } else {
            backendValid = false;
            backendErrorStr = valRes?.error || "Backend transfer validation rejected.";
          }
        } catch {
          backendValid = false;
          backendErrorStr = "Backend validation unavailable";
        }

        const requiredSol = parsedAmount.solAmount + 0.000005;
        const balanceValid = (balance ?? 0) >= requiredSol;

        const valSummary: ValidationSummary = {
          backendValid,
          backendError: backendErrorStr,
          clusterValid: clusterOk,
          recipientValid: parsedRecipient.valid,
          onCurveValid: parsedRecipient.valid,
          selfTransferValid: parsedRecipient.error !== "Self-transfer is not permitted.",
          capValid: parsedAmount.valid,
          senderMatchValid: senderMatchOk,
          balanceValid,
          error: parsedAmount.error || parsedRecipient.error || backendErrorStr,
        };
        setValidation(valSummary);

        // Fail-Closed Check: Do NOT build transaction or estimate fee or simulate if validation failed
        if (
          backendValid &&
          clusterOk &&
          parsedRecipient.valid &&
          parsedRecipient.publicKey &&
          parsedAmount.valid &&
          senderMatchOk &&
          balanceValid
        ) {
          try {
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
            const tx = buildTransferTransaction(
              publicKey,
              parsedRecipient.publicKey,
              parsedAmount.lamports,
              blockhash
            );

            const simRes = await estimateFeeAndSimulate(
              connection,
              tx,
              balance ?? 0,
              parsedAmount.lamports
            );

            if (simRes.simulationPassed && publicKey.toBase58() === requestKeyStr) {
              const walletBalanceSol = balance ?? 0;
              const walletBalanceLamports = BigInt(Math.floor(walletBalanceSol * 1e9));
              const totalRequiredLamports = parsedAmount.lamports + simRes.feeLamports;
              const expectedRemainingLamports = walletBalanceLamports >= totalRequiredLamports
                ? walletBalanceLamports - totalRequiredLamports
                : 0n;
              const expectedRemainingSol = Number(expectedRemainingLamports) / 1e9;

              setPrepared({
                transaction: tx,
                preparedMessageBytes: tx.serializeMessage(),
                blockhash,
                lastValidBlockHeight,
                sender: publicKey.toBase58(),
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
              });
            }
          } catch (e) {
            console.warn("Preparation error:", e);
          }
        } else {
          setPrepared(null);
        }
        setSimulating(false);
      }
    } catch (error: any) {
      console.error("Failed to parse intent:", error);
      setParseError(error.message || "Failed to parse transfer intent.");
    } finally {
      setParsing(false);
    }
  };

  const handleSign = (signature?: string) => {
    setReviewOpen(false);
    if (signature) {
      setTxSignature(signature);
    }
    if (signature === "demo-signature-success") {
      setDemoSuccessOpen(true);
    } else {
      setStatusOpen(true);
    }
  };

  const handleStatusClose = () => {
    setStatusOpen(false);
    setShowSuccess(true);

    if (parsed && txSignature) {
      addTransaction({
        signature: txSignature,
        type: parsed.action,
        status: "confirmed",
        fromToken: parsed.source.token,
        fromAmount: parsed.source.amount,
        toToken: parsed.target.token,
        toAmount: parsed.simulation.outAmount,
        usdValue: parsed.simulation.inUsd,
        timestamp: Date.now(),
        intent: intent,
        riskLevel: parsed.risk.level,
        route: parsed.simulation.route,
        networkFee: parsed.simulation.networkFeeSol,
      });
    }
  };

  const reset = () => {
    setIntent("");
    setParsed(null);
    setPrepared(null);
    setShowSuccess(false);
    setTxSignature(null);
    useAgentStore.getState().resetAgents();
  };

  const getMissingFieldReason = (): string | null => {
    if (isDemo) return null;
    if (!connected) return "Wallet is disconnected";
    if (!publicKey) return "Wallet public key unavailable";
    if (!intent.trim()) return "Raw intent text is missing or empty";
    if (!parsed) return "Intent validation incomplete";
    if (!validation.backendValid) return validation.backendError || "Backend transfer validation failed";
    if (!validation.clusterValid) return "Solana Devnet cluster check failed";
    if (!validation.recipientValid) return "Recipient address invalid";
    if (!validation.selfTransferValid) return "Self-transfer is not permitted";
    if (!validation.senderMatchValid) return "Sender account mismatch";
    if (!validation.balanceValid) return "Insufficient Devnet SOL balance";
    if (!prepared) return "Transaction preparation incomplete";
    if (!prepared.lamports || prepared.lamports <= 0n) return "Invalid transaction lamports";
    if (simulating) return "RPC simulation in progress";
    return null;
  };

  const missingFieldReason = getMissingFieldReason();
  const canReview = missingFieldReason === null;

  // Wizard active step calculation
  const currentStep = showSuccess
    ? 6
    : reviewOpen || statusOpen
    ? 5
    : prepared
    ? 4
    : simulating
    ? 3
    : parsing
    ? 2
    : 1;

  const steps = [
    { num: 1, label: "Enter Intent" },
    { num: 2, label: "Validate" },
    { num: 3, label: "Simulate" },
    { num: 4, label: "Review" },
    { num: 5, label: "Approve" },
    { num: 6, label: "Confirmed" },
  ];

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="ghost" size="icon" className="shrink-0 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-semibold">Devnet Transfer Agent</h1>
            <p className="text-sm text-muted-foreground">
              6-step verified SOL transfer pipeline on Solana Devnet
            </p>
          </div>
        </div>
        {connected && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
            <span className="h-1.5 w-1.5 rounded-full bg-teal animate-pulse" />
            <span>Balance:</span>
            <span className="text-foreground font-bold">
              {balanceLoading
                ? "Loading..."
                : balance !== null
                ? `${balance.toFixed(4)} SOL`
                : "0.0000 SOL"}
            </span>
          </div>
        )}
      </div>

      {/* 6-Step Wizard Progress Bar */}
      <div className="glass-panel border border-white/10 rounded-2xl p-4">
        <div className="grid grid-cols-6 gap-2">
          {steps.map((s) => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center text-center space-y-1.5">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all ${
                    isDone
                      ? "bg-teal text-black"
                      : isCurrent
                      ? "bg-primary text-white ring-4 ring-primary/20"
                      : "bg-white/5 text-muted-foreground border border-white/10"
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5" /> : s.num}
                </div>
                <span
                  className={`text-[10px] sm:text-xs font-mono truncate max-w-full ${
                    isCurrent ? "text-primary font-bold" : isDone ? "text-teal" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mx-auto max-w-4xl">
        {/* Success State */}
        {showSuccess ? (
          <div className="glass-card rounded-3xl p-8 text-center animate-fade-in border border-teal/30 bg-teal/5 space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal/20 text-teal">
              <Check className="h-8 w-8" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Transfer Successful</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your Devnet SOL transaction has been confirmed on the Solana blockchain.
            </p>
            {txSignature && (
              <div className="bg-black/30 border border-white/10 p-3 rounded-xl max-w-lg mx-auto font-mono text-xs text-muted-foreground break-all">
                <span className="text-[10px] uppercase text-muted-foreground block mb-1 font-semibold">Transaction Signature</span>
                <span className="text-teal font-bold">{txSignature}</span>
              </div>
            )}
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              {txSignature && (
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="outline" className="gap-2 border-teal/30 text-teal hover:bg-teal/10 rounded-xl h-11">
                    View on Solana Explorer
                  </Button>
                </a>
              )}
              <Link to="/transactions">
                <Button variant="outline" className="rounded-xl h-11">
                  Go to Transaction History
                </Button>
              </Link>
              <Button onClick={reset} className="bg-gradient-primary text-white hover:opacity-90 rounded-xl h-11">
                New Transfer
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Intent Input */}
            <div className="glass-card rounded-2xl p-3 transition-all focus-within:border-primary/50 focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]">
              <Textarea
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                placeholder={PLACEHOLDER}
                className="min-h-[120px] resize-none border-0 bg-transparent text-base leading-relaxed shadow-none placeholder:text-muted-foreground/70 focus-visible:ring-0 md:text-lg"
              />
              <div className="flex flex-col items-stretch gap-2 border-t border-border/60 px-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-teal" />
                  Enter a supported Devnet SOL transfer intent.
                </div>
                <Button
                  size="lg"
                  onClick={handleParse}
                  disabled={parsing || !intent.trim()}
                  className="gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90 glow-primary disabled:opacity-70"
                >
                  {parsing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Validating Intent…</>
                  ) : (!connected && !isDemo) ? (
                    <><Wallet className="h-4 w-4" /> Connect Wallet to Transfer</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Parse Transfer Intent</>
                  )}
                </Button>
              </div>
            </div>

            {/* Parse Error Display */}
            {parseError && (
              <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-mono text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Example Chips */}
            {!parsed && !parsing && (
              <div className="mt-4">
                <p className="mb-2 text-xs text-muted-foreground font-semibold">Try these Devnet transfer examples:</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_INTENTS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setIntent(s)}
                      className="rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground font-mono"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Analyzing State */}
            {parsing && (
              <div className="mt-8 animate-fade-in">
                <div className="glass-card flex items-center gap-3 rounded-xl px-4 py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Validating Devnet SOL transfer intent…</div>
                    <div className="text-xs text-muted-foreground">
                      Checking recipient address · validating 0.05 SOL limit · verifying RPC blockhash
                    </div>
                  </div>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal" />
                </div>
              </div>
            )}

            {/* Section A, Section B, Section C Truthful Native Transfer Review */}
            {parsed && !parsing && (
              <div className="mt-8 space-y-6">
                <NativeTransferReviewCard
                  intent={parsed}
                  walletPublicKey={publicKey ? publicKey.toBase58() : null}
                  balance={balance}
                  prepared={prepared}
                  validation={validation}
                  simulating={simulating}
                />

                <div className="flex flex-col items-center gap-3">
                  <Button
                    size="lg"
                    disabled={!canReview}
                    onClick={() => {
                      if (!intent.trim()) return;
                      setReviewOpen(true);
                    }}
                    className="h-14 w-full max-w-md gap-2 bg-gradient-primary text-base font-semibold text-primary-foreground hover:opacity-90 glow-primary animate-pulse-glow disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {missingFieldReason || "Review & Approve"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Review full transfer details in Phantom before signing.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ErrorBoundary fallbackTitle="Approval Dialog Render Error" onReset={() => setReviewOpen(false)}>
        <ApprovalDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          onSign={handleSign}
          intent={parsed}
          rawIntent={intent.trim()}
          preparedTransfer={prepared}
        />
      </ErrorBoundary>
      <StatusOverlay open={statusOpen} onClose={handleStatusClose} signature={txSignature} />
      <DemoSuccessModal
        open={demoSuccessOpen}
        onOpenChange={(open) => {
          setDemoSuccessOpen(open);
          if (!open) handleStatusClose();
        }}
      />
    </div>
  );
}
