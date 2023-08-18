import { useContext } from 'react'
import { Paper, Grid, Typography, Box, Button, Skeleton } from '@mui/material'
import { NoSpendingLimits } from '@/components/settings/SpendingLimits/NoSpendingLimits'
import { SpendingLimitsTable } from '@/components/settings/SpendingLimits/SpendingLimitsTable'
import { FEATURES } from '@/utils/chains'
import { useHasFeature } from '@/hooks/useChains'
import NewSpendingLimitFlow from '@/components/tx-flow/flows/NewSpendingLimit'
import { SETTINGS_EVENTS } from '@/services/analytics'
import CheckWallet from '@/components/common/CheckWallet'
import Track from '@/components/common/Track'
import { TxModalContext } from '@/components/tx-flow'
import useAllSpendingLimits from '@/hooks/useSpendingLimits'

const SpendingLimits = () => {
  const { setTxFlow } = useContext(TxModalContext)
  const [spendingLimits, , spendingLimitsLoading] = useAllSpendingLimits()
  const isEnabled = useHasFeature(FEATURES.SPENDING_LIMIT)

  return (
    <Paper sx={{ padding: 4 }}>
      <Grid container direction="row" justifyContent="space-between" spacing={3} mb={2}>
        <Grid item lg={4} xs={12}>
          <Typography variant="h4" fontWeight={700}>
            Spending limits
          </Typography>
        </Grid>

        <Grid item xs>
          {isEnabled ? (
            <Box>
              <Typography>
                You can set rules for specific beneficiaries to access funds from this Safe Account without having to
                collect all signatures.
              </Typography>

              <CheckWallet>
                {(isOk) => (
                  <Track {...SETTINGS_EVENTS.SPENDING_LIMIT.NEW_LIMIT}>
                    <Button
                      onClick={() => setTxFlow(<NewSpendingLimitFlow />)}
                      sx={{ mt: 2 }}
                      variant="contained"
                      disabled={!isOk}
                    >
                      New spending limit
                    </Button>
                  </Track>
                )}
              </CheckWallet>

              {!spendingLimits?.length && !spendingLimitsLoading && <NoSpendingLimits />}
            </Box>
          ) : (
            <Typography>The spending limit module is not yet available on this chain.</Typography>
          )}
        </Grid>
      </Grid>
      {spendingLimits ? (
        <SpendingLimitsTable isLoading={spendingLimitsLoading} spendingLimits={spendingLimits} />
      ) : (
        spendingLimitsLoading && (
          <Box>
            <Skeleton height="4em" />
            <Skeleton height="4em" />
          </Box>
        )
      )}
    </Paper>
  )
}

export default SpendingLimits
