import { Suspense, useState } from 'react'
import { useLazyLoadQuery } from 'react-relay'
import { CreateAccountDialog } from '@/components/accounts/CreateAccountDialog'
import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { QuickActions } from '@/components/dashboard/QuickActions'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { Skeleton } from '@/components/ui/skeleton'
import { TransferDialog } from '@/components/transactions/TransferDialog'
import { DashboardQuery } from '@/graphql/DashboardQuery'
import type { DashboardQuery as DashboardQueryType } from '@/graphql/__generated__/DashboardQuery.graphql'

function DashboardContent() {
  const [transferOpen, setTransferOpen] = useState(false)
  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const data = useLazyLoadQuery<DashboardQueryType>(
    DashboardQuery,
    {},
    { fetchPolicy: 'store-and-network', fetchKey: refreshKey },
  )

  const accounts = data.accounts.edges.map((edge) => edge.node)
  const totalBalance = accounts.reduce(
    (sum, account) => sum + parseFloat(account.currentBalance),
    0,
  )
  const firstAccountId = accounts.length > 0 ? accounts[0].id : null
  const ownerName = accounts.length > 0 ? accounts[0].ownerName : 'All Accounts'

  return (
    <div className="space-y-6">
      <BalanceCard
        totalBalance={totalBalance}
        ownerName={ownerName}
        accountCount={accounts.length}
      />

      <QuickActions
        onTransferClick={() => setTransferOpen(true)}
        onNewAccountClick={() => setCreateAccountOpen(true)}
      />

      {firstAccountId && <RecentTransactions accountId={firstAccountId} />}

      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} onSuccess={() => setRefreshKey((k) => k + 1)} />
      <CreateAccountDialog
        open={createAccountOpen}
        onOpenChange={setCreateAccountOpen}
        onSuccess={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
