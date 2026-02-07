import { useNavigate } from 'react-router'
import { ArrowLeftRight, Plus, FileText, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface QuickActionsProps {
  onTransferClick: () => void
  onNewAccountClick: () => void
}

const actions = [
  { label: 'Transfer', icon: ArrowLeftRight, action: 'transfer' as const },
  { label: 'New Account', icon: Plus, action: 'newAccount' as const },
  { label: 'Statements', icon: FileText, action: 'statements' as const },
  { label: 'Accounts', icon: Wallet, action: 'accounts' as const },
]

export function QuickActions({ onTransferClick, onNewAccountClick }: QuickActionsProps) {
  const navigate = useNavigate()

  function handleAction(action: string) {
    switch (action) {
      case 'transfer':
        onTransferClick()
        break
      case 'newAccount':
        onNewAccountClick()
        break
      case 'statements':
        navigate('/transactions')
        break
      case 'accounts':
        navigate('/accounts')
        break
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((item) => (
        <Card
          key={item.label}
          className="cursor-pointer transition-colors hover:bg-accent"
          onClick={() => handleAction(item.action)}
        >
          <CardContent className="flex flex-col items-center gap-2 p-4">
            <item.icon className="size-6 text-primary" />
            <span className="text-sm font-medium">{item.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
