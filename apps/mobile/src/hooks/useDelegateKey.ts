import { useState, useCallback } from 'react'
import DeviceInfo from 'react-native-device-info'
import 'react-native-get-random-values'
import { HDNodeWallet, Wallet } from 'ethers'
import { useAuthGetNonceV1Query, useAuthVerifyV1Mutation } from '@safe-global/store/gateway/AUTO_GENERATED/auth'
import {
  useNotificationsDeleteSubscriptionV2Mutation,
  useNotificationsUpsertSubscriptionsV2Mutation,
} from '@safe-global/store/gateway/AUTO_GENERATED/notifications'

import Logger from '@/src/utils/logger'
import { Address } from '@/src/types/address'
import { selectActiveSafe } from '@/src/store/activeSafeSlice'
import { useAppSelector } from '@/src/store/hooks'
import { useSiwe } from './useSiwe'
import { useSign } from './useSign'
import { isAndroid } from '../config/constants'
import { selectFCMToken } from '../store/notificationsSlice'

const ERROR_MSG = 'useDelegateKey: Something went wrong'

export function useDelegateKey() {
  // Local states
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<unknown>(null)

  // Queries
  const [authVerifyV1] = useAuthVerifyV1Mutation()
  const [notificationsUpsertSubscriptionsV2] = useNotificationsUpsertSubscriptionsV2Mutation()
  const [notificationsDeleteSubscriptionsV2] = useNotificationsDeleteSubscriptionV2Mutation()
  // Custom hooks
  const { signMessage } = useSiwe()
  const { getPrivateKey } = useSign()

  // Redux states
  const activeSafe = useAppSelector(selectActiveSafe)
  const fcmToken = useAppSelector(selectFCMToken)

  // Step 0 - Get the nonce to be included in the message to be sent to the backend
  const { data } = useAuthGetNonceV1Query()

  const createDelegate = useCallback(
    async (ownerAddress: Address) => {
      setLoading(true)
      setError(null)
      const nonce = data?.nonce
      // Step 1 - Try to get the owner's private key
      const ownerPrivateKey = await getPrivateKey()

      try {
        if (!ownerAddress || !activeSafe || !nonce || !fcmToken) {
          throw Logger.info(ERROR_MSG)
        }

        // Step 2 - Create a new random (delegated) private key in case the owner's private key is not available
        //TODO: Double check if we have a wallet stored already avoiding to create a new one
        const signerAccount = ownerPrivateKey ? new Wallet(ownerPrivateKey) : Wallet.createRandom()

        if (!signerAccount) {
          throw Logger.error(ERROR_MSG, error)
        }

        // Step 3 - Create a message following the SIWE standard
        const siweMessage = `SafeWallet wants you to sign in with your Ethereum account:
${signerAccount.address}

Sign in with Ethereum to the app.

URI: https://safe.global
Version: 1
Chain ID: ${activeSafe.chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`

        // Step 4 - Triggers the backend to create the delegate
        await createOnBackEnd({
          safeAddress: activeSafe.address,
          signer: signerAccount,
          message: siweMessage,
          chainId: activeSafe.chainId,
          fcmToken,
        })
      } catch (err) {
        Logger.error('useDelegateKey: Something went wrong', err)
        setError(err)
        return
      } finally {
        setLoading(false)
      }
    },
    [data, activeSafe, fcmToken],
  )

  const deleteDelegate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await deleteOnBackEnd()
    } catch (err) {
      Logger.error('useDelegateKey: Something went wrong', err)
      setError(err)
      return
    } finally {
      setLoading(false)
    }
  }, [])

  const createOnBackEnd = useCallback(
    async ({
      safeAddress,
      signer,
      message,
      chainId,
      fcmToken,
    }: {
      safeAddress: Address
      signer: HDNodeWallet | Wallet
      message: string
      chainId: string
      fcmToken: string
    }) => {
      const signature = await signMessage({ signer, message })
      try {
        await authVerifyV1({
          siweDto: {
            message,
            signature,
          },
        })

        const deviceUuid = await DeviceInfo.getUniqueId()

        await notificationsUpsertSubscriptionsV2({
          upsertSubscriptionsDto: {
            cloudMessagingToken: fcmToken,
            safes: [
              {
                chainId,
                address: safeAddress,
                notificationTypes: ['MESSAGE_CONFIRMATION_REQUEST', 'CONFIRMATION_REQUEST'],
              },
            ],
            deviceType: isAndroid ? 'ANDROID' : 'IOS',
            deviceUuid,
          },
        })
      } catch (err) {
        Logger.error('CreateDelegateFailed', err)
        setError(err)
        return
      }
    },
    [],
  )

  const deleteOnBackEnd = useCallback(async () => {
    try {
      await notificationsDeleteSubscriptionsV2({
        deviceUuid: await DeviceInfo.getUniqueId(),
        chainId: activeSafe.chainId,
        safeAddress: activeSafe.address,
      })
    } catch (err) {
      Logger.error('DeleteDelegateFailed', err)
      setError(err)
      return
    }
  }, [])

  return {
    loading,
    error,
    createDelegate,
    deleteDelegate,
  }
}
