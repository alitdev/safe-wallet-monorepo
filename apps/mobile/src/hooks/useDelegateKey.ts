import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import DeviceCrypto from 'react-native-device-crypto'
import * as Keychain from 'react-native-keychain'

import Logger from '../utils/logger'
import { Address } from '@/src/types/address'
import GatewayService from '../services/gateway/GatewayService'
import { useSign } from './useSign'
import { asymmetricKey, keychainGenericPassword } from '@/src/store/constants'

export function useDelegateKey() {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const { getPrivateKey, createMnemonicAccount } = useSign()

  const createDelegate = useCallback(async (ownerAddress: Address) => {
    setLoading(true)
    setError(null)

    try {
      if (!ownerAddress) {
        throw Logger.info('OwnerKeyNotFoundForDelegate')
      }

      // Step 0: Get users private key from keychain. TODO: need to pass ownerAddress to getPrivateKey
      const privateKey = await getPrivateKey()

      if (!privateKey) {
        throw Logger.error('useDelegateKey: Something went wrong', error)
      }

      // Step 1: Generate delegate key
      const delegateMnemonic = ethers.Wallet.createRandom().mnemonic?.phrase

      if (!delegateMnemonic) {
        throw Logger.error('useDelegateKey: Something went wrong', error)
      }

      const delegatedAccount = await createMnemonicAccount(delegateMnemonic)

      if (!delegatedAccount) {
        throw Logger.error('useDelegateKey: Something went wrong', error)
      }

      // Step 2: Generate message to sign
      const time = Math.floor(Date.now() / 3600000).toString()
      const messageToSign = delegatedAccount.address + time
      const hashToSign = ethers.hashMessage(messageToSign)

      // Step 3: Sign message
      const signature = await signMessage({
        signer: delegatedAccount,
        message: hashToSign,
      })

      // Step 4: Send to backend
      await createOnBackEnd(ownerAddress, delegatedAccount, signature)

      // Step 5: Store delegate key in keychain
      const encryptedDelegateKey = await DeviceCrypto.encrypt(asymmetricKey, delegatedAccount.privateKey, {
        biometryTitle: 'Authenticate',
        biometrySubTitle: 'Saving delegated key',
        biometryDescription: 'Please authenticate yourself',
      })

      await Keychain.setGenericPassword(
        keychainGenericPassword,
        JSON.stringify({
          encryptedPassword: encryptedDelegateKey.encryptedText,
          iv: encryptedDelegateKey.iv,
        }),
      )
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

  const signMessage = useCallback(async ({ signer, message }: { signer: ethers.HDNodeWallet; message: string }) => {
    const signature = await signer.signMessage(message)
    return signature
  }, [])

  const createOnBackEnd = async (ownerAddress: Address, delegatedAccount: ethers.HDNodeWallet, signature: string) => {
    console.log({ createOnBackEnd: delegatedAccount, signature })
    // TODO 1: call backend endpoints to create delegate into database
    // TODO 2: check if we need to loop through all chains and create delegate for each chain
    // Chain.all.forEach(async (chain) => {
    try {
      await GatewayService.createDelegate({
        delegatorAddress: ownerAddress,
        delegatedAddress: delegatedAccount.address,
        signature,
        description: 'iOS Device Delegate',
        chainId: 'chain.id', //TODO: need to pass chainId
      })
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
