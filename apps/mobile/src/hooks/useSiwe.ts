import { HDNodeWallet, Wallet } from 'ethers'
import { useCallback } from 'react'
import { SiweMessage } from 'siwe'

interface SiweMessageProps {
  address: string
  chainId: number
  nonce: string
  statement: string
}

export function useSiwe() {
  const createSiweMessage = useCallback(({ address, chainId, nonce, statement }: SiweMessageProps) => {
    const message = new SiweMessage({
      address,
      chainId,
      domain: 'global.safe.mobileapp',
      statement,
      nonce,
      uri: 'https://safe.global',
      version: '1',
      issuedAt: new Date().toISOString(),
    })
    return message.prepareMessage()
  }, [])

  const signMessage = useCallback(async ({ signer, message }: { signer: HDNodeWallet | Wallet; message: string }) => {
    const signature = await signer.signMessage(message)
    return signature
  }, [])

  return {
    createSiweMessage,
    signMessage,
  }
}
