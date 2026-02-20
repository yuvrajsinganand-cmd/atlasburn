"use client"

import { LayoutDashboard, Wallet, BrainCircuit, Lightbulb, Search, Settings, ArrowLeftRight, TrendingUp } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Subscriptions", url: "/subscriptions", icon: Wallet },
  { title: "Optimizer", url: "/optimizer", icon: TrendingUp },
  { title: "Recommender", url: "/recommender", icon: Lightbulb },
  { title: "Comparator", url: "/comparator", icon: ArrowLeftRight },
  { title: "Usage", url: "/usage", icon: BrainCircuit },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="py-6 px-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-lg">
            <BrainCircuit size={20} />
          </div>
          <span className="font-headline font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden">
            AISleek
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                <Link href={item.url}>
                  <item.icon />
                  <span className="font-medium">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 group-data-[collapsible=icon]:hidden">
        <div className="bg-secondary p-4 rounded-xl">
          <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Current Budget</p>
          <div className="flex justify-between items-end">
            <span className="font-headline text-lg font-bold text-primary">$70</span>
            <span className="text-xs text-muted-foreground">/ $100</span>
          </div>
          <div className="w-full bg-primary/10 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-primary h-full" style={{ width: '70%' }} />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}