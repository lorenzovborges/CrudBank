import { ArrowLeftRight, LayoutDashboard, Wallet } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import logo from '@/assets/CrudBank.webp'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Accounts', url: '/accounts', icon: Wallet },
  { title: 'Transactions', url: '/transactions', icon: ArrowLeftRight },
]

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <Sidebar>
      <SidebarHeader className="flex h-16 items-center px-6">
        <img src={logo} alt="CrudBank" className="h-12 select-none pointer-events-none" draggable={false} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.url}
                    onClick={() => navigate(item.url)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
