import React, { useCallback, useEffect, useRef } from 'react'
import { AppState, Switch } from 'react-native'
import { View, Text } from 'tamagui'
import { useAppDispatch } from '@/src/store/hooks'
import { SafeListItem } from '@/src/components/SafeListItem'
import NotificationsService from '@/src/services/notifications/NotificationService'
import { toggleAppNotifications } from '@/src/store/notificationsSlice'
import { useDelegateKey } from '@/src/hooks/useDelegateKey'
import useNotifications from '@/src/hooks/useNotifications'
import { useAuthGetNonceV1Query } from '@safe-global/store/gateway/AUTO_GENERATED/auth'

export const NotificationsContainer = () => {
  const dispatch = useAppDispatch()
  const { enableNotifications, isAppNotificationEnabled } = useNotifications()
  const { data } = useAuthGetNonceV1Query()
  const { createDelegate, deleteDelegate, error } = useDelegateKey()
  const appState = useRef(AppState.currentState)

  const handleToggleAppNotifications = useCallback(async () => {
    const deviceNotificationStatus = await NotificationsService.isDeviceNotificationEnabled()

    if (!deviceNotificationStatus && !isAppNotificationEnabled) {
      await NotificationsService.requestPushNotificationsPermission()
    } else if (deviceNotificationStatus && !isAppNotificationEnabled) {
      enableNotifications()
      await createDelegate(data)
    } else {
      await deleteDelegate()
      if (!error) {
        dispatch(toggleAppNotifications(!isAppNotificationEnabled))
      }
    }
  }, [isAppNotificationEnabled])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const deviceNotificationStatus = await NotificationsService.isDeviceNotificationEnabled()
        if (deviceNotificationStatus && !isAppNotificationEnabled) {
          enableNotifications()
          await createDelegate(data)
        }
      }

      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
    }
  }, [isAppNotificationEnabled])

  return (
    <View paddingHorizontal="$4" marginTop="$2" style={{ flex: 1 }}>
      <Text fontSize="$8" fontWeight={600} marginBottom="$2">
        Notifications
      </Text>
      <Text marginBottom="$4">
        Stay up-to-date and get notified about activities in your account, based on your needs.
      </Text>
      <SafeListItem
        label={'Allow notifications'}
        rightNode={
          <Switch
            testID="toggle-app-notifications"
            onChange={handleToggleAppNotifications}
            value={isAppNotificationEnabled}
            trackColor={{ true: '$primary' }}
          />
        }
      />
    </View>
  )
}
