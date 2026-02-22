
"use client"

import { LayoutDashboard, Wallet, BrainCircuit, Lightbulb, TrendingUp, LogOut, LogIn, UserCircle, Settings, ShieldAlert } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { initiateSignOut } from "@/firebase/non-blocking-login"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { collection, query } from "firebase/firestore"

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
  { title: "Audit Hub", url: "/subscriptions", icon: Wallet },
  { title: "Decision Engine", url: "/optimizer", icon: ShieldAlert },
  { title: "Model Matrix", url: "/comparator", icon: TrendingUp },
  { title: "Usage Intelligence", url: "/usage", icon: BrainCircuit },
  { title: "Connectors", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const auth = useAuth()

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="py-6 px-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-lg">
            <BrainCircuit size={20} />
          </div>
          <span className="font-headline font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden">
            SLEEK
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
      <SidebarFooter className="p-4 gap-4">
        {user && !user.isAnonymous ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user.email?.[0]?.toUpperCase() || "F"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-bold truncate leading-tight">Founder Mode</span>
                <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:px-2"
              onClick={() => auth && initiateSignOut(auth)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/"><LogIn className="h-4 w-4 mr-2" /><span>Enter Sleek</span></Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
