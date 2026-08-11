import type { AgentFiLiveSnapshot } from "./liveSnapshotService";

export interface LiveRiskBreakdown {
  concentrationScore: number; // 0-30
  volatilityScore: number;    // 0-25
  diversificationScore: number;// 0-20
  feeReserveScore: number;    // 0-15
  failedTxScore: number;       // 0-10
  totalRiskScore: number;      // 0-100
  riskCategory: "Low Risk" | "Moderate Risk" | "Elevated Risk" | "Not Calculated";
  formulaExplanation: string;
  hasEnoughData: boolean;
  calculatedAt: string;
}

/**
 * Deterministically calculates wallet risk score from live snapshot data.
 * Obey Fix 19D rules:
 * - If disconnected: return hasEnoughData = false ("Connect Phantom to load live wallet data").
 * - If 0 SOL: return hasEnoughData = false ("Not enough holdings data").
 * - Only calculate concentration when solBalance > 0.
 */
export function calculateLiveRiskProfile(snapshot: AgentFiLiveSnapshot | null): LiveRiskBreakdown {
  if (!snapshot || !snapshot.wallet.connected || !snapshot.wallet.publicKey) {
    return {
      concentrationScore: 0,
      volatilityScore: 0,
      diversificationScore: 0,
      feeReserveScore: 0,
      failedTxScore: 0,
      totalRiskScore: 0,
      riskCategory: "Not Calculated",
      formulaExplanation: "Connect Phantom to load live wallet data.",
      hasEnoughData: false,
      calculatedAt: new Date().toISOString(),
    };
  }

  const { solBalance, balanceStatus, tokenAccounts, recentTransactions } = snapshot.wallet;
  const { realizedVolatility } = snapshot.market;

  if (solBalance === null || balanceStatus === "unavailable" || balanceStatus === "loading") {
    return {
      concentrationScore: 0,
      volatilityScore: 0,
      diversificationScore: 0,
      feeReserveScore: 0,
      failedTxScore: 0,
      totalRiskScore: 0,
      riskCategory: "Not Calculated",
      formulaExplanation: "Wallet data loading or unavailable from RPC.",
      hasEnoughData: false,
      calculatedAt: new Date().toISOString(),
    };
  }

  if (solBalance === 0 || balanceStatus === "zero") {
    return {
      concentrationScore: 0,
      volatilityScore: 0,
      diversificationScore: 0,
      feeReserveScore: 15, // Low fee reserve
      failedTxScore: 0,
      totalRiskScore: 15,
      riskCategory: "Not Calculated",
      formulaExplanation: "Not enough holdings data (0.0000 SOL balance). Obtain Devnet test funds.",
      hasEnoughData: false,
      calculatedAt: new Date().toISOString(),
    };
  }

  // 1. Concentration Score (0-30 points) - Only computed when solBalance > 0
  const totalAssetsCount = 1 + (tokenAccounts ? tokenAccounts.length : 0);
  const concentrationScore = totalAssetsCount === 1 ? 30 : Math.max(0, 30 - tokenAccounts.length * 5);

  // 2. Market Volatility Score (0-25 points)
  const vol = realizedVolatility ?? 0;
  const volatilityScore = Math.min(25, Math.round(vol * 2.5));

  // 3. Diversification Score (0-20 points)
  const diversificationScore = totalAssetsCount === 1 ? 20 : Math.max(0, 20 - tokenAccounts.length * 4);

  // 4. Fee Reserve Score (0-15 points)
  let feeReserveScore = 0;
  if (solBalance < 0.005) {
    feeReserveScore = 15;
  } else if (solBalance < 0.02) {
    feeReserveScore = 10;
  } else if (solBalance < 0.05) {
    feeReserveScore = 5;
  } else {
    feeReserveScore = 0;
  }

  // 5. Failed Transaction Score (0-10 points)
  const failedTxsCount = recentTransactions.filter((t) => t.status === "failed").length;
  const failedTxScore = Math.min(10, failedTxsCount * 5);

  const totalRiskScore = Math.min(
    100,
    concentrationScore + volatilityScore + diversificationScore + feeReserveScore + failedTxScore
  );

  let riskCategory: "Low Risk" | "Moderate Risk" | "Elevated Risk" = "Low Risk";
  if (totalRiskScore >= 60) riskCategory = "Elevated Risk";
  else if (totalRiskScore >= 30) riskCategory = "Moderate Risk";

  const formulaExplanation = `Calculated score (${totalRiskScore}/100) = Concentration (${concentrationScore}/30) + Volatility (${volatilityScore}/25) + Diversification (${diversificationScore}/20) + Fee Reserve (${feeReserveScore}/15) + Failed Txs (${failedTxScore}/10).`;

  return {
    concentrationScore,
    volatilityScore,
    diversificationScore,
    feeReserveScore,
    failedTxScore,
    totalRiskScore,
    riskCategory,
    formulaExplanation,
    hasEnoughData: true,
    calculatedAt: new Date().toISOString(),
  };
}
