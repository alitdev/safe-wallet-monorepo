import React, { useCallback } from 'react'

import { useAppSelector, useAppDispatch } from '@/src/store/hooks'
import { selectAppNotificationStatus, toggleAppNotifications } from '@/src/store/notificationsSlice'
import { useDelegateKey } from '@/src/hooks/useDelegateKey'
import { NotificationView } from '@/src/features/Notifications/components/NotificationView'


export const NotificationsContainer = () => {
  const dispatch = useAppDispatch()
  const { deleteDelegate } = useDelegateKey()
  const isAppNotificationEnabled = useAppSelector(selectAppNotificationStatus)

  const handleToggleAppNotifications = useCallback(async () => {
    dispatch(toggleAppNotifications(!isAppNotificationEnabled))
    if (!isAppNotificationEnabled) {
      await deleteDelegate()
    }
  }, [isAppNotificationEnabled])

  return <NotificationView onChange={handleToggleAppNotifications} value={isAppNotificationEnabled} />
}
