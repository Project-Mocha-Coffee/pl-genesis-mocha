import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Smartphone,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { cn, formatKenyaPhoneDisplay, getTxExplorerUrl, normalizeTxHashForExplorer } from "@/lib/utils";
import { toast } from "sonner";

export type MpesaModalPhase =
  | "initiating"
  | "awaiting_mpesa"
  | "success"
  | "failed"
  | "timeout";

interface MpesaPaymentFlowModalProps {
  open: boolean;
  phase: MpesaModalPhase;
  /** Shown for failed / timeout */
  errorMessage?: string | null;
  kesAmount: string;
  mbtAmount: string;
  /** Raw phone input (formatted for receipt) */
  phoneInput: string;
  /** Last 3–4 digits for reassurance in loading steps */
  phoneHint?: string;
  /** ElementPay order reference (often same hex as on-chain transfer) */
  orderReference?: string | null;
  /** Explicit on-chain tx if API returns something different from order ref */
  onChainTxHash?: string | null;
  /** ISO timestamp when status became terminal (success) or when user can retry */
  receiptAtIso?: string | null;
  /** Safaricom / M-PESA SMS receipt code if available from provider */
  mpesaSmsRef?: string | null;
  connectedWallet?: string | null;
  chainId: number;
  onOpenChange: (open: boolean) => void;
  onResultAcknowledged: () => void;
}

export function MpesaPaymentFlowModal({
  open,
  phase,
  errorMessage,
  kesAmount,
  mbtAmount,
  phoneInput,
  phoneHint,
  orderReference,
  onChainTxHash,
  receiptAtIso,
  mpesaSmsRef,
  connectedWallet,
  chainId,
  onOpenChange,
  onResultAcknowledged,
}: MpesaPaymentFlowModalProps) {
  const isBlocking = phase === "initiating" || phase === "awaiting_mpesa";
  const showClose = !isBlocking;
  const phoneDisplay = formatKenyaPhoneDisplay(phoneInput);

  const formattedTime = receiptAtIso
    ? new Date(receiptAtIso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && isBlocking) return;
        if (!next && (phase === "success" || phase === "failed" || phase === "timeout")) {
          onResultAcknowledged();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className={cn(
          "sm:max-w-lg border-[#522912]/20 dark:border-amber-500/30 overflow-hidden",
          !showClose && "[&>button]:hidden"
        )}
        onPointerDownOutside={(e) => {
          if (isBlocking) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isBlocking) e.preventDefault();
        }}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-[#522912] dark:text-amber-400 flex items-center gap-2 text-left">
            {phase === "initiating" && (
              <>
                <Loader2 className="h-5 w-5 animate-spin shrink-0" aria-hidden />
                Starting M-PESA payment
              </>
            )}
            {phase === "awaiting_mpesa" && (
              <>
                <Smartphone className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                Complete on your phone
              </>
            )}
            {phase === "success" && (
              <>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" aria-hidden />
                Payment successful
              </>
            )}
            {(phase === "failed" || phase === "timeout") && (
              <>
                <XCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
                {phase === "timeout" ? "Still processing?" : "Payment not completed"}
              </>
            )}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="text-left space-y-3 pt-1">
              {(phase === "initiating" || phase === "awaiting_mpesa") && (
                <p className="rounded-lg bg-muted/60 dark:bg-gray-800/80 px-3 py-2 text-sm text-foreground">
                  <span className="text-muted-foreground">You pay </span>
                  <span className="font-semibold">KES {kesAmount}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="font-semibold">{mbtAmount} MBT</span>
                  {phoneHint ? (
                    <span className="block text-xs text-muted-foreground mt-1">
                      STK sent to ···{phoneHint}
                    </span>
                  ) : null}
                </p>
              )}

              {phase === "initiating" && (
                <p className="text-sm text-muted-foreground">
                  Securely contacting ElementPay to send the M-PESA prompt. This usually takes a few seconds.
                </p>
              )}

              {phase === "awaiting_mpesa" && (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div
                    className="relative flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#522912]/25 dark:border-amber-500/30 bg-[#522912]/5 dark:bg-amber-500/10"
                    aria-hidden
                  >
                    <Loader2 className="h-10 w-10 animate-spin text-[#522912] dark:text-amber-400" />
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-sm font-medium text-foreground">
                      Check your phone for the M-PESA STK push
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Enter your M-PESA PIN to approve. We’ll confirm here as soon as ElementPay updates the order.
                      Your wallet is credited automatically when the payment clears.
                    </p>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center border-t border-border pt-3 w-full">
                    You don’t need to refresh—status updates here automatically while you complete the prompt on
                    your phone.
                  </p>
                </div>
              )}

              {phase === "success" && (
                <MpesaReceiptCard
                  variant="success"
                  chainId={chainId}
                  phoneDisplay={phoneDisplay}
                  kesAmount={kesAmount}
                  mbtAmount={mbtAmount}
                  formattedTime={formattedTime}
                  orderReference={orderReference}
                  onChainTxHash={onChainTxHash}
                  mpesaSmsRef={mpesaSmsRef}
                  connectedWallet={connectedWallet}
                  footnote="Your M-PESA payment went through. MBT should appear in your connected wallet shortly; on-chain settlement can take a moment."
                />
              )}

              {phase === "failed" && (
                <div className="space-y-4">
                  <MpesaReceiptCard
                    variant="failed"
                    chainId={chainId}
                    phoneDisplay={phoneDisplay}
                    kesAmount={kesAmount}
                    mbtAmount={mbtAmount}
                    formattedTime={formattedTime}
                    orderReference={orderReference}
                    onChainTxHash={onChainTxHash}
                    mpesaSmsRef={mpesaSmsRef}
                    connectedWallet={connectedWallet}
                    footnote={
                      errorMessage ||
                      "The payment did not complete. You can try again or use another method."
                    }
                  />
                </div>
              )}

              {phase === "timeout" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-foreground">
                    <Clock className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" aria-hidden />
                    <span>
                      We haven’t received a final status yet. The payment may still complete on your phone—check your
                      M-PESA messages. If you were charged but don’t see MBT, use the references below when contacting
                      support.
                    </span>
                  </div>
                  <MpesaReceiptCard
                    variant="timeout"
                    chainId={chainId}
                    phoneDisplay={phoneDisplay}
                    kesAmount={kesAmount}
                    mbtAmount={mbtAmount}
                    formattedTime={formattedTime}
                    orderReference={orderReference}
                    onChainTxHash={onChainTxHash}
                    mpesaSmsRef={mpesaSmsRef}
                    connectedWallet={connectedWallet}
                  />
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {(phase === "success" || phase === "failed" || phase === "timeout") && (
          <DialogFooter className="sm:justify-center gap-2 pt-2">
            <Button
              type="button"
              className="w-full bg-[#522912] hover:bg-[#6A4A36] dark:bg-amber-600 dark:hover:bg-amber-700"
              onClick={() => {
                onResultAcknowledged();
                onOpenChange(false);
              }}
            >
              {phase === "success" ? "Done" : "Close"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MpesaReceiptCard({
  variant,
  chainId,
  phoneDisplay,
  kesAmount,
  mbtAmount,
  formattedTime,
  orderReference,
  onChainTxHash,
  mpesaSmsRef,
  connectedWallet,
  footnote,
}: {
  variant: "success" | "failed" | "timeout";
  chainId: number;
  phoneDisplay: string;
  kesAmount: string;
  mbtAmount: string;
  formattedTime: string | null;
  orderReference?: string | null;
  onChainTxHash?: string | null;
  mpesaSmsRef?: string | null;
  connectedWallet?: string | null;
  footnote?: string;
}) {
  const accent =
    variant === "success"
      ? "border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-b from-emerald-50/90 to-white dark:from-emerald-950/40 dark:to-gray-900/80"
      : variant === "timeout"
        ? "border-amber-200/80 dark:border-amber-800/60 bg-gradient-to-b from-amber-50/80 to-white dark:from-amber-950/30 dark:to-gray-900/80"
        : "border-red-200/80 dark:border-red-900/50 bg-gradient-to-b from-red-50/70 to-white dark:from-red-950/25 dark:to-gray-900/80";

  const showSeparateOnChain =
    onChainTxHash &&
    orderReference &&
    onChainTxHash.replace(/^0x/i, "") !== orderReference.replace(/^0x/i, "");

  const orderExplorer =
    orderReference && normalizeTxHashForExplorer(orderReference)
      ? getTxExplorerUrl(chainId, orderReference)
      : null;
  const onChainExplorer =
    onChainTxHash && normalizeTxHashForExplorer(onChainTxHash)
      ? getTxExplorerUrl(chainId, onChainTxHash)
      : null;

  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-dashed p-4 shadow-inner",
        accent
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-[#522912]/10 dark:border-white/10 pb-3 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#522912]/70 dark:text-amber-400/90">
            {variant === "success" ? "Payment receipt" : variant === "timeout" ? "Attempt details" : "Attempt details"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Project Mocha · ElementPay · M-PESA</p>
        </div>
        {variant === "success" && (
          <span className="rounded-full bg-emerald-600/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold px-2 py-1">
            Paid
          </span>
        )}
      </div>

      <dl className="space-y-2.5 text-sm">
        <ReceiptLine label="Phone" value={phoneDisplay} />
        <ReceiptLine label="Amount paid" value={`KES ${kesAmount}`} emphasize />
        <ReceiptLine label="MBT (est.)" value={`${mbtAmount} MBT`} emphasize />
        {formattedTime ? <ReceiptLine label="Time" value={formattedTime} /> : null}
        {connectedWallet ? (
          <ReceiptLine
            label="Wallet"
            value={shortenAddress(connectedWallet)}
            copyText={connectedWallet}
            copyLabel="Wallet address"
          />
        ) : null}
        {mpesaSmsRef ? (
          <ReceiptLine label="M-PESA SMS ref" value={mpesaSmsRef} copyText={mpesaSmsRef} copyLabel="M-PESA reference" />
        ) : null}
        {orderReference ? (
          <ReceiptLine
            label="Order reference"
            value={truncateMiddle(orderReference, 10, 8)}
            copyText={orderReference}
            copyLabel="Order reference"
            mono
            href={orderExplorer ?? undefined}
          />
        ) : null}
        {showSeparateOnChain && onChainTxHash ? (
          <ReceiptLine
            label="On-chain tx"
            value={truncateMiddle(onChainTxHash, 10, 8)}
            copyText={onChainTxHash}
            copyLabel="Transaction hash"
            mono
            href={onChainExplorer ?? undefined}
          />
        ) : orderReference && !showSeparateOnChain ? (
          <ReceiptLine
            label="On-chain tx"
            value={truncateMiddle(orderReference, 10, 8)}
            copyText={orderReference}
            copyLabel="Transaction hash"
            mono
            href={orderExplorer ?? undefined}
          />
        ) : null}
      </dl>

      {footnote ? (
        <p
          className={cn(
            "mt-4 pt-3 border-t border-[#522912]/10 dark:border-white/10 text-xs leading-relaxed",
            variant === "success" ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {footnote}
        </p>
      ) : null}
    </div>
  );
}

function ReceiptLine({
  label,
  value,
  emphasize,
  mono,
  copyText,
  copyLabel,
  href,
  explorerLabel,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  mono?: boolean;
  copyText?: string;
  href?: string;
  copyLabel?: string;
  explorerLabel?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0 min-w-[7rem]">
        {label}
      </dt>
      <dd
        className={cn(
          "flex-1 text-right sm:text-left flex flex-wrap items-center justify-end sm:justify-start gap-2 min-w-0",
          emphasize && "font-semibold text-[#522912] dark:text-amber-100",
          mono && "font-mono text-[13px]"
        )}
      >
        <span className="break-all">{value}</span>
        <span className="inline-flex items-center gap-1 shrink-0">
          {copyText ? <CopyChip text={copyText} label={copyLabel || label} /> : null}
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-[#522912] dark:text-amber-400 bg-[#522912]/10 dark:bg-amber-500/15 hover:bg-[#522912]/20 dark:hover:bg-amber-500/25 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {explorerLabel || "View tx"}
            </a>
          ) : null}
        </span>
      </dd>
    </div>
  );
}

function CopyChip({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handle = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      className="inline-flex items-center gap-1 rounded-md border border-[#522912]/20 dark:border-amber-500/30 px-2 py-1 text-[11px] font-medium text-[#522912] dark:text-amber-400 hover:bg-[#522912]/10 dark:hover:bg-amber-500/15 transition-colors"
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function shortenAddress(addr: string) {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function truncateMiddle(s: string, start: number, end: number) {
  if (s.length <= start + end + 3) return s;
  return `${s.slice(0, start)}…${s.slice(-end)}`;
}

/** Map ElementPay / our proxy status strings to a coarse outcome for polling */
export function normalizeElementPayOrderStatus(
  raw: string | undefined | null
): "pending" | "success" | "failed" {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "pending";

  const successTokens = [
    "complete",
    "completed",
    "success",
    "paid",
    "confirmed",
    "settled",
    "credited",
    "done",
  ];
  const failTokens = [
    "fail",
    "failed",
    "error",
    "cancel",
    "cancelled",
    "canceled",
    "reject",
    "rejected",
    "expired",
    "void",
  ];

  for (const t of successTokens) {
    if (s === t || s.includes(t)) return "success";
  }
  for (const t of failTokens) {
    if (s === t || s.includes(t)) return "failed";
  }

  return "pending";
}

/** Try to read an on-chain tx hash from ElementPay status payload */
export function extractOnChainTxHashFromStatusPayload(data: unknown, fallbackOrderHash: string): string | null {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const inner = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;

  const candidates: unknown[] = [
    inner.on_chain_tx_hash,
    inner.onChainTxHash,
    inner.transaction_hash,
    inner.transfer_tx_hash,
    inner.tx_hash,
    inner.hash,
  ];

  for (const c of candidates) {
    if (typeof c !== "string" || !c.trim()) continue;
    if (normalizeTxHashForExplorer(c)) return c.trim();
  }

  return normalizeTxHashForExplorer(fallbackOrderHash) ? fallbackOrderHash : null;
}

/** Safaricom / M-PESA receipt code if ElementPay includes it in status */
export function extractMpesaSmsRefFromStatusPayload(data: unknown): string | null {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const inner = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;

  const keys = [
    "mpesa_receipt",
    "mpesaReceipt",
    "mpesa_receipt_number",
    "safaricom_receipt",
    "stk_receipt",
    "receipt_number",
    "receiptNumber",
    "mpesa_code",
  ];
  for (const k of keys) {
    const v = inner[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}
