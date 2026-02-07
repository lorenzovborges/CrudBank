import { useState, useEffect } from 'react'
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
import { UpdateAccountMutation } from '@/graphql/UpdateAccountMutation'
import type { UpdateAccountMutation as UpdateAccountMutationType } from '@/graphql/__generated__/UpdateAccountMutation.graphql'
import { parseGraphqlError, violationsToFieldErrors } from '@/lib/errors/graphql'
import { isValidBrazilDocument, normalizeDocument } from '@/lib/validation/document'

interface Account {
  id: string
  ownerName: string
  document: string
}

interface EditAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: Account | null
  onSuccess?: () => void
}

export function EditAccountDialog({ open, onOpenChange, account, onSuccess }: EditAccountDialogProps) {
  const [ownerName, setOwnerName] = useState('')
  const [document, setDocument] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [commitUpdate, isLoading] = useMutation<UpdateAccountMutationType>(UpdateAccountMutation)

  useEffect(() => {
    if (account) {
      setOwnerName(account.ownerName)
      setDocument(account.document)
      setErrors({})
    }
  }, [account])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!account) return
    const normalizedOwnerName = ownerName.trim().replace(/\s+/g, ' ')
    const normalizedDocument = normalizeDocument(document)
    const nextErrors: Record<string, string> = {}

    if (normalizedOwnerName.length < 3 || normalizedOwnerName.length > 120) {
      nextErrors.ownerName = 'Owner name must be between 3 and 120 characters.'
    }
    if (!isValidBrazilDocument(document)) {
      nextErrors.document = 'Document must be a valid CPF or CNPJ.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      toast.error('Please review the highlighted fields.')
      return
    }

    commitUpdate({
      variables: {
        input: {
          id: account.id,
          ownerName: normalizedOwnerName,
          document: normalizedDocument,
        },
      },
      onCompleted() {
        setErrors({})
        toast.success('Account updated successfully')
        onOpenChange(false)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>
            Update the account owner information.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="editOwnerName">Owner Name</Label>
            <Input
              id="editOwnerName"
              value={ownerName}
              onChange={(e) => {
                setOwnerName(e.target.value)
                setErrors((prev) => ({ ...prev, ownerName: '' }))
              }}
              required
            />
            {errors.ownerName && <p className="text-sm text-destructive">{errors.ownerName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="editDocument">Document (CPF/CNPJ)</Label>
            <Input
              id="editDocument"
              value={document}
              onChange={(e) => {
                setDocument(e.target.value)
                setErrors((prev) => ({ ...prev, document: '' }))
              }}
              required
            />
            {errors.document && <p className="text-sm text-destructive">{errors.document}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
