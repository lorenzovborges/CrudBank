import { useState, Suspense } from 'react'
import { useLazyLoadQuery, useMutation } from 'react-relay'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/currency'
import { DashboardQuery } from '@/graphql/DashboardQuery'
import { TransferFundsMutation } from '@/graphql/TransferFundsMutation'
import type { DashboardQuery as DashboardQueryType } from '@/graphql/__generated__/DashboardQuery.graphql'
import type { TransferFundsMutation as TransferFundsMutationType } from '@/graphql/__generated__/TransferFundsMutation.graphql'
import { parseGraphqlError, violationsToFieldErrors } from '@/lib/errors/graphql'
import { validateTransferForm } from '@/lib/validation/transfer'

interface TransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function TransferForm({ onOpenChange, onSuccess }: { onOpenChange: (open: boolean) => void; onSuccess?: () => void }) {
  const data = useLazyLoadQuery<DashboardQueryType>(
    DashboardQuery,
    {},
    { fetchPolicy: 'store-or-network' }
  )

  const accounts = data.accounts.edges.map((e) => e.node)
  const [fromAccountId, setFromAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [commitTransfer, isLoading] = useMutation<TransferFundsMutationType>(TransferFundsMutation)

  const selectedAccount = accounts.find((a) => a.id === fromAccountId)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validateTransferForm({
      fromAccountId,
      toAccountId,
      amount,
      description,
    })
    if (Object.keys(validation.errors).length > 0) {
      setErrors(validation.errors)
      toast.error('Please review the highlighted fields.')
      return
    }

    commitTransfer({
      variables: {
        input: {
          fromAccountId: validation.values.fromAccountId,
          toAccountId: validation.values.toAccountId,
          amount: validation.values.amount,
          description: validation.values.description || undefined,
          idempotencyKey: crypto.randomUUID(),
        },
      },
      onCompleted(response) {
        setErrors({})
        const payload = response.transferFunds
        if (payload.idempotentReplay) {
          toast.info('This transfer was already processed')
        } else {
          toast.success('Transfer completed successfully')
        }
        onOpenChange(false)
        resetForm()
        onSuccess?.()
      },
      onError(err) {
        const parsed = parseGraphqlError(err)
        if (parsed.violations.length > 0) {
          setErrors((prev) => ({ ...prev, ...violationsToFieldErrors(parsed.violations) }))
        }
        toast.error(parsed.userMessage)
      },
      updater(store) {
        // Update balances in Relay store
        const payload = store.getRootField('transferFunds')
        if (!payload) return

        const fromBalance = payload.getValue('fromAccountBalance')
        const toBalance = payload.getValue('toAccountBalance')
        const txRecord = payload.getLinkedRecord('transaction')
        if (!txRecord) return

        const fromId = txRecord.getValue('fromAccountId') as string
        const toId = txRecord.getValue('toAccountId') as string

        const fromAccount = store.get(fromId)
        if (fromAccount && fromBalance != null) {
          fromAccount.setValue(fromBalance, 'currentBalance')
        }

        const toAccount = store.get(toId)
        if (toAccount && toBalance != null) {
          toAccount.setValue(toBalance, 'currentBalance')
        }
      },
    })
  }

  function resetForm() {
    setFromAccountId('')
    setToAccountId('')
    setAmount('')
    setDescription('')
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>From Account</Label>
        <Select
          value={fromAccountId}
          onValueChange={(value) => {
            setFromAccountId(value)
            if (toAccountId === value) {
              setToAccountId('')
            }
            setErrors((prev) => ({ ...prev, fromAccountId: '', toAccountId: '' }))
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select source account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.ownerName} - {a.branch}/{a.number} ({formatCurrency(a.currentBalance)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.fromAccountId && <p className="text-sm text-destructive">{errors.fromAccountId}</p>}
        {selectedAccount && (
          <p className="text-sm text-muted-foreground">
            Available: {formatCurrency(selectedAccount.currentBalance)}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>To Account</Label>
        <Select
          value={toAccountId}
          onValueChange={(value) => {
            setToAccountId(value)
            setErrors((prev) => ({ ...prev, toAccountId: '' }))
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select destination account" />
          </SelectTrigger>
          <SelectContent>
            {accounts
              .filter((a) => a.id !== fromAccountId)
              .map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.ownerName} - {a.branch}/{a.number}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {errors.toAccountId && <p className="text-sm text-destructive">{errors.toAccountId}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="transferAmount">Amount (R$)</Label>
        <Input
          id="transferAmount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setErrors((prev) => ({ ...prev, amount: '' }))
          }}
          placeholder="0.00"
          required
        />
        {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="transferDescription">Description (optional)</Label>
        <Textarea
          id="transferDescription"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setErrors((prev) => ({ ...prev, description: '' }))
          }}
          placeholder="Transfer description..."
          rows={2}
        />
        {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Transferring...' : 'Transfer'}
        </Button>
      </DialogFooter>
    </form>
  )
}

function TransferFormSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function TransferDialog({ open, onOpenChange, onSuccess }: TransferDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Money</DialogTitle>
          <DialogDescription>
            Send money between your accounts.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <Suspense fallback={<TransferFormSkeleton />}>
            <TransferForm onOpenChange={onOpenChange} onSuccess={onSuccess} />
          </Suspense>
        )}
      </DialogContent>
    </Dialog>
  )
}
