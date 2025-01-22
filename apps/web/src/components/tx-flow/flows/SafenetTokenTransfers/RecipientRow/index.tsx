import AddressBookInput from '@/components/common/AddressBookInput'
import TokenAmountInput from '@/components/common/TokenAmountInput'
import { useVisibleBalances } from '@/hooks/useVisibleBalances'
import DeleteIcon from '@/public/images/common/delete.svg'
import { FormControl, Grid, IconButton, SvgIcon, Typography } from '@mui/material'
import { useFormContext } from 'react-hook-form'
import type { TokenTransfersParams } from '..'
import { TokenTransfersFields } from '..'
import { useTokenAmount } from '../utils'

export const RecipientRow = ({
  index,
  groupName,
  removable = true,
  remove,
}: {
  index: number
  removable?: boolean
  groupName: string
  remove?: (index: number) => void
}) => {
  const { balances } = useVisibleBalances()

  const fieldName = `${groupName}.${index}`
  const {
    watch,
    formState: { errors },
  } = useFormContext<TokenTransfersParams>()

  const recipient = watch(TokenTransfersFields.recipients)

  const selectedToken = balances.items.find((item) => item.tokenInfo.address === recipient[index].tokenAddress)
  const { maxAmount } = useTokenAmount(selectedToken)

  const isAddressValid = !!recipient && !errors[TokenTransfersFields.recipients]?.[index]?.recipient

  return (
    <>
      <Grid
        container
        xs={12}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography
          variant="body1"
          sx={{
            mb: 2,
            fontWeight: 'bold',
          }}
        >
          {`Recipient ${index > 0 ? index + 1 : ''}`}
        </Typography>
        {removable && (
          <>
            <IconButton
              data-testid="remove-recipient-btn"
              onClick={() => remove?.(index)}
              aria-label="Remove recipient"
            >
              <SvgIcon component={DeleteIcon} inheritViewBox />
            </IconButton>
          </>
        )}
      </Grid>

      <FormControl fullWidth sx={{ mt: 1 }}>
        <AddressBookInput name={`${fieldName}.recipient`} canAdd={isAddressValid} />
      </FormControl>

      <FormControl fullWidth sx={{ mt: 1 }}>
        <TokenAmountInput
          balances={balances.items}
          selectedToken={selectedToken}
          maxAmount={maxAmount}
          groupName={fieldName}
        />
      </FormControl>
    </>
  )
}

export default RecipientRow
