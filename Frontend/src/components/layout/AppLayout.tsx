import { useState } from 'react'
import { Outlet } from 'react-router'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './AppSidebar'
import { Header } from './Header'
import { TransferDialog } from '@/components/transactions/TransferDialog'

export function AppLayout() {
  const [transferOpen, setTransferOpen] = useState(false)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header onTransferClick={() => setTransferOpen(true)} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} />
    </SidebarProvider>
  )
}
