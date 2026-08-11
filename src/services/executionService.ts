import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

export class ExecutionService {
  private readonly baseUrl = "https://quote-api.jup.ag/v6";

  async getSwapTransaction(quoteResponse: any, userPublicKey: string): Promise<VersionedTransaction> {
    try {
      const res = await fetch(`${this.baseUrl}/swap`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey,
          wrapAndUnwrapSol: true,
        })
      });

      if (!res.ok) {
        throw new Error(`Jupiter swap failed: ${res.statusText}`);
      }

      const { swapTransaction } = await res.json();
      
      // Deserialize the transaction browser-natively
      const binaryStr = atob(swapTransaction);
      const swapTransactionBuf = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
      return VersionedTransaction.deserialize(swapTransactionBuf);
    } catch (e) {
      console.error("ExecutionService error:", e);
      throw e;
    }
  }

  async executeTransaction(
    transaction: VersionedTransaction,
    connection: Connection,
    sendTransaction: any
  ): Promise<string> {
    try {
      // Use the wallet adapter to send the versioned transaction
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");
      return signature;
    } catch (e) {
      console.error("Transaction execution failed:", e);
      throw e;
    }
  }
}

export const executionService = new ExecutionService();
