import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";


export class SolanaService {
  private rpcUrls: string[];
  private network: string;

  constructor() {
    this.network = process.env.SOLANA_NETWORK || "devnet";
    const primaryUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
    const fallbackUrl = process.env.SOLANA_RPC_FALLBACK_URL || "https://api.devnet.solana.com";
    this.rpcUrls = [primaryUrl, fallbackUrl];
  }

  private async executeWithFailover<T>(operation: (conn: Connection) => Promise<T>): Promise<T> {
    let lastError = new Error("No RPC URLs available");
    for (const url of this.rpcUrls) {
      try {
        const conn = new Connection(url, "confirmed");
        return await operation(conn);
      } catch (err: any) {
        lastError = err;
        console.warn(`RPC failed for ${url}:`, err.message);
      }
    }
    throw lastError;
  }

  async getWalletData(address: string) {
    try {
      const pubkey = new PublicKey(address);
      
      const balance = await this.executeWithFailover(conn => conn.getBalance(pubkey));
      const solBalance = balance / LAMPORTS_PER_SOL;

      const { TOKEN_PROGRAM_ID } = await import("@solana/spl-token");
      
      const tokenAccounts = await this.executeWithFailover(conn => 
        conn.getParsedTokenAccountsByOwner(pubkey, { programId: TOKEN_PROGRAM_ID })
      );

      const tokens = tokenAccounts.value.map(ta => {
        const parsedInfo = ta.account.data.parsed.info;
        return {
          mint: parsedInfo.mint,
          amount: parsedInfo.tokenAmount.uiAmount,
          decimals: parsedInfo.tokenAmount.decimals
        };
      }).filter(t => t.amount > 0);
      
      return {
        valid: true,
        network: this.network,
        solBalance,
        tokens
      };
    } catch (e: any) {
      console.error("Wallet data error:", e.message);
      return {
        valid: false,
        network: this.network,
        solBalance: 0,
        tokens: []
      };
    }
  }
}

export const solanaService = new SolanaService();
