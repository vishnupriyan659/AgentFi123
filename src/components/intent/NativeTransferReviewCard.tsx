import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, CheckCircle2, XCircle, Loader2, ArrowRight, AlertTriangle, ChevronDown, Info } from "lucide-react";
import type { PreparedTransfer } from "@/lib/solanaTransferService";
import type { ParsedIntent } from "@/lib/intentParser";

export interface ValidationSummary {
  backendValid: boolean;
  backendError?: string;
  clusterValid: boolean;
  recipientValid: boolean;
  onCurveValid: boolean;
  selfTransferValid: boolean;
  capValid: boolean;
  senderMatchValid: boolean;
  balanceValid: boolean;
  error?: string;
}

interface Props {
  intent: ParsedIntent;
  walletPublicKey: string | null;
  balance: number | null;
  prepared: PreparedTransfer | null;
  validation: ValidationSummary;
  simulating: boolean;
}

export function NativeTransferReviewCard({
  intent,
  walletPublicKey,
  balance,
  prepared,
  validation,
  simulating,
}: Props) {
  const recipientStr = prepared?.recipient || (intent.target as any)?.recipient || intent.target?.token || "";
  const solAmount = prepared ? prepared.solAmount : intent.source.amount;
  const lamportsStr = prepared ? prepared.lamports.toString() : (BigInt(Math.floor(solAmount * 1e9))).toString();

  const estFee = prepared ? prepared.estimatedFeeSol : 0.000005;
  const remBal = prepared
    ? prepared.expectedRemainingSol
    : Math.max(0, (balance ?? 0) - solAmount - estFee);

  const isValidationFailed =
    !validation.backendValid ||
    !validation.recipientValid ||
    !validation.clusterValid ||
    !validation.senderMatchValid ||
    !validation.capValid;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Devnet Warning Banner */}
      <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning font-mono">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Solana Devnet Transfer — Test network funds only. Maximum hackathon cap: 0.05 SOL.</span>
      </div>

      {/* Main Transfer Summary Card (Always Visible) */}
      <Card className="glass-card border-primary/30">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex justify-between items-center">
            <CardTitle className="font-display text-base text-primary flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-primary" /> Transfer Summary
            </CardTitle>
            <span className="text-xs font-mono bg-primary/10 text-primary px-2.5 py-1 rounded-full border border-primary/20 font-semibold">
              Devnet SOL
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 pb-3 border-b border-white/5">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-0.5">Transfer Amount</span>
              <span className="font-mono text-xl font-bold text-foreground">{solAmount.toFixed(6)} SOL</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-0.5">Recipient</span>
              <span className="font-mono text-xs font-bold text-primary truncate block" title={recipientStr}>
                {recipientStr ? `${recipientStr.slice(0, 8)}...${recipientStr.slice(-8)}` : "Unspecified"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-0.5">Estimated Network Fee</span>
              <span className="font-mono text-xs font-bold text-warning">{estFee.toFixed(6)} SOL</span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-0.5">Expected Balance After</span>
              <span className="font-mono text-xs font-bold text-teal">{remBal.toFixed(6)} SOL</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compact Validation Checklist */}
      <Card className="glass-card border-white/10">
        <CardHeader className="pb-3 border-b border-white/5">
          <CardTitle className="font-display text-sm text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal" /> Validation Checklist
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
            <span>Backend Zod Schema</span>
            {validation.backendValid ? (
              <span className="text-success font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Passed</span>
            ) : (
              <span className="text-destructive font-semibold flex items-center gap-1 font-mono"><XCircle className="w-3.5 h-3.5" /> Failed</span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
            <span>Devnet Genesis Hash</span>
            {validation.clusterValid ? (
              <span className="text-success font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>
            ) : (
              <span className="text-destructive font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Failed</span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
            <span>Recipient On-Curve</span>
            {validation.recipientValid && validation.onCurveValid ? (
              <span className="text-success font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Valid</span>
            ) : (
              <span className="text-destructive font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Invalid</span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
            <span>Self-Transfer Guard</span>
            {validation.selfTransferValid ? (
              <span className="text-success font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Passed</span>
            ) : (
              <span className="text-destructive font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Rejected</span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
            <span>0.05 SOL Test Cap</span>
            {validation.capValid ? (
              <span className="text-success font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Passed</span>
            ) : (
              <span className="text-destructive font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Exceeded</span>
            )}
          </div>

          <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5">
            <span>Balance Verification</span>
            {validation.balanceValid ? (
              <span className="text-success font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Sufficient</span>
            ) : (
              <span className="text-destructive font-semibold flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Insufficient</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Expandable Technical Verification Details */}
      <details className="glass-card border border-white/10 rounded-2xl overflow-hidden group">
        <summary className="p-4 cursor-pointer flex items-center justify-between font-display text-sm font-semibold text-muted-foreground hover:text-foreground select-none">
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> Technical Verification Details
          </span>
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="p-4 border-t border-white/5 space-y-3 text-xs">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Full Sender Public Key</span>
            <span className="font-mono text-xs text-foreground break-all bg-black/30 p-2 rounded block border border-white/5">
              {walletPublicKey || "Not Connected"}
            </span>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Full Recipient Public Key</span>
            <span className="font-mono text-xs text-primary font-bold break-all bg-black/30 p-2 rounded block border border-white/5">
              {recipientStr || "Unspecified"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Exact Lamports</span>
              <span className="font-mono text-xs text-foreground bg-black/30 p-2 rounded block border border-white/5">
                {lamportsStr} lamports
              </span>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">Recent Blockhash</span>
              <span className="font-mono text-xs text-foreground bg-black/30 p-2 rounded block border border-white/5 truncate">
                {prepared?.blockhash || "Pending fetching"}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold block mb-1">RPC Pre-Send Simulation Status</span>
            <div className="font-mono text-xs bg-black/30 p-2.5 rounded border border-white/5">
              {simulating ? (
                <span className="text-warning flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Simulating on Solana Devnet RPC...</span>
              ) : prepared ? (
                <span className="text-success flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Simulation Passed — Fee: {prepared.estimatedFeeSol.toFixed(6)} SOL ({prepared.estimatedFeeLamports.toString()} lamports)</span>
              ) : (
                <span className="text-destructive flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {validation.error || "Simulation pending validation requirements"}</span>
              )}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
