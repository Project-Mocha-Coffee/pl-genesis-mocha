import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface AgreementData {
  address: string;
  email: string;
  timestamp: number;
  agreedToTerms: boolean;
  version: string;
}

export function useInvestmentAgreement() {
  const { address, isConnected } = useAccount();
  const [hasAgreed, setHasAgreed] = useState(false);
  const [agreementData, setAgreementData] = useState<AgreementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!address || !isConnected) {
      setHasAgreed(false);
      setAgreementData(null);
      setIsLoading(false);
      return;
    }

    // Check localStorage for existing agreement
    try {
      const stored = localStorage.getItem(`mocha_agreement_${address}`);
      if (stored) {
        const data: AgreementData = JSON.parse(stored);
        
        // Verify the agreement is valid
        if (data.agreedToTerms && data.address === address) {
          setHasAgreed(true);
          setAgreementData(data);
        } else {
          setHasAgreed(false);
          setAgreementData(null);
        }
      } else {
        setHasAgreed(false);
        setAgreementData(null);
      }
    } catch (err) {
      console.error('Error checking agreement status:', err);
      setHasAgreed(false);
      setAgreementData(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  const recordAgreement = (email: string) => {
    if (!address) return;

    const data: AgreementData = {
      address,
      email,
      timestamp: Date.now(),
      agreedToTerms: true,
      version: '1.0',
    };

    localStorage.setItem(`mocha_agreement_${address}`, JSON.stringify(data));
    setHasAgreed(true);
    setAgreementData(data);
  };

  const clearAgreement = () => {
    if (!address) return;
    localStorage.removeItem(`mocha_agreement_${address}`);
    setHasAgreed(false);
    setAgreementData(null);
  };

  return {
    hasAgreed,
    agreementData,
    isLoading,
    recordAgreement,
    clearAgreement,
  };
}

