import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, RefreshCw, Sparkles, ShieldAlert, Clock, Wallet, ShieldCheck, HelpCircle } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

interface CopilotEvidence {
  walletConnected: boolean;
  solBalance: number | null;
  network: "devnet";
  transactionCount: number | null;
  priceReference: number | null;
}

interface CopilotResponseContract {
  answer: string;
  mode: "ai" | "rule-based";
  providerAvailable: boolean;
  evidence: CopilotEvidence;
  generatedAt: string;
}

function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/$/, "");
  }
  return "http://localhost:5000/api";
}

export function CopilotPageContent() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { snapshot } = useLiveSnapshot();

  const [question, setQuestion] = useState("");
  const [activeQuestion, setActiveQuestion] = useState("");
  const [response, setResponse] = useState<CopilotResponseContract | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isWalletConnected = Boolean(connected && publicKey);

  const sampleQuestions = [
    "How do I send 0.01 Devnet SOL?",
    "Explain my current wallet balance.",
    "Why is my risk score high?",
    "Explain my recent Devnet transactions.",
    "What can I safely test on Devnet?",
  ];

  const handleAsk = async (qText: string) => {
    const trimmed = qText.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setActiveQuestion(trimmed);

    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/copilot/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          walletAddress: isWalletConnected && publicKey ? publicKey.toBase58() : null,
          snapshot,
        }),
      });

      if (!res.ok) {
        throw new Error(`Copilot service error (${res.status})`);
      }

      const data: CopilotResponseContract = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err?.message || "AI provider or backend service unavailable");
      setResponse(null);
      // NOTE: We retain `question` input state so user does not lose their typed question
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">AI Financial Copilot</h1>
            <Badge
              variant="outline"
              className={`font-mono font-bold text-xs uppercase ${
                response?.mode === "ai"
                  ? "border-teal/30 bg-teal/10 text-teal"
                  : "border-warning/30 bg-warning/10 text-warning"
              }`}
            >
              {response?.mode === "ai"
                ? "AI-GENERATED (BACKEND LLM)"
                : "RULE-BASED RESPONSE — AI PROVIDER UNAVAILABLE"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Grounded financial assistant providing question-specific analysis backed by Solana Devnet telemetry.
          </p>
        </div>
      </div>

      {/* Disconnected Notice */}
      {!isWalletConnected && (
        <Card className="glass-card border-warning/30 bg-warning/10 font-mono text-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-warning" />
              <span>Connect Phantom wallet to include live Devnet balances in Copilot responses.</span>
            </div>
            <Button size="sm" onClick={() => setVisible(true)} className="bg-primary text-xs h-8 px-3">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Suggested Questions Grid */}
      <div className="space-y-2 font-mono text-xs">
        <span className="text-muted-foreground uppercase tracking-wider text-[11px] block font-semibold flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-primary" />
          Suggested Questions
        </span>
        <div className="flex flex-wrap gap-2">
          {sampleQuestions.map((q, i) => (
            <button
              key={i}
              disabled={loading}
              onClick={() => {
                setQuestion(q);
                handleAsk(q);
              }}
              className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-primary/30 text-foreground transition-all text-xs font-mono disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Question Input Box */}
      <Card className="glass-card border-white/10">
        <CardContent className="p-4 flex gap-3">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) handleAsk(question);
            }}
            placeholder="Ask Copilot about your Devnet wallet, SOL transfers, or risk metrics..."
            className="bg-black/40 border-white/10 font-mono text-sm h-11"
          />
          <Button
            onClick={() => handleAsk(question)}
            disabled={loading || !question.trim()}
            className="gap-2 bg-gradient-primary hover:opacity-90 font-mono text-xs h-11 px-6 rounded-xl shrink-0"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> Thinking…
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> Ask Copilot
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error / Service Offline State */}
      {error && (
        <Card className="glass-card border-destructive/30 bg-destructive/10 font-mono text-xs">
          <CardContent className="p-6 text-center space-y-3">
            <ShieldAlert className="w-8 h-8 text-destructive mx-auto" />
            <h3 className="font-mono font-bold text-destructive text-base">Copilot Service Error</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button size="sm" onClick={() => handleAsk(question)} className="mt-2 text-xs font-mono">
              Retry Query
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Grounded Question-Specific Response Container */}
      {response && (
        <Card className="glass-card border-teal/20 bg-teal/5 font-mono text-xs space-y-4">
          <CardHeader className="pb-2 border-b border-teal/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal" />
              <div>
                <CardTitle className="font-display text-base text-foreground">
                  Analysis for: "{activeQuestion}"
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Mode: <strong className="text-foreground uppercase">{response.mode}</strong> | Provider Available: <strong className={response.providerAvailable ? "text-teal" : "text-warning"}>{String(response.providerAvailable)}</strong>
                </CardDescription>
              </div>
            </div>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" /> {new Date(response.generatedAt).toLocaleTimeString()}
            </span>
          </CardHeader>

          <CardContent className="space-y-5 pt-2">
            {/* Prominent Answer Section */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-wider text-teal block font-bold">
                Question-Specific Answer
              </span>
              <div className="p-4 rounded-xl bg-black/60 border border-teal/30 text-sm text-foreground leading-relaxed whitespace-pre-line font-mono">
                {response.answer}
              </div>
            </div>

            {/* Supporting Evidence Breakdown */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                Supporting Devnet Telemetry Evidence
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Wallet Connection</span>
                  <span className="font-bold text-foreground">
                    {response.evidence.walletConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Devnet SOL Balance</span>
                  <span className="font-bold text-teal">
                    {response.evidence.solBalance !== null ? `${response.evidence.solBalance.toFixed(4)} SOL` : "Unavailable"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Confirmed Signatures</span>
                  <span className="font-bold text-foreground">
                    {response.evidence.transactionCount !== null ? `${response.evidence.transactionCount} Signatures` : "0"}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-0.5">
                  <span className="text-[10px] text-muted-foreground block uppercase font-bold">Spot Price Reference</span>
                  <span className="font-bold text-foreground">
                    {response.evidence.priceReference !== null ? `$${response.evidence.priceReference.toFixed(2)} USD` : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Limitations Notice */}
            <div className="p-3 rounded-xl border border-white/10 bg-white/5 text-[11px] text-muted-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 text-teal" />
              <span>Devnet test funds have no real monetary value. Answers are educational and grounded in live telemetry.</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function CopilotPage() {
  return (
    <ErrorBoundary fallbackTitle="Copilot Page Error">
      <CopilotPageContent />
    </ErrorBoundary>
  );
}
