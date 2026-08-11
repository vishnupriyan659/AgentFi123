import { Router, Request, Response } from "express";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";

const router = Router();

export const transferValidateSchema = z.object({
  rawIntent: z.string().min(1),
  action: z.literal("send"),
  token: z.literal("SOL"),
  network: z.literal("devnet"),
  sender: z.string().refine((val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  }, { message: "Sender must be a valid Solana public key." }),
  recipient: z.string().refine((val) => {
    try {
      const pk = new PublicKey(val);
      return PublicKey.isOnCurve(pk.toBuffer());
    } catch {
      return false;
    }
  }, { message: "Recipient must be a valid on-curve user wallet public key." }),
  amount: z.string().refine((val) => {
    const num = Number(val);
    if (!Number.isFinite(num) || num <= 0 || num > 0.05) return false;
    const parts = val.split(".");
    if (parts[1] && parts[1].length > 9) return false;
    return true;
  }, { message: "Amount must be a positive number <= 0.05 SOL with at most 9 decimal places." })
}).refine((data) => data.sender !== data.recipient, {
  message: "Self-transfer is not permitted.",
  path: ["recipient"]
});

router.post("/validate", (req: Request, res: Response) => {
  try {
    const data = transferValidateSchema.parse(req.body);

    // Extract details from rawIntent string using strict named capture groups
    const trimmed = data.rawIntent.trim();
    const regex = /^\s*(?:send|transfer)\s+(?<amount>\d+(?:\.\d+)?)\s+(?<token>SOL)\s+to\s+(?<recipient>[1-9A-HJ-NP-Za-km-z]{32,44})\s*$/i;
    const match = trimmed.match(regex);
    if (!match || !match.groups) {
      return res.status(400).json({ error: "Raw intent string format invalid. Expected: Send <amount> SOL to <recipient-public-key>." });
    }

    const { amount: intentAmountStr, token: intentTokenStr, recipient: intentRecipientStr } = match.groups;

    if (intentTokenStr.toUpperCase() !== data.token) {
      return res.status(400).json({ error: `Token mismatch: Intent states ${intentTokenStr.toUpperCase()}, request states ${data.token}.` });
    }

    if (intentAmountStr !== data.amount) {
      return res.status(400).json({ error: `Amount mismatch: Intent states ${intentAmountStr} SOL, request states ${data.amount} SOL.` });
    }

    if (intentRecipientStr.toLowerCase() !== data.recipient.toLowerCase()) {
      return res.status(400).json({ error: "Recipient mismatch between raw intent and request payload." });
    }

    // Convert amount to exact lamports
    const parts = data.amount.split(".");
    const whole = parts[0] || "0";
    const decimals = parts[1] || "";
    const fractionPadded = decimals.padEnd(9, "0");
    const lamports = BigInt(whole) * 1_000_000_000n + BigInt(fractionPadded);

    return res.json({
      valid: true,
      action: "send",
      token: "SOL",
      network: "devnet",
      sender: data.sender,
      recipient: data.recipient,
      amount: data.amount,
      lamports: lamports.toString()
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      const issues = err.issues || [];
      const msg = issues[0]?.message || "Invalid transfer validation payload.";
      return res.status(400).json({ error: msg });
    }
    return res.status(400).json({ error: err.message || "Transfer validation failed." });
  }
});

export default router;
