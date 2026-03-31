// Hook to get network-aware contract addresses
import { useChainId } from 'wagmi'
import { getContractAddresses, getICOAddress, type ContractAddresses } from '@/lib/config'

export function useContractAddresses(): ContractAddresses & { icoAddress: string } {
  const chainId = useChainId()
  const addresses = getContractAddresses(chainId)
  const icoAddress = getICOAddress(chainId)
  
  return {
    ...addresses,
    icoAddress,
  }
}
