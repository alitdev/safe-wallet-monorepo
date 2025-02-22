import { useContext, useEffect, useState, type ReactElement } from 'react'
import classnames from 'classnames'

import Header from '@/components/common/Header'
import css from './styles.module.css'
import SafeLoadingError from '../SafeLoadingError'
import Footer from '../Footer'
import SideDrawer from './SideDrawer'
import { useIsSidebarRoute } from '@/hooks/useIsSidebarRoute'
import { TxModalContext } from '@/components/tx-flow'
import BatchSidebar from '@/components/batch/BatchSidebar'
import { Alert, AlertTitle, Typography } from '@mui/material'
import { DisableWrapper } from '@/components/wrappers/DisableWrapper'

const PageLayout = ({ pathname, children }: { pathname: string; children: ReactElement }): ReactElement => {
  const [isSidebarRoute, isAnimated] = useIsSidebarRoute(pathname)
  const [isSidebarOpen, setSidebarOpen] = useState<boolean>(true)
  const [isBatchOpen, setBatchOpen] = useState<boolean>(false)
  const { setFullWidth } = useContext(TxModalContext)

  useEffect(() => {
    setFullWidth(!isSidebarOpen)
  }, [isSidebarOpen, setFullWidth])

  return (
    <>
      <header className={css.header}>
        <Header onMenuToggle={isSidebarRoute ? setSidebarOpen : undefined} onBatchToggle={setBatchOpen} />
      </header>

      {isSidebarRoute && <SideDrawer isOpen={isSidebarOpen} onToggle={setSidebarOpen} />}

      <div
        className={classnames(css.main, {
          [css.mainNoSidebar]: !isSidebarOpen || !isSidebarRoute,
          [css.mainAnimated]: isSidebarRoute && isAnimated,
        })}
      >
        <div className={css.content}>
          <DisableWrapper
            message={
              <Alert severity="info" style={{ margin: 20 }}>
                <AlertTitle>
                  <Typography>Warning!</Typography>
                </AlertTitle>
                Safe{'{'}Wallet{'}'} is working on a phased system restoration. Users now have access to Safe Accounts
                in read-only. You can use the Safe CLI to transact with your Safe Account onchain.
              </Alert>
            }
          >
            {null}
          </DisableWrapper>

          <SafeLoadingError>{children}</SafeLoadingError>
        </div>

        <BatchSidebar isOpen={isBatchOpen} onToggle={setBatchOpen} />

        <Footer />
      </div>
    </>
  )
}

export default PageLayout
