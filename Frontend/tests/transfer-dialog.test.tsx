import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TransferDialog } from '@/components/transactions/TransferDialog'
import { validateTransferForm } from '@/lib/validation/transfer'

const commitMock = vi.fn()

vi.mock('react-relay', () => ({
  useLazyLoadQuery: vi.fn(() => ({
    accounts: {
      edges: [
        {
          node: {
            id: 'acc-1',
            ownerName: 'Alice',
            branch: '0001',
            number: '12345-6',
            currentBalance: '100.00',
          },
        },
        {
          node: {
            id: 'acc-2',
            ownerName: 'Bob',
            branch: '0001',
            number: '54321-0',
            currentBalance: '50.00',
          },
        },
      ],
    },
  })),
  useMutation: vi.fn(() => [commitMock, false]),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/graphql/DashboardQuery', () => ({
  DashboardQuery: {},
}))

vi.mock('@/graphql/TransferFundsMutation', () => ({
  TransferFundsMutation: {},
}))

vi.mock('@/lib/validation/transfer', () => ({
  validateTransferForm: vi.fn(),
}))

describe('TransferDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows local validation errors and does not call mutation', async () => {
    vi.mocked(validateTransferForm).mockReturnValue({
      values: {
        fromAccountId: '',
        toAccountId: '',
        amount: '',
        description: '',
      },
      errors: {
        amount: 'Amount is required.',
      },
    })

    render(<TransferDialog open onOpenChange={vi.fn()} />)

    const amountInput = screen.getByLabelText('Amount (R$)')
    fireEvent.change(amountInput, { target: { value: '1.00' } })
    const form = screen.getByRole('button', { name: 'Transfer' }).closest('form')
    if (!form) {
      throw new Error('Transfer form not found')
    }
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Amount is required.')).toBeInTheDocument()
    })
    expect(validateTransferForm).toHaveBeenCalled()
    expect(commitMock).not.toHaveBeenCalled()
  })

  it('maps graphql violations to field errors', async () => {
    vi.mocked(validateTransferForm).mockReturnValue({
      values: {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: '10.00',
        description: 'test',
      },
      errors: {},
    })

    commitMock.mockImplementation(({ onError }: { onError?: (error: unknown) => void }) => {
      onError?.({
        response: {
          errors: [
            {
              message: 'Validation failed',
              extensions: {
                code: 'VALIDATION_ERROR',
                violations: [
                  {
                    field: 'toAccountId',
                    message: 'Destination account is blocked.',
                  },
                ],
              },
            },
          ],
        },
      })
    })

    render(<TransferDialog open onOpenChange={vi.fn()} />)

    const amountInput = screen.getByLabelText('Amount (R$)')
    fireEvent.change(amountInput, { target: { value: '10.00' } })
    const form = screen.getByRole('button', { name: 'Transfer' }).closest('form')
    if (!form) {
      throw new Error('Transfer form not found')
    }
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Destination account is blocked.')).toBeInTheDocument()
    })
    expect(validateTransferForm).toHaveBeenCalled()
    expect(commitMock).toHaveBeenCalledTimes(1)
  })
})
