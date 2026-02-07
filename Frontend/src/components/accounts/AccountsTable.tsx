import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useMutation } from 'react-relay'
import { MoreHorizontal, Pencil, Trash2, ArrowLeftRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatCurrency } from '@/lib/currency'
import { parseGraphqlError } from '@/lib/errors/graphql'
import { EditAccountDialog } from './EditAccountDialog'
import { DeactivateAccountMutation } from '@/graphql/DeactivateAccountMutation'
import type { DeactivateAccountMutation as DeactivateAccountMutationType } from '@/graphql/__generated__/DeactivateAccountMutation.graphql'

interface AccountNode {
  id: string
  ownerName: string
  document: string
  branch: string
  number: string
  currency: string
  currentBalance: string
  status: string
  createdAt: string
  updatedAt: string
}

interface AccountsTableProps {
  accounts: AccountNode[]
  hasNextPage: boolean
  onLoadMore: () => void
  isLoadingMore: boolean
  onRefresh?: () => void
}

function maskDocument(doc: string): string {
  if (doc.length <= 6) return doc
  return doc.slice(0, 3) + '***' + doc.slice(-2)
}

export function AccountsTable({
  accounts,
  hasNextPage,
  onLoadMore,
  isLoadingMore,
  onRefresh,
}: AccountsTableProps) {
  const navigate = useNavigate()
  const [editAccount, setEditAccount] = useState<AccountNode | null>(null)
  const [commitDeactivate] = useMutation<DeactivateAccountMutationType>(DeactivateAccountMutation)

  function handleDeactivate(account: AccountNode) {
    if (!confirm(`Are you sure you want to deactivate account ${account.number}?`)) return

    commitDeactivate({
      variables: { input: { id: account.id } },
      onCompleted() {
        toast.success('Account deactivated successfully')
        onRefresh?.()
      },
      onError(err) {
        toast.error(parseGraphqlError(err).userMessage)
      },
    })
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Owner</TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Branch</TableHead>
            <TableHead>Number</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => (
            <TableRow key={account.id}>
              <TableCell className="font-medium">{account.ownerName}</TableCell>
              <TableCell className="text-muted-foreground">
                {maskDocument(account.document)}
              </TableCell>
              <TableCell>{account.branch}</TableCell>
              <TableCell>{account.number}</TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(account.currentBalance)}
              </TableCell>
              <TableCell>
                <Badge variant={account.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {account.status}
                </Badge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditAccount(account)}>
                      <Pencil className="mr-2 size-4" />
                      Edit
                    </DropdownMenuItem>
                    {account.status === 'ACTIVE' && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeactivate(account)}
                      >
                        <Trash2 className="mr-2 size-4" />
                        Deactivate
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => navigate(`/transactions?accountId=${account.id}`)}
                    >
                      <ArrowLeftRight className="mr-2 size-4" />
                      View Transactions
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      <EditAccountDialog
        open={!!editAccount}
        onOpenChange={(open) => !open && setEditAccount(null)}
        account={editAccount}
        onSuccess={onRefresh}
      />
    </>
  )
}
