export interface SenderConsistencyParams {
  connectedPublicKey?: string | null;
  parsedSender?: string | null;
  backendProposalSender?: string | null;
  preparedTxSender?: string | null;
  instructionSender?: string | null;
}

export interface SenderConsistencyResult {
  valid: boolean;
  error?: string;
}

/**
 * Checks sender consistency across wallet adapter, parsed intent, backend proposal,
 * prepared transaction, instruction key, and window.phantom.solana.publicKey.
 */
export function verifySenderConsistency(params: SenderConsistencyParams): SenderConsistencyResult {
  const currentKey = params.connectedPublicKey?.trim();
  if (!currentKey) {
    return { valid: false, error: "Phantom account changed. Review the transfer again." };
  }

  // Check window.phantom.solana.publicKey if present
  if (typeof window !== "undefined" && (window as any).phantom?.solana?.publicKey) {
    try {
      const phantomKey = (window as any).phantom.solana.publicKey.toBase58().trim();
      if (phantomKey !== currentKey) {
        return { valid: false, error: "Phantom account changed. Review the transfer again." };
      }
    } catch {
      // ignore read error
    }
  }

  if (params.parsedSender && params.parsedSender.trim() !== currentKey) {
    return { valid: false, error: "Phantom account changed. Review the transfer again." };
  }

  if (params.backendProposalSender && params.backendProposalSender.trim() !== currentKey) {
    return { valid: false, error: "Phantom account changed. Review the transfer again." };
  }

  if (params.preparedTxSender && params.preparedTxSender.trim() !== currentKey) {
    return { valid: false, error: "Phantom account changed. Review the transfer again." };
  }

  if (params.instructionSender && params.instructionSender.trim() !== currentKey) {
    return { valid: false, error: "Phantom account changed. Review the transfer again." };
  }

  return { valid: true };
}
