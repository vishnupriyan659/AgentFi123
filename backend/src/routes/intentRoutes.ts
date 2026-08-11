import { Router, Request, Response } from "express";
import { jupiterService } from "../services/jupiterService.js";
import { transactionService } from "../services/transactionService.js";
import { agentEngine } from "../agents/agentEngine.js";
import { getAIProvider } from "../ai/index.js";
import { tokenRegistry } from "../services/tokenRegistry.js";
import { prisma } from "../prisma.js";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

const router = Router();
const aiProvider = getAIProvider();

export const transferIntentSchema = z.object({
  action: z.literal("send"),
  token: z.literal("SOL"),
  network: z.literal("devnet"),
  amount: z.number().positive().max(0.05),
  recipient: z.string().refine((val) => {
    try {
      const pk = new PublicKey(val);
      return PublicKey.isOnCurve(pk.toBuffer());
    } catch {
      return false;
    }
  }, { message: "Recipient must be a valid on-curve Solana public key." }),
  sender: z.string().refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Sender must be a valid Solana public key." }),
}).refine((data) => data.recipient !== data.sender, {
  message: "Self-transfer is not permitted.",
  path: ["recipient"]
});

router.post("/", async (req: Request, res: Response) => {
  const { intent, wallet, parsedTransfer } = req.body;
  try {
    // If explicit native SOL transfer payload provided, validate with Zod
    if (parsedTransfer) {
      const validated = transferIntentSchema.parse(parsedTransfer);
      
      await agentEngine.updateAgent("risk", { status: "completed", message: "Devnet Transfer Validation Passed", progress: 100, confidence: 100 });

      const user = await prisma.user.upsert({
        where: { wallet: wallet || 'demo-wallet' },
        update: {},
        create: { wallet: wallet || 'demo-wallet', nonce: Math.random().toString() }
      });

      const result = await prisma.intent.create({
        data: {
          userId: user.id,
          action: "send",
          source: JSON.stringify({ token: "SOL", amount: validated.amount }),
          target: JSON.stringify({ recipient: validated.recipient }),
          status: "validated"
        }
      });

      return res.json({
        id: result.id,
        action: "send",
        source: { token: "SOL", amount: validated.amount },
        target: { recipient: validated.recipient },
        status: "validated",
        validatedProposal: {
          action: "send",
          token: "SOL",
          amount: validated.amount,
          recipient: validated.recipient,
          network: "devnet"
        }
      });
    }

    const parsed = await aiProvider.parseIntent(intent);
    
    // Check risk using the risk agent (mocked risk check)
    await agentEngine.updateAgent("risk", { status: "analyzing", message: "Evaluating token risk...", progress: 50 });
    
    const sourceTokenInfo = tokenRegistry.getTokenByTicker(parsed.sourceToken);
    const targetTokenInfo = tokenRegistry.getTokenByTicker(parsed.targetToken);
    
    if (!sourceTokenInfo || !targetTokenInfo) {
      await agentEngine.updateAgent("risk", { status: "failed", message: "Unverified token detected" });
      throw new Error("One or more tokens are not in the verified token registry.");
    }

    await agentEngine.updateAgent("risk", { status: "completed", message: "Risk checks passed", progress: 100, confidence: 99 });
    
    const user = await prisma.user.upsert({
      where: { wallet: wallet || 'demo-wallet' },
      update: {},
      create: { wallet: wallet || 'demo-wallet', nonce: Math.random().toString() }
    });

    const result = await prisma.intent.create({
      data: {
        userId: user.id,
        action: parsed.action,
        source: JSON.stringify({ token: sourceTokenInfo.ticker, amount: parsed.amount, mint: sourceTokenInfo.mint }),
        target: JSON.stringify({ token: targetTokenInfo.ticker, mint: targetTokenInfo.mint }),
        status: "pending"
      }
    });
    
    // We parse back for the frontend
    res.json({
      ...result,
      source: JSON.parse(result.source),
      target: result.target ? JSON.parse(result.target) : null
    });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Invalid transfer intent payload." });
  }
});

router.post("/:id/simulate", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { inputMint, outputMint, amount } = req.body;

  try {
    await agentEngine.updateAgent("market", { status: "working", message: "Fetching Jupiter routes" });
    await agentEngine.addActivity({ agent: "Market", title: "Simulation Started", message: `Simulating swap on Jupiter.`, status: "info" });

    const simulation = await jupiterService.simulateSwap(inputMint, outputMint, amount);

    await prisma.simulation.create({
      data: {
        intentId: id,
        data: JSON.stringify(simulation)
      }
    });

    await agentEngine.updateAgent("market", { status: "completed", message: "Simulation complete", progress: 100, confidence: 99 });
    await agentEngine.addActivity({ agent: "Market", title: "Simulation Complete", message: `Found route with price impact ${simulation.priceImpact}%`, status: "success" });

    res.json(simulation);
  } catch (error: any) {
    await agentEngine.updateAgent("market", { status: "failed", message: error.message });
    await agentEngine.addActivity({ agent: "Market", title: "Simulation Failed", message: error.message, status: "error" });
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/prepare", (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { quoteResponse, walletAddress } = req.body;
  try {
    const result = transactionService.prepareTransaction(id, quoteResponse, walletAddress);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/:id/result", async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { signature, status } = req.body;
  
  await agentEngine.updateAgent("execution", { status: "completed", message: "Transaction confirmed", progress: 100, confidence: 100 });
  await agentEngine.addActivity({ agent: "Execution", title: "Transaction Confirmed", message: `Signature: ${signature}`, status: "success" });
  
  const result = await transactionService.saveTransactionResult(id, signature, status);
  res.json(result);
});

export default router;
