
"use client"

import { LayoutDashboard, LogOut, LogIn, Settings, Database, ShieldCheck, ShieldAlert, Server, Zap, FlaskConical, FileText, ShieldHalf } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useUser, useAuth } from "@/firebase"
import { initiateSignOut } from "@/firebase/non-blocking-login"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useDemoMode } from "@/components/demo-provider"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { cn } from "@/lib/utils"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const items = [
  { title: "Economic Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Forensic Ledger", url: "/ledger", icon: FileText },
  { title: "Safety Guardrails", url: "/guardrails", icon: ShieldHalf },
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
  const { isDemoMode, toggleDemoMode } = useDemoMode()
  
  const logo = PlaceHolderImages.find(img => img.id === 'app-logo')

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="py-6 px-4">
        <Link href="/" className="flex items-center gap-3">
          {logo && (
            <Image 
              src={logo.imageUrl} 
              alt={logo.description} 
              width={40} 
              height={40} 
              data-ai-hint={logo.imageHint}
              priority
              unoptimized
              className="object-contain rounded-xl shadow-sm"
            />
          )}
          <span className="font-headline font-bold text-lg tracking-tight group-data-[collapsible=icon]:hidden text-primary uppercase">
            ATLAS BURN
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarMenu>
          {items.map((item) => {
            const isActive = pathname === item.url;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive} 
                  tooltip={item.title}
                  className="relative group overflow-hidden"
                >
                  <Link href={item.url} className="flex items-center w-full">
                    <div 
                      className={cn(
                        "absolute left-0 top-0 w-1 bg-primary transition-all duration-500 ease-in-out origin-center",
                        isActive ? "h-full scale-y-100 opacity-100" : "h-full scale-y-0 opacity-0"
                      )} 
                    />
                    
                    <item.icon 
                      className={cn(
                        "transition-all duration-300",
                        isActive ? "text-primary scale-125 rotate-0" : "text-muted-foreground scale-100 group-hover:text-foreground"
                      )} 
                      size={18} 
                    />
                    <span className={cn(
                      "font-medium transition-all duration-300 ml-2",
                      isActive ? "text-primary font-bold translate-x-1" : "text-muted-foreground"
                    )}>
                      {item.title}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>

        <SidebarSeparator className="my-4" />
        
        <div className="px-4 py-2 group-data-[collapsible=icon]:hidden">
          <div className="flex flex-col gap-4 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical size={16} className="text-primary" />
                <Label htmlFor="demo-mode" className="text-[10px] font-bold uppercase tracking-widest text-primary cursor-pointer">Demo Mode</Label>
              </div>
              <Switch 
                id="demo-mode" 
                checked={isDemoMode} 
                onCheckedChange={toggleDemoMode}
                className="scale-75"
              />
            </div>
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              {isDemoMode 
                ? "Simulating full 365-day institutional survival paths." 
                : "Awaiting deterministic production feed from verified SDK."}
            </p>
          </div>
        </div>
      </SidebarContent>
      <SidebarFooter className="p-4 gap-4">
        {user && !user.isAnonymous ? (
          <div className="flex flex-col gap-4">
            <Link href="/profile" className="flex items-center gap-3 px-2 hover:bg-sidebar-accent p-2 rounded-lg transition-colors group">
              <Avatar className="h-8 w-8 border border-primary/20 transition-transform duration-300 group-hover:scale-110">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
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
              className="w-full justify-start text-muted-foreground hover:text-destructive group-data-[collapsible=icon]:px-2 transition-colors duration-300"
              onClick={() => auth && initiateSignOut(auth)}
            >
              <LogOut className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
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
