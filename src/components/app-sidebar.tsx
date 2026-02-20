
"use client"

import { LayoutDashboard, Wallet, BrainCircuit, Lightbulb, TrendingUp, LogOut, LogIn } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useUser, useAuth } from "@/firebase"
import { initiateGoogleSignIn, initiateSignOut } from "@/firebase/non-blocking-login"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

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
  { title: "Comparator", url: "/comparator", icon: TrendingUp },
  { title: "Usage", url: "/usage", icon: BrainCircuit },
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
      <SidebarFooter className="p-4 gap-4">
        {user && !user.isAnonymous ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarImage src={user.photoURL || ""} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user.displayName?.[0] || user.email?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-bold truncate leading-tight">{user.displayName || "User"}</span>
                <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:px-2"
              onClick={() => initiateSignOut(auth)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="group-data-[collapsible=icon]:hidden">Sign Out</span>
            </Button>
          </div>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full border-primary/20 hover:bg-primary/5 group-data-[collapsible=icon]:px-2"
            onClick={() => initiateGoogleSignIn(auth)}
          >
            <LogIn className="h-4 w-4 mr-2 text-primary" />
            <span className="group-data-[collapsible=icon]:hidden">Sign in with Google</span>
          </Button>
        )}
        
        <div className="bg-secondary p-4 rounded-xl group-data-[collapsible=icon]:hidden">
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
