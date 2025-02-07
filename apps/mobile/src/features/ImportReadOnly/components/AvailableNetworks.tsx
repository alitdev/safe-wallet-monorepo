import { SafeOverview } from '@safe-global/store/gateway/AUTO_GENERATED/safes'
import { Text, XStack, YStack } from 'tamagui'
import { NetworkBadgeContainer } from '@/src/features/ImportReadOnly/NetworkBadge.container'
import React from 'react'

export const AvailableNetworks = ({ networks }: { networks: SafeOverview[] }) => {
  return (
    <YStack marginTop={'$5'} gap={'$1'}>
      <Text fontWeight={'600'}>Available on networks:</Text>
      <XStack gap={'$1'} marginTop={'$3'}>
        {networks?.map((safe) => <NetworkBadgeContainer key={safe.chainId} chainId={safe.chainId} />)}
      </XStack>
    </YStack>
  )
}
