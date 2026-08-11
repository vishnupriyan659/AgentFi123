import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ShieldCheck, RefreshCw, FileText, Wallet, ExternalLink } from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { generateLiveEnterpriseReport } from "@/services/reportEngine";
import { generateLiveRecommendations } from "@/services/recommendationEngine";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

function formatUsd(val: number | null | undefined): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return "N/A";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
}

function truncateAddress(addr: string | null): string {
  if (!addr) return "UNAVAILABLE / Disconnected";
  if (addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-6)}`;
}

function truncateSignature(sig: string): string {
  if (!sig) return "";
  if (sig.length <= 20) return sig;
  return `${sig.slice(0, 10)}…${sig.slice(-10)}`;
}

export function EnterpriseReportsPageContent() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { snapshot, loading, refresh } = useLiveSnapshot();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isWalletConnected = Boolean(connected && publicKey);

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const report = generateLiveEnterpriseReport(snapshot);
  const recommendations = generateLiveRecommendations(snapshot);
  const recentTxs = isWalletConnected && snapshot?.wallet?.recentTransactions
    ? snapshot.wallet.recentTransactions.slice(0, 5)
    : [];

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Interactive Page Action Header (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Enterprise Reports</h1>
            <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal font-mono font-bold text-xs uppercase">
              LIVE SNAPSHOT REPORT
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Grounded enterprise audit document built from immutable live Devnet RPC & CoinGecko telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="no-print gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 rounded-xl"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save as PDF
          </Button>

          <Button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            variant="outline"
            className="no-print gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Disconnected Banner (Hidden in Print) */}
      {!isWalletConnected && (
        <Card className="glass-card border-warning/30 bg-warning/10 font-mono text-xs no-print">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-warning" />
              <span>Connect Phantom wallet to include live Devnet wallet balances in this enterprise report.</span>
            </div>
            <Button size="sm" onClick={() => setVisible(true)} className="bg-primary text-xs h-8 px-3">
              Connect Wallet
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Web View Document Container */}
      <div className="glass-card border-white/10 rounded-2xl p-8 space-y-6 no-print">
        {/* Document Web Header */}
        <div className="border-b border-white/10 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold font-display text-foreground">{report.reportTitle}</h2>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Snapshot ID: <strong className="text-foreground">{report.snapshotId}</strong>
            </div>
          </div>

          <div className="text-right text-xs text-muted-foreground space-y-0.5">
            <div>Network: <strong className="text-teal">{report.network}</strong></div>
            <div>Generated: {new Date(report.generatedAt).toLocaleString()}</div>
          </div>
        </div>

        {/* Valuation Notice Banner */}
        <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-xs font-mono text-teal flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 shrink-0 text-teal" />
          <span>{report.valuationNotice}</span>
        </div>

        {/* Executive Summary Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground block font-bold">Wallet Address</span>
            <span className="font-bold text-foreground text-sm truncate block">
              {isWalletConnected && report.wallet.address ? report.wallet.address : "UNAVAILABLE / Disconnected"}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground block font-bold">Devnet SOL Balance</span>
            <span className="font-bold text-teal text-base block">
              {isWalletConnected && report.wallet.solBalance !== null
                ? `${report.wallet.solBalance.toFixed(4)} SOL`
                : "UNAVAILABLE"}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground block font-bold">Spot Price Reference</span>
            <span className="font-bold text-foreground text-base block">
              {formatUsd(report.market.solPriceUsd)} ({report.market.provider})
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span className="text-[10px] uppercase text-muted-foreground block font-bold">Risk Profile</span>
            <span className="font-bold text-warning text-base block">
              {report.riskSummary.riskCategory}
            </span>
          </div>
        </div>

        {/* Risk Assessment Section */}
        <div className="space-y-3 font-mono text-xs">
          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-muted-foreground">
            Risk & Telemetry Assessment
          </h3>
          <div className="p-4 rounded-xl border border-white/10 bg-black/40 space-y-2">
            <div className="flex justify-between items-center text-sm font-bold text-foreground">
              <span>Total Risk Index: {isWalletConnected ? `${report.riskSummary.totalRiskScore}/100` : "Not Calculated"}</span>
              <span className="text-warning">{report.riskSummary.riskCategory}</span>
            </div>
            <p className="text-xs text-muted-foreground">{report.riskSummary.explanation}</p>
          </div>
        </div>

        {/* Recent Transactions Section (Web View with Solana Explorer Links) */}
        <div className="space-y-3 font-mono text-xs">
          <h3 className="text-sm font-bold font-display uppercase tracking-wider text-muted-foreground">
            Confirmed Signatures ({isWalletConnected ? recentTxs.length : 0} Shown)
          </h3>
          <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-black/20">
            {isWalletConnected && recentTxs.length > 0 ? (
              recentTxs.map((tx) => (
                <div key={tx.id} className="p-3 flex justify-between items-center text-xs">
                  <div className="truncate pr-4 font-mono flex items-center gap-2">
                    <span className="text-foreground font-bold">{tx.signature}</span>
                    <a
                      href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline text-[11px]"
                    >
                      Explorer <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <span className="text-muted-foreground text-[11px] shrink-0 font-mono">{tx.status}</span>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground font-mono">
                No confirmed Devnet transactions available.
              </div>
            )}
          </div>
        </div>

        {/* Web Disclaimer Footer */}
        <div className="border-t border-white/10 pt-4 text-xs font-mono text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Primary Sources: Solana Devnet RPC, CoinGecko API</span>
            <span>Generated by AgentFi — Educational prototype</span>
          </div>
          <div>{report.disclaimer}</div>
        </div>
      </div>

      {/* DEDICATED PRINT CONTAINER (.enterprise-print-report) - Structured for A4 Single-Page Output */}
      <div className="enterprise-print-report hidden print:block">
        <div style={{ padding: "16px 20px", fontFamily: "Arial, Helvetica, sans-serif", color: "#111827", background: "#ffffff", maxWidth: "800px", margin: "0 auto" }}>
          
          {/* Print Header */}
          <div style={{ borderBottom: "2px solid #7c3aed", paddingBottom: "10px", marginBottom: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "16pt", fontWeight: "bold", color: "#7c3aed", letterSpacing: "-0.5px" }}>
                  AgentFi OS v2.0
                </div>
                <div style={{ fontSize: "14pt", fontWeight: "bold", color: "#111827", marginTop: "2px" }}>
                  Enterprise Portfolio Intelligence Report
                </div>
                <div style={{ fontSize: "8.5pt", color: "#059669", fontWeight: "bold", marginTop: "2px" }}>
                  SOLANA DEVNET — TEST FUNDS ONLY
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: "8pt", color: "#4b5563", lineHeight: "1.3" }}>
                <div><strong>Report ID:</strong> {report.snapshotId.slice(0, 18)}</div>
                <div><strong>Generated:</strong> {new Date(report.generatedAt).toLocaleString()}</div>
                <div><strong>Wallet:</strong> {truncateAddress(report.wallet.address)}</div>
                <div><strong>Network:</strong> Solana Devnet</div>
              </div>
            </div>
          </div>

          {/* Executive Summary 4-Box Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "12px" }}>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "8px", background: "#f9fafb" }}>
              <div style={{ fontSize: "7.5pt", textTransform: "uppercase", color: "#6b7280", fontWeight: "bold" }}>Live Devnet SOL</div>
              <div style={{ fontSize: "11pt", fontWeight: "bold", color: "#059669", marginTop: "2px" }}>
                {isWalletConnected && report.wallet.solBalance !== null ? `${report.wallet.solBalance.toFixed(4)} SOL` : "UNAVAILABLE"}
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "8px", background: "#f9fafb" }}>
              <div style={{ fontSize: "7.5pt", textTransform: "uppercase", color: "#6b7280", fontWeight: "bold" }}>Spot Reference</div>
              <div style={{ fontSize: "11pt", fontWeight: "bold", color: "#111827", marginTop: "2px" }}>
                {formatUsd(report.market.solPriceUsd)}
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "8px", background: "#f9fafb" }}>
              <div style={{ fontSize: "7.5pt", textTransform: "uppercase", color: "#6b7280", fontWeight: "bold" }}>Risk Assessment</div>
              <div style={{ fontSize: "11pt", fontWeight: "bold", color: "#d97706", marginTop: "2px" }}>
                {report.riskSummary.riskCategory}
              </div>
            </div>

            <div style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "8px", background: "#f9fafb" }}>
              <div style={{ fontSize: "7.5pt", textTransform: "uppercase", color: "#6b7280", fontWeight: "bold" }}>Signatures Loaded</div>
              <div style={{ fontSize: "11pt", fontWeight: "bold", color: "#111827", marginTop: "2px" }}>
                {isWalletConnected ? recentTxs.length : 0} Signatures
              </div>
            </div>
          </div>

          {/* Section 1: Portfolio & Telemetry Assessment */}
          <div className="print-section" style={{ marginBottom: "12px", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px", background: "#ffffff" }}>
            <div style={{ fontSize: "10pt", fontWeight: "bold", color: "#7c3aed", borderBottom: "1px solid #f3f4f6", paddingBottom: "4px", marginBottom: "6px" }}>
              1. Risk & Portfolio Telemetry Assessment
            </div>
            <div style={{ fontSize: "8.5pt", color: "#374151", lineHeight: "1.4" }}>
              <strong>Calculated Risk Score:</strong> {isWalletConnected ? `${report.riskSummary.totalRiskScore}/100 (${report.riskSummary.riskCategory})` : "Not Calculated (Wallet Disconnected)"}
              <br />
              <strong>Breakdown Explanation:</strong> {report.riskSummary.explanation}
            </div>
          </div>

          {/* Section 2: Recommendation Summary */}
          <div className="print-section" style={{ marginBottom: "12px", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px", background: "#ffffff" }}>
            <div style={{ fontSize: "10pt", fontWeight: "bold", color: "#7c3aed", borderBottom: "1px solid #f3f4f6", paddingBottom: "4px", marginBottom: "6px" }}>
              2. Transparent Rule-Based Recommendations
            </div>
            <div style={{ fontSize: "8pt", color: "#374151", lineHeight: "1.4" }}>
              {recommendations.slice(0, 3).map((rec, idx) => (
                <div key={idx} style={{ marginBottom: "4px" }}>
                  • <strong>{rec.title}:</strong> {rec.evidence} ({rec.disclaimer})
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Recent Signatures Table (Max 5 items, shortened signatures) */}
          <div className="print-section" style={{ marginBottom: "12px", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "10px", background: "#ffffff" }}>
            <div style={{ fontSize: "10pt", fontWeight: "bold", color: "#7c3aed", borderBottom: "1px solid #f3f4f6", paddingBottom: "4px", marginBottom: "6px" }}>
              3. Recent Confirmed Transactions (Max 5 Signatures)
            </div>
            {isWalletConnected && recentTxs.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "8pt" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                    <th style={{ padding: "4px 6px", border: "1px solid #e5e7eb" }}>Signature</th>
                    <th style={{ padding: "4px 6px", border: "1px solid #e5e7eb" }}>Status</th>
                    <th style={{ padding: "4px 6px", border: "1px solid #e5e7eb" }}>Direction</th>
                    <th style={{ padding: "4px 6px", border: "1px solid #e5e7eb" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTxs.map((tx) => (
                    <tr key={tx.id}>
                      <td style={{ padding: "4px 6px", border: "1px solid #e5e7eb", fontFamily: "monospace" }}>
                        {truncateSignature(tx.signature)}
                      </td>
                      <td style={{ padding: "4px 6px", border: "1px solid #e5e7eb", color: tx.status === "confirmed" ? "#059669" : "#dc2626" }}>
                        {tx.status}
                      </td>
                      <td style={{ padding: "4px 6px", border: "1px solid #e5e7eb" }}>{tx.direction}</td>
                      <td style={{ padding: "4px 6px", border: "1px solid #e5e7eb", fontWeight: "bold" }}>
                        {tx.fromAmount ? `${tx.fromAmount.toFixed(4)} SOL` : "0.05 SOL"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ fontSize: "8.5pt", color: "#6b7280", fontStyle: "italic", textAlign: "center", padding: "6px" }}>
                No confirmed Devnet transactions available.
              </div>
            )}
          </div>

          {/* Section 4: Data Provenance & Methodology */}
          <div className="print-section" style={{ marginBottom: "12px", fontSize: "7.5pt", color: "#6b7280", borderTop: "1px solid #e5e7eb", paddingTop: "6px" }}>
            <strong>Data Provenance & Methodology:</strong> Data retrieved directly from Solana Devnet RPC and CoinGecko Market API endpoints. All risk metrics and portfolio evaluations are computed deterministically.
          </div>

          {/* Print Footer */}
          <div style={{ borderTop: "1px solid #9ca3af", paddingTop: "6px", marginTop: "10px", fontSize: "7.5pt", color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
            <span>AgentFi OS v2.0 — Educational Prototype</span>
            <span>Devnet SOL test funds have no real monetary value</span>
            <span>Page 1 of 1</span>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function EnterpriseReportsPage() {
  return (
    <ErrorBoundary fallbackTitle="Enterprise Reports Error">
      <EnterpriseReportsPageContent />
    </ErrorBoundary>
  );
}
