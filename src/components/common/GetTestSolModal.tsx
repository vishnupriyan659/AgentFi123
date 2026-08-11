import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ExternalLink, ShieldCheck, AlertCircle, Droplets } from "lucide-react";

export function GetTestSolModal() {
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    window.open("https://faucet.solana.com/", "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="inline-flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-teal/40 bg-teal/10 text-teal hover:bg-teal/20 font-mono text-xs h-9 px-3 rounded-xl transition-all"
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Get Test SOL</span>
            <Badge variant="outline" className="border-teal/40 bg-teal/20 text-teal text-[9px] font-mono uppercase px-1.5 py-0">
              SOLANA DEVNET — TEST FUNDS ONLY
            </Badge>
          </Button>
        </div>
      </DialogTrigger>

      <DialogContent className="glass-card border-border/50 max-w-md font-mono text-xs space-y-4">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <Droplets className="w-5 h-5 text-teal" />
            <DialogTitle className="font-display text-lg text-foreground">
              Obtain Devnet SOL Test Funds
            </DialogTitle>
          </div>
          <Badge variant="outline" className="border-teal/40 bg-teal/10 text-teal text-[10px] uppercase font-mono w-fit">
            SOLANA DEVNET — TEST FUNDS ONLY
          </Badge>
        </DialogHeader>

        <DialogDescription className="text-xs text-muted-foreground space-y-3 pt-2">
          <div className="p-3 rounded-xl border border-teal/30 bg-teal/10 text-teal space-y-2">
            <div className="flex items-center gap-2 font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-teal shrink-0" />
              Safety & Official Faucet Notice
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px]">
              <li><strong>Devnet SOL has no monetary value.</strong></li>
              <li>This opens the official Solana faucet (<span className="underline">https://faucet.solana.com/</span>).</li>
              <li><strong>AgentFi never requests a seed phrase or private key.</strong></li>
            </ul>
          </div>

          <p className="text-[11px] text-muted-foreground">
            No mainnet API, payment provider, or GitHub credentials are required inside AgentFi. Clicking confirm below will safely open the official Solana faucet in a new browser tab.
          </p>
        </DialogDescription>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-white/5">
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            className="font-mono text-xs h-10 rounded-xl hover:bg-white/5"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="gap-2 bg-teal text-black hover:bg-teal/90 font-bold font-mono text-xs h-10 px-4 rounded-xl"
          >
            Open Official Solana Faucet <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
