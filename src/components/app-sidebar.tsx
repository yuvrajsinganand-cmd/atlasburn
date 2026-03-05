"use client"

import { LayoutDashboard, BrainCircuit, Zap, LogOut, LogIn, Settings, Database, ShieldCheck, ShieldAlert, Server } from "lucide-react"
import Link from "next/navigation"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useUser, useAuth } from "@/firebase"
import { initiateSignOut } from "@/firebase/non-blocking-login"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { PlaceHolderImages } from "@/lib/placeholder-images"

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
  { title: "Economic Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Integration Guide", url: "/usage", icon: Server },
  { title: "Model Intelligence", url: "/catalog", icon: Database },
  { title: "Audit & Optimize", url: "/optimizer", icon: Zap },
  { title: "Quality Sentry", url: "/quality", icon: ShieldAlert },
  { title: "System Controls", url: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const auth = useAuth()
  
  const logo = PlaceHolderImages.find(img => img.id === 'app-logo')

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="py-6 px-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-primary-foreground shadow-lg flex items-center justify-center overflow-hidden h-10 w-10">
            {logo ? (
              <Image 
                src={logo.imageUrl} 
                alt={logo.description} 
                width={24} 
                height={24} 
                data-ai-hint={logo.imageHint}
                className="rounded-sm"
              />
            ) : (
              <BrainCircuit size={20} />
            )}
          </div>
          <span className="font-headline font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden text-primary">
            ATLAS BURN
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                <Link href={item.url}>
                  <item.icon className={pathname === item.url ? "text-primary" : ""} size={18} />
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
            <Link href="/profile" className="flex items-center gap-3 px-2 hover:bg-sidebar-accent p-2 rounded-lg transition-colors">
              <Avatar className="h-8 w-8 border border-primary/20">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {user.email?.[0]?.toUpperCase() || "F"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold truncate leading-tight">Founder Mode</span>
                  <ShieldCheck size={12} className="text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
              </div>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:px-2"
              onClick={() => auth && initiateSignOut(auth)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="group-data-[collapsible=icon]:hidden">Deauthorize</span>
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" className="w-full" asChild>
            <Link href="/login"><LogIn className="h-4 w-4 mr-2" /><span>Enter Atlas</span></Link>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}