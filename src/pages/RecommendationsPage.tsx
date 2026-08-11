import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, RefreshCw, ArrowRight, AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";
import { useLiveSnapshot } from "@/hooks/useLiveSnapshot";
import { generateLiveRecommendations, LiveRecommendation } from "@/services/recommendationEngine";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

export function RecommendationsPageContent() {
  const navigate = useNavigate();
  const { snapshot, loading, refresh } = useLiveSnapshot();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const recs = generateLiveRecommendations(snapshot);

  return (
    <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight font-display text-foreground">Recommendation Center</h1>
            <Badge variant="outline" className="border-teal/30 bg-teal/10 text-teal font-mono font-bold text-xs uppercase">
              TRANSPARENT RULE-BASED ENGINE
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Rule-based financial recommendations derived from live wallet RPC state and market feeds.
          </p>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          variant="outline"
          className="gap-2 glass-panel border-white/10 hover:bg-white/5 font-mono text-xs h-10 px-4 rounded-xl shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading || isRefreshing ? "animate-spin" : ""}`} />
          Refresh Engine
        </Button>
      </div>

      {/* Notice Banner */}
      <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-xs font-mono text-amber-400 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 shrink-0" />
        <span>
          Only native Devnet SOL transfers are executable. Mainnet yield protocols (Kamino/Orca) are disabled for Devnet test funds.
        </span>
      </div>

      {/* Recommendations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        {recs.map((rec) => (
          <Card key={rec.id} className="glass-card border-white/10 flex flex-col justify-between space-y-4">
            <CardHeader className="pb-2 border-b border-white/5">
              <div className="flex justify-between items-start gap-2">
                <div className="space-y-1">
                  <Badge variant="outline" className="border-primary/30 text-primary text-[10px] uppercase">
                    {rec.category}
                  </Badge>
                  <CardTitle className="font-display text-base text-foreground mt-1">{rec.title}</CardTitle>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] uppercase ${
                    rec.isExecutable ? "border-teal/30 text-teal bg-teal/10" : "border-border text-muted-foreground bg-white/5"
                  }`}
                >
                  {rec.isExecutable ? "Executable on Devnet" : "Read-Only Reference"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-2">
              <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Trigger Condition</span>
                <span className="text-foreground">{rec.triggerCondition}</span>
              </div>

              <div className="p-3 rounded-lg bg-white/5 border border-white/5 space-y-1">
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">Observed Evidence</span>
                <span className="text-teal font-bold">{rec.evidence}</span>
              </div>

              <div className="text-[11px] text-muted-foreground flex justify-between">
                <span>Source: {rec.source}</span>
                <span>Network: {rec.network}</span>
              </div>

              <div className="text-[10px] text-muted-foreground italic border-t border-white/5 pt-2">
                {rec.disclaimer}
              </div>

              {/* Action Button */}
              {rec.isExecutable ? (
                <Button
                  onClick={() => navigate("/agents")}
                  className="w-full gap-2 bg-gradient-primary hover:opacity-90 font-mono text-xs h-10 rounded-xl mt-2"
                >
                  {rec.actionText} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button
                  disabled
                  variant="outline"
                  className="w-full border-white/10 text-muted-foreground font-mono text-xs h-10 rounded-xl opacity-60 mt-2"
                >
                  Mainnet protocol reference — unavailable for Devnet test funds
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function RecommendationsPage() {
  return (
    <ErrorBoundary fallbackTitle="Recommendations Error">
      <RecommendationsPageContent />
    </ErrorBoundary>
  );
}
