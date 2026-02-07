import { useState } from 'react'
import { useMutation } from 'react-relay'
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
import { CreateAccountMutation } from '@/graphql/CreateAccountMutation'
import type { CreateAccountMutation as CreateAccountMutationType } from '@/graphql/__generated__/CreateAccountMutation.graphql'
import { parseGraphqlError, violationsToFieldErrors } from '@/lib/errors/graphql'
import { validateAccountForm } from '@/lib/validation/account'

interface CreateAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CreateAccountDialog({ open, onOpenChange, onSuccess }: CreateAccountDialogProps) {
  const [ownerName, setOwnerName] = useState('')
  const [document, setDocument] = useState('')
  const [branch, setBranch] = useState('')
  const [number, setNumber] = useState('')
  const [initialBalance, setInitialBalance] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [commitCreate, isLoading] = useMutation<CreateAccountMutationType>(CreateAccountMutation)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validation = validateAccountForm({
      ownerName,
      document,
      branch,
      number,
      initialBalance,
    })

    if (Object.keys(validation.errors).length > 0) {
      setErrors(validation.errors)
      toast.error('Please review the highlighted fields.')
      return
    }

    commitCreate({
      variables: {
        input: {
          ownerName: validation.values.ownerName,
          document: validation.values.document,
          branch: validation.values.branch,
          number: validation.values.number,
          initialBalance: validation.values.initialBalance || '0',
        },
      },
      onCompleted() {
        setErrors({})
        toast.success('Account created successfully')
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
    })
  }

  function resetForm() {
    setOwnerName('')
    setDocument('')
    setBranch('')
    setNumber('')
    setInitialBalance('')
    setErrors({})
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Account</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new bank account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ownerName">Owner Name</Label>
            <Input
              id="ownerName"
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value)
                setErrors((prev) => ({ ...prev, ownerName: '' }))
              }}
              placeholder="John Doe"
              required
            />
            {errors.ownerName && <p className="text-sm text-destructive">{errors.ownerName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="document">Document (CPF/CNPJ)</Label>
            <Input
              id="document"
              value={document}
              onChange={(e) => {
                setDocument(e.target.value)
                setErrors((prev) => ({ ...prev, document: '' }))
              }}
              placeholder="123.456.789-00"
              required
            />
            {errors.document && <p className="text-sm text-destructive">{errors.document}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="branch">Branch</Label>
              <Input
                id="branch"
                value={branch}
                onChange={(e) => {
                  setBranch(e.target.value)
                  setErrors((prev) => ({ ...prev, branch: '' }))
                }}
                placeholder="0001"
                required
              />
              {errors.branch && <p className="text-sm text-destructive">{errors.branch}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="number">Account Number</Label>
              <Input
                id="number"
                value={number}
                onChange={(e) => {
                  setNumber(e.target.value)
                  setErrors((prev) => ({ ...prev, number: '' }))
                }}
                placeholder="12345-6"
                required
              />
              {errors.number && <p className="text-sm text-destructive">{errors.number}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialBalance">Initial Balance (R$)</Label>
            <Input
              id="initialBalance"
              type="number"
              step="0.01"
              min="0"
              value={initialBalance}
              onChange={(e) => {
                setInitialBalance(e.target.value)
                setErrors((prev) => ({ ...prev, initialBalance: '' }))
              }}
              placeholder="0.00"
            />
            {errors.initialBalance && <p className="text-sm text-destructive">{errors.initialBalance}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
