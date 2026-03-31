'use client';

import { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { chains } from '@chainrails/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  CHAINRAILS_MAX_USD,
  CHAINRAILS_MIN_USD,
  CHAINRAILS_MBT_PRICE_USD,
} from '@/chainrails/constants';
import type { ChainrailsChainId } from '@/chainrails/ChainrailsCheckoutHost';

const ChainrailsCheckoutHost = dynamic(() => import('@/chainrails/ChainrailsCheckoutHost'), {
  ssr: false,
});

const CHAIN_OPTIONS: { id: ChainrailsChainId; label: string; hint: string }[] = [
  { id: chains.BASE, label: 'Base', hint: 'Fast, low fees' },
  { id: chains.ETHEREUM, label: 'Ethereum', hint: 'L1' },
  { id: chains.ARBITRUM, label: 'Arbitrum', hint: 'L2' },
  { id: chains.BSC, label: 'BNB Chain', hint: 'BSC' },
  { id: chains.AVALANCHE, label: 'Avalanche', hint: 'C-Chain' },
];

type AmountMode = 'USD' | 'MBT';

export default function StandaloneCryptoPaymentModal() {
  const recipient = useMemo((): `0x${string}` | '' => {
    const value = process.env.NEXT_PUBLIC_CHAINRAILS_RECIPIENT;
    if (typeof value === 'string' && value.startsWith('0x') && value.length >= 42) {
      return value as `0x${string}`;
    }
    return '';
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [amountMode, setAmountMode] = useState<AmountMode>('USD');
  const [rawInput, setRawInput] = useState('25');
  const [selectedChain, setSelectedChain] = useState<ChainrailsChainId>(chains.BASE);
  const [checkout, setCheckout] = useState<{ amountUsd: number; chain: ChainrailsChainId } | null>(null);

  const amountUsd = useMemo(() => {
    const n = parseFloat(rawInput.replace(',', '.')) || 0;
    if (amountMode === 'USD') return n;
    return n * CHAINRAILS_MBT_PRICE_USD;
  }, [rawInput, amountMode]);

  const mbtEquivalent = useMemo(() => amountUsd / CHAINRAILS_MBT_PRICE_USD, [amountUsd]);

  const validationError = useMemo(() => {
    if (!rawInput.trim()) return 'Enter an amount.';
    if (amountUsd < CHAINRAILS_MIN_USD) return `Minimum is $${CHAINRAILS_MIN_USD} (~${(CHAINRAILS_MIN_USD / CHAINRAILS_MBT_PRICE_USD).toFixed(4)} MBT).`;
    if (amountUsd > CHAINRAILS_MAX_USD) return `Maximum is $${CHAINRAILS_MAX_USD} per payment.`;
    return null;
  }, [rawInput, amountUsd]);

  const startCheckout = useCallback(() => {
    if (!recipient) {
      toast.error('Payment recipient is not configured.');
      return;
    }
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const rounded = Math.round(amountUsd * 100) / 100;
    setCheckout({ amountUsd: rounded, chain: selectedChain });
    setDialogOpen(false);
  }, [amountUsd, selectedChain, recipient, validationError]);

  const endCheckout = useCallback(() => {
    setCheckout(null);
  }, []);

  const validRecipient = Boolean(recipient);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full border-2 border-[#283C09] py-6 text-base font-semibold text-[#283C09] hover:bg-[#283C09] hover:text-white dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900/40"
        onClick={() => setDialogOpen(true)}
      >
        Pay with crypto (any chain)
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setRawInput('25');
        }}
      >
        <DialogContent className="border-[#522912]/20 dark:border-amber-500/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Crypto payment</DialogTitle>
            <DialogDescription>
              Pay in USDC on your chosen network. Settlement uses Chainrails; funds go to the configured treasury
              wallet. MBT shown is approximate ({`$${CHAINRAILS_MBT_PRICE_USD}`}/MBT). If the wallet step fails, use only
              one browser wallet extension (e.g. disable MetaMask or Brave Wallet duplicate).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAmountMode('USD')}
                className={cn(
                  'flex-1 rounded-full border-2 py-2 text-sm font-semibold transition-colors',
                  amountMode === 'USD'
                    ? 'border-[#283C09] bg-[#283C09] text-white'
                    : 'border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
                )}
              >
                Amount in USD
              </button>
              <button
                type="button"
                onClick={() => setAmountMode('MBT')}
                className={cn(
                  'flex-1 rounded-full border-2 py-2 text-sm font-semibold transition-colors',
                  amountMode === 'MBT'
                    ? 'border-[#283C09] bg-[#283C09] text-white'
                    : 'border-gray-200 bg-white text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200',
                )}
              >
                Amount in MBT
              </button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cr-amount">{amountMode === 'USD' ? 'Amount (USD)' : 'Amount (MBT)'}</Label>
              <Input
                id="cr-amount"
                inputMode="decimal"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="text-lg font-semibold"
                placeholder={amountMode === 'USD' ? '25.00' : '1.00'}
              />
              <p className="text-xs text-muted-foreground">
                {amountMode === 'USD' ? (
                  <>≈ {mbtEquivalent.toFixed(4)} MBT at ${CHAINRAILS_MBT_PRICE_USD}/MBT</>
                ) : (
                  <>≈ ${amountUsd.toFixed(2)} USD</>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Network</Label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {CHAIN_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelectedChain(opt.id)}
                    className={cn(
                      'rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-colors',
                      selectedChain === opt.id
                        ? 'border-[#283C09] bg-[#283C09]/10 text-[#283C09] dark:border-amber-500 dark:bg-amber-500/10 dark:text-amber-100'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100',
                    )}
                  >
                    {opt.label}
                    <span className="block text-[10px] font-normal text-muted-foreground">{opt.hint}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Settlement token: USDC on the network you select.</p>
            </div>

            {!validRecipient && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                Missing NEXT_PUBLIC_CHAINRAILS_RECIPIENT — add it in Vercel env.
              </p>
            )}
            {validationError && (
              <p className="text-sm text-amber-700 dark:text-amber-400" role="alert">
                {validationError}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#283C09] hover:bg-[#1f2f07] dark:bg-amber-700 dark:hover:bg-amber-600"
              disabled={!validRecipient || Boolean(validationError)}
              onClick={startCheckout}
            >
              Continue to secure checkout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {checkout && validRecipient && (
        <ChainrailsCheckoutHost
          key={`${checkout.amountUsd}-${checkout.chain}`}
          amountUsd={checkout.amountUsd}
          destinationChain={checkout.chain}
          recipient={recipient}
          onSuccess={() => {
            toast.success('Payment completed. MBT allocation follows treasury / ICO rules.');
            endCheckout();
          }}
          onCancel={() => {
            endCheckout();
          }}
        />
      )}
    </>
  );
}
