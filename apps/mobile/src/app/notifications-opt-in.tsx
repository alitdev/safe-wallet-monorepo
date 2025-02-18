import React, { useCallback } from 'react'
import { useColorScheme } from 'react-native'
import { OptIn } from '@/src/components/OptIn'
import useNotifications from '@/src/hooks/useNotifications'
import { router, useFocusEffect } from 'expo-router'
import { useDelegateKey } from '../hooks/useDelegateKey'
import { useAuthGetNonceV1Query } from '@safe-global/store/gateway/AUTO_GENERATED/auth'

function NotificationsOptIn() {
  const { enableNotifications, isAppNotificationEnabled } = useNotifications()
  const { data } = useAuthGetNonceV1Query()
  const { createDelegate } = useDelegateKey()

  const colorScheme = useColorScheme()

  const toggleNotificationsOn = useCallback(async () => {
    enableNotifications()
    await createDelegate(data)
  }, [data])

  useFocusEffect(() => {
    if (isAppNotificationEnabled) {
      router.replace('/(tabs)')
    }
  })

  const image =
    colorScheme === 'dark'
      ? require('@/assets/images/notifications-dark.png')
      : require('@/assets/images/notifications-light.png')

  return (
    <OptIn
      testID="notifications-opt-in"
      title="Stay in the loop with account activity"
      description="Get notified when you receive assets, and when transactions require your action."
      image={image}
      isVisible
      ctaButton={{
        onPress: toggleNotificationsOn,
        label: 'Enable notifications',
      }}
      secondaryButton={{
        onPress: () => router.back(),
        label: 'Maybe later',
      }}
    />
  )
}

export default NotificationsOptIn
