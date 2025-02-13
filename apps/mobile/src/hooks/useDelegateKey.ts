import { useState, useCallback } from 'react'
import { Wallet } from 'ethers'

import { AuthNonce } from '@safe-global/store/gateway/AUTO_GENERATED/auth'
import { AddressInfo } from '@safe-global/store/gateway/AUTO_GENERATED/safes'

import Logger from '@/src/utils/logger'
import { Address } from '@/src/types/address'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { useAppDispatch, useAppSelector } from '@/src/store/hooks'
import { useSign } from './useSign'
import { useGTW } from './useGTW'

import { selectFCMToken } from '../store/notificationsSlice'
// import { selectSigners } from '../store/signersSlice'
import { addDelegatedAddress } from '../store/delegatedSlice'
import { useSiwe } from './useSiwe'
import { getSigner } from '../utils/notifications'

const ERROR_MSG = 'useDelegateKey: Something went wrong'

export enum DELEGATED_ACCOUNT_TYPE {
  REGULAR = 'REGULAR',
  OWNER = 'OWNER',
}

export function useDelegateKey(safeOwner?: AddressInfo) {
  // Local states
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<unknown>(null)
  const [delegatedAccountType, setDelegatedAccountType] = useState<DELEGATED_ACCOUNT_TYPE>()

  // Custom hooks
  const { getPrivateKey, storePrivateKey } = useSign()
  const { createDelegatedKeyOnBackEnd, deleteDelegatedKeyOnBackEnd } = useGTW()
  const { createSiweMessage } = useSiwe()
  // Redux
  const dispatch = useAppDispatch()
  const activeSafe = useAppSelector(selectActiveSafe)

  // const appSigners = useAppSelector(selectSigners)
  const fcmToken = useAppSelector(selectFCMToken)

  /**
   * case 2: Starting w/ PK
   * [x] - Select active safe (useAppSelector(selectActiveSafe))
   * [] - fetch signers from Redux slice --> activeSafe filter if its owner are present in one of the signers
   * [x] - fetch PK from keychain using previous address as userId
   * [x] - create a new delegate PK (customRandom)
   * [x] - create a SiWE message, sign and call authVerifyV1 with owner's account
   * [x] - authorize the delegator PK through /v1/{chains}/{chainId}/delegates call.
   * [x] - this will enable full access (outgoing/income/queue) notifications
   * [x] - create a new redux structure for store the delegatedSigner object
   */
  // selectSafeInfo filtered by activeSafe owners

  // Step 0 - Get the nonce to be included in the message to be sent to the backend
  const createDelegate = useCallback(async (data: AuthNonce | undefined) => {
    setLoading(true)
    setError(null)

    const nonce = data?.nonce

    if (!activeSafe || !fcmToken || !nonce) {
      throw Logger.info(ERROR_MSG)
    }

    try {
      // Step 1 - Try to get the safe owner's private key from keychain
      const safeOwnerPK = safeOwner && (await getPrivateKey(safeOwner.value))

      const delegatedAccType = safeOwnerPK ? DELEGATED_ACCOUNT_TYPE.OWNER : DELEGATED_ACCOUNT_TYPE.REGULAR
      setDelegatedAccountType(delegatedAccType)

      // Step 2 - Create a new random (delegated) private key
      const randomDelegatedAccount = Wallet.createRandom()

      if (!randomDelegatedAccount) {
        throw Logger.error(ERROR_MSG, error)
      }

      // Step 2.1 - Store the delegated account in the redux store
      dispatch(
        addDelegatedAddress({ delegatedAddress: randomDelegatedAccount.address as Address, safes: [activeSafe] }),
      )

      // Step 2.2 - Store it in the keychain
      storePrivateKey(randomDelegatedAccount.address, randomDelegatedAccount.privateKey)

      // Step 2.3 - Define the signer account
      const signerAccount = getSigner(safeOwnerPK, randomDelegatedAccount)

      // Step 3 - Create a message following the SIWE standard
      const siweMessage = createSiweMessage({
        address: signerAccount.address,
        chainId: Number(activeSafe.chainId),
        nonce,
        statement: 'SafeWallet wants you to sign in with your Ethereum account',
      })

      // Step 4 - Triggers the backend to create the delegate
      await createDelegatedKeyOnBackEnd({
        safeAddress: activeSafe.address,
        signer: signerAccount,
        message: siweMessage,
        chainId: activeSafe.chainId,
        fcmToken,
        delegatedAccount: randomDelegatedAccount,
        delegatedAccountType: delegatedAccType,
      })
    } catch (err) {
      Logger.error('useDelegateKey: Something went wrong', err)
      setError(err)
      return
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteDelegate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await deleteDelegatedKeyOnBackEnd(activeSafe)
    } catch (err) {
      Logger.error('useDelegateKey: Something went wrong', err)
      setError(err)
      return
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    createDelegate,
    deleteDelegate,
    delegatedAccountType,
  }
}
