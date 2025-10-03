"use client"

import type * as React from "react"
import { useState, useEffect } from "react"
import {
  BarChart3,
  Bell,
  ChevronRight,
  Home,
  Package,
  Plus,
  Settings,
  ShoppingCart,
  FileText,
  Truck,
  ArrowLeftRight,
  Users,
  User,
  Building2,
  UserCheck,
  Eye,
  Warehouse,
  type LucideIcon,
  Receipt,
  Pill,
  ClipboardList,
  AlertTriangle,
  Activity,
  TrendingUp,
  Calendar,
  Clock
} from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import fetchData from "@/hooks/fetch-data"
import { Button } from "@heroui/button"
import { signOut, useSession } from "next-auth/react"
import { SystemStatus } from "@/components/system-status"

// Navigation data for pharmacist system
function NavSection({
  title,
  items,
}: {
  title: string
  items: Array<{
    title: string
    url?: string
    icon: LucideIcon
    items?: Array<{
      title: string
      url: string
      icon?: LucideIcon
    }>
  }>
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{title}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          if (item.items) {
            return (
              <Collapsible key={item.title} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title}>
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton asChild>
                            <a href={subItem.url}>
                              {subItem.icon && <subItem.icon className="w-4 h-4" />}
                              <span>{subItem.title}</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            )
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}

export function PharmacistAppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: settingsData, loading, error } = fetchData("/api/settings")
  const { data: session } = useSession()

  if (loading) return ""

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="/users/pharmacist/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Pill className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{settingsData?.companyName || "Clinic"}</span>
                  <span className="truncate text-xs">Pharmacy Management</span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SystemStatus />
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavSection title="Overview" items={[
          {
            title: "Dashboard",
            url: "/users/pharmacist/dashboard",
            icon: Home,
          },
        ]} />

        <NavSection title="Dispensary" items={[
          {
            title: "Prescriptions",
            icon: ClipboardList,
            items: [
              {
                title: "Pending",
                url: "/users/pharmacist/dispensary/pending",
                icon: Clock,
              },
              {
                title: "Dispensing History",
                url: "/users/pharmacist/dispensary/history",
                icon: FileText,
              },
            ],
          },
        ]} />

        <NavSection title="Inventory" items={[
          {
            title: "Stock Management",
            icon: Package,
            items: [
              {
                title: "Stock Levels",
                url: "/users/pharmacist/inventory/stock",
                icon: Package,
              },
              {
                title: "Low Stock Alerts",
                url: "/users/pharmacist/inventory/alerts",
                icon: AlertTriangle,
              },
              {
                title: "Expiring Drugs",
                url: "/users/pharmacist/inventory/expiring",
                icon: Calendar,
              },
            ],
          },
        ]} />

        <NavSection title="Reports" items={[
          {
            title: "Analytics",
            icon: BarChart3,
            items: [
              {
                title: "Daily Sales",
                url: "/users/pharmacist/reports/daily",
                icon: TrendingUp,
              },
              {
                title: "Drug Usage",
                url: "/users/pharmacist/reports/usage",
                icon: Activity,
              },
              {
                title: "Student History",
                url: "/users/pharmacist/reports/students",
                icon: Users,
              },
            ],
          },
        ]} />

        <NavSection title="Settings" items={[
          {
            title: "Preferences",
            url: "/users/pharmacist/settings",
            icon: Settings,
          },
        ]} />

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Logout"
              onClick={() => signOut({ callbackUrl: "/user/login" })}
              className="bg-red-500 text-white hover:bg-red-600 transition"
            >
              <ArrowLeftRight className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}