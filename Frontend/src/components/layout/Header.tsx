import { ArrowLeftRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

interface HeaderProps {
  onTransferClick: () => void
}

export function Header({ onTransferClick }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6 bg-border/40" />
        <h1 className="text-lg font-semibold">Welcome to CrudBank</h1>
      </div>
      <Button onClick={onTransferClick} size="sm">
        <ArrowLeftRight className="mr-2 size-4" />
        Transfer Money
      </Button>
    </header>
  )
}
