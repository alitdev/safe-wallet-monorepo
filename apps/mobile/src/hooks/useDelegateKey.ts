import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { useAuthGetNonceV1Query, useAuthVerifyV1Mutation } from '@safe-global/store/gateway/AUTO_GENERATED/auth'
import {
  useDelegatesGetDelegatesV2Query,
  useDelegatesPostDelegateV2Mutation,
} from '@safe-global/store/gateway/AUTO_GENERATED/delegates'

import Logger from '@/src/utils/logger'
import { Address } from '@/src/types/address'
import { useSign } from './useSign'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { useAppSelector } from '@/src/store/hooks'
import { useSiwe } from './useSiwe'

const ERROR_MSG = 'useDelegateKey: Something went wrong'

export function useDelegateKey() {
  // Local states
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  // Redux states
  const activeSafe = useAppSelector(selectActiveSafe)

  // Hook calls
  const { getPrivateKey } = useSign()

  // Step 0 - Get the nonce to be included in the message to be sent to the backend
  const { data } = useAuthGetNonceV1Query()

  const createDelegate = useCallback(async (ownerAddress: Address) => {
    setLoading(true)
    setError(null)

    try {
      if (!ownerAddress || !activeSafe) {
        throw Logger.info(ERROR_MSG)
      }
      // Step 1 - Get the private key of the owner/signer
      const privateKey = await getPrivateKey()

      if (!privateKey) {
        throw Logger.error(ERROR_MSG, error)
      }
      // Step 2 - Create a new random delegate private key
      const delegatePrivateKey = ethers.Wallet.createRandom()

      if (!delegatePrivateKey) {
        throw Logger.error(ERROR_MSG, error)
      }

      // Step 3 - Create a message following the SIWE standard
      const siweMessage = {
        address: ownerAddress,
        chainId: Number(activeSafe.chainId),
        domain: 'global.safe.mobileapp',
        statement: 'Sign in with Ethereum to the app.',
        nonce: data?.nonce,
        uri: 'rnsiwe://', //TODO: Update this
        version: '1',
        issuedAt: new Date().toISOString(),
      }

      // Step 4 - Triggers the backend to create the delegate
      await createOnBackEnd({
        safeAddress: activeSafe.address,
        signer: ownerAddress,
        delegatedAccount: delegatePrivateKey,
        message: siweMessage,
        chainId: activeSafe.chainId,
      })
    } catch (err) {
      throw Logger.error('useDelegateKey: Something went wrong', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteDelegate = useCallback(async () => {
    setLoading(true)
    setError(null)
  }, [])

  const createOnBackEnd = async ({
    safeAddress,
    signer,
    delegatedAccount,
    message,
    chainId,
  }: {
    safeAddress: Address
    signer: Address
    delegatedAccount: ethers.HDNodeWallet
    message: object
    chainId: string
  }) => {
    const [authVerifyV1] = useAuthVerifyV1Mutation()
    const { signMessage } = useSiwe()

    const signature = await signMessage({ signer: delegatedAccount, message: message.toString() })

    // Step 5 - calls /v1/auth/verify to verify the signature
    try {
      const response = await authVerifyV1({
        siweDto: {
          message: message.toString(),
          signature,
        },
      })

      console.log({ response })

      // Step 6 - calls /v2/delegates
      const [delegatesPostDelegateV2] = useDelegatesPostDelegateV2Mutation()
      const { data: delegateData, error: delegateError } = await delegatesPostDelegateV2({
        chainId,
        createDelegateDto: {
          safe: safeAddress,
          delegate: delegatedAccount.address,
          delegator: signer,
          signature,
          label: 'Delegate',
        },
      })

      console.log({ delegateData, delegateError })

      const { data, error, isFetching } = useDelegatesGetDelegatesV2Query({
        safe: safeAddress,
        delegate: signer,
        chainId,
      })

      console.log({ data, error, isFetching })
      // Step 7 - calls /v2/register/notifications
    } catch (err) {
      throw Logger.error('CreateDelegateFailed', err)
    }
  }

  // const deleteOnBackEnd = async (delegateAddress: Address, signature: string) => {}

  return {
    loading,
    error,
    createDelegate,
    deleteDelegate,
  }
}
