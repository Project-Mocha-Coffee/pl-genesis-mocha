'use client';

import { useEffect, useMemo } from 'react';
import { PaymentModal, usePaymentSession, chains } from '@chainrails/react';
export type ChainrailsChainId = (typeof chains)[keyof typeof chains];

export interface ChainrailsCheckoutHostProps {
  amountUsd: number;
  destinationChain: ChainrailsChainId;
  recipient: `0x${string}`;
  onSuccess?: (result?: { transactionHash?: string }) => void;
  onCancel?: () => void;
}

/**
 * Official Chainrails UI (@chainrails/react 0.4+): usePaymentSession fetches GET session_url,
 * PaymentModal sets iframe to Chainrails.getPayModalUrl(amount) → https://app.chainrails.io/pay/{cents}.
 * Do not hand-roll /pay/_chain_/… URLs — those routes no longer exist on app.chainrails.io.
 */
export default function ChainrailsCheckoutHost({
  amountUsd,
  destinationChain,
  onSuccess,
  onCancel,
}: ChainrailsCheckoutHostProps) {
  const sessionUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams();
    params.set('amount', String(amountUsd));
    params.set('chain', String(destinationChain));
    return `${window.location.origin}/api/chainrails/create-session?${params.toString()}`;
  }, [amountUsd, destinationChain]);

  const cr = usePaymentSession({
    session_url: sessionUrl,
    onSuccess,
    onCancel,
  });

  useEffect(() => {
    cr.open();
    // cr is stable enough per sessionUrl; including cr would re-run every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- open once when this checkout session mounts
  }, [sessionUrl]);

  return (
    <PaymentModal
      sessionToken={cr.sessionToken ?? null}
      amount={String(amountUsd)}
      open={cr.open}
      close={cr.close}
      isOpen={cr.isOpen}
      isPending={cr.isPending}
      session_url={sessionUrl}
      styles={{ accentColor: '#283C09' }}
      onSuccess={onSuccess}
      onCancel={onCancel}
    />
  );
}
