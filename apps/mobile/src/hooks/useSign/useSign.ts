import DeviceCrypto from 'react-native-device-crypto'
import * as Keychain from 'react-native-keychain'
import DeviceInfo from 'react-native-device-info'
import { Wallet } from 'ethers'
import { asymmetricKey, keychainGenericPassword } from '@/src/store/constants'

export function useSign() {
  // TODO: move it to a global context or reduce
  const storePrivateKey = async (privateKey: string) => {
    try {
      const isEmulator = await DeviceInfo.isEmulator()

      await DeviceCrypto.getOrCreateAsymmetricKey(asymmetricKey, {
        accessLevel: isEmulator ? 1 : 2,
        invalidateOnNewBiometry: true,
      })

      const encryptedPrivateKey = await DeviceCrypto.encrypt(asymmetricKey, privateKey, {
        biometryTitle: 'Authenticate',
        biometrySubTitle: 'Saving key',
        biometryDescription: 'Please authenticate yourself',
      })

      await Keychain.setGenericPassword(
        keychainGenericPassword,
        JSON.stringify({
          encryptedPassword: encryptedPrivateKey.encryptedText,
          iv: encryptedPrivateKey.iv,
        }),
      )
    } catch (err) {
      console.log(err)
    }
  }

  const getPrivateKey = async () => {
    try {
      const user = await Keychain.getGenericPassword()

      if (!user) {
        throw 'user password not found'
      }

      const { encryptedPassword, iv } = JSON.parse(user.password)
      const decryptedKey = await DeviceCrypto.decrypt(asymmetricKey, encryptedPassword, iv, {
        biometryTitle: 'Authenticate',
        biometrySubTitle: 'Signing',
        biometryDescription: 'Authenticate yourself to sign the text',
      })

      return decryptedKey
    } catch (err) {
      console.log(err)
    }
  }

  const createMnemonicAccount = async (mnemonic: string) => {
    try {
      if (!mnemonic) {
        return
      }

      return Wallet.fromPhrase(mnemonic)
    } catch (err) {
      console.log(err)
    }
  }

  return {
    storePrivateKey,
    getPrivateKey,
    createMnemonicAccount,
  }
}
