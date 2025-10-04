"use client"

import * as XLSX from 'xlsx';
import { useEffect, useState, useMemo } from "react"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Download, 
  Upload, 
  Activity, 
  AlertTriangle,
  Calendar,
  Settings,
  FileText,
  TrendingDown,
  Clock
} from "lucide-react"
import { Loading } from "@/components/loading"
import { formatCurrency } from "@/lib/utils"
import { useSession } from "next-auth/react"
import Link from "next/link"
import fetchData from "@/hooks/fetch-data"

interface Drug {
  id: string
  code: string
  name: string
  category: string
  quantity: number
  reorderLevel: number
  price: number
  expiryDate: string
  batchNumber: string
  manufacturer: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'expired' | 'expiring_soon'
  createdAt: string
  updatedAt: string
}

export default function DrugInventoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [stockFilter, setStockFilter] = useState("all")
  const [expiryFilter, setExpiryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState("asc")
  const [endpoint, setEndPoint] = useState("")
  const { data: session } = useSession()

  const { data: drugsData, loading, error, refetch } = fetchData("/api/drugs/list")

  useEffect(() => {
    setEndPoint(`/warehouse/${session?.user?.role}`)
  }, [session])

  // Filter and sort drugs
  const filteredDrugs = useMemo(() => {
    if (!drugsData) return []
    
    let filtered = drugsData.filter((drug: Drug) => {
      const matchesSearch = 
        drug.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drug.manufacturer.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = categoryFilter === "all" || drug.category === categoryFilter
      const matchesStock = stockFilter === "all" || drug.status === stockFilter
      
      let matchesExpiry = true
      if (expiryFilter === "expiring_soon") {
        const expiryDate = new Date(drug.expiryDate)
        const thirtyDaysFromNow = new Date()
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
        matchesExpiry = expiryDate <= thirtyDaysFromNow && expiryDate > new Date()
      } else if (expiryFilter === "expired") {
        matchesExpiry = new Date(drug.expiryDate) < new Date()
      }

      return matchesSearch && matchesCategory && matchesStock && matchesExpiry
    })

    // Sort
    filtered.sort((a: Drug, b: Drug) => {
      let aValue, bValue
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case "quantity":
          aValue = a.quantity
          bValue = b.quantity
          break
        case "expiry":
          aValue = new Date(a.expiryDate)
          bValue = new Date(b.expiryDate)
          break
        case "price":
          aValue = a.price
          bValue = b.price
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [drugsData, searchQuery, categoryFilter, stockFilter, expiryFilter, sortBy, sortOrder])

  // Get stock status
  const getStockStatus = (drug: Drug) => {
    const today = new Date()
    const expiryDate = new Date(drug.expiryDate)
    const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (expiryDate < today) {
      return { status: 'expired', color: 'bg-red-500', icon: '🔴', text: 'Expired' }
    }
    
    if (daysToExpiry <= 30) {
      return { status: 'expiring_soon', color: 'bg-orange-500', icon: '🟠', text: 'Expiring Soon' }
    }

    if (drug.quantity === 0) {
      return { status: 'out_of_stock', color: 'bg-black', icon: '⚫', text: 'Out of Stock' }
    }
    
    if (drug.quantity <= drug.reorderLevel) {
      return { status: 'low_stock', color: 'bg-red-500', icon: '🔴', text: 'Critical' }
    }
    
    if (drug.quantity <= drug.reorderLevel * 1.1) {
      return { status: 'low_stock', color: 'bg-yellow-500', icon: '⚠️', text: 'Low Stock' }
    }

    return { status: 'in_stock', color: 'bg-green-500', icon: '✅', text: 'In Stock' }
  }

  // Export function
  const exportData = () => {
    const formattedData = filteredDrugs.map((drug: Drug) => ({
      Code: drug.code,
      Name: drug.name,
      Category: drug.category,
      Quantity: drug.quantity,
      'Reorder Level': drug.reorderLevel,
      Price: drug.price,
      'Expiry Date': drug.expiryDate,
      'Batch Number': drug.batchNumber,
      Manufacturer: drug.manufacturer,
      Status: getStockStatus(drug).text
    }))

    const worksheet = XLSX.utils.json_to_sheet(formattedData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Drug Inventory")
    XLSX.writeFile(workbook, `drug_inventory_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // Get unique categories
  const categories = useMemo(() => {
    if (!drugsData) return []
    return [...new Set(drugsData.map((drug: Drug) => drug.category))]
  }, [drugsData])

  // Statistics
  const stats = useMemo(() => {
    if (!drugsData) return { total: 0, lowStock: 0, expired: 0, expiringSoon: 0 }
    
    const total = drugsData.length
    const lowStock = drugsData.filter((drug: Drug) => drug.quantity <= drug.reorderLevel).length
    const expired = drugsData.filter((drug: Drug) => new Date(drug.expiryDate) < new Date()).length
    const expiringSoon = drugsData.filter((drug: Drug) => {
      const expiryDate = new Date(drug.expiryDate)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      return expiryDate <= thirtyDaysFromNow && expiryDate > new Date()
    }).length

    return { total, lowStock, expired, expiringSoon }
  }, [drugsData])

  if (loading) return <Loading />

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href={`${endpoint}/dashboard`}>Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Drug Inventory</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-semibold text-blue-600">Drug Inventory Management</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`${endpoint}/drugs/import`}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Link>
            </Button>
            <Button onClick={exportData} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`${endpoint}/drugs/categories`}>
                <Settings className="mr-2 h-4 w-4" />
                Categories
              </Link>
            </Button>
            <Button asChild>
              <Link href={`${endpoint}/drugs/add`}>
                <Plus className="mr-2 h-4 w-4" />
                Add Drug
              </Link>
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Drugs</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Active inventory items</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.lowStock}</div>
              <p className="text-xs text-muted-foreground">
                <Link href={`${endpoint}/drugs/low-stock`} className="text-red-600 hover:underline">
                  View details →
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.expiringSoon}</div>
              <p className="text-xs text-muted-foreground">
                <Link href={`${endpoint}/drugs/expiring`} className="text-orange-600 hover:underline">
                  View details →
                </Link>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
              <p className="text-xs text-muted-foreground">
                <Link href={`${endpoint}/drugs/expired`} className="text-red-600 hover:underline">
                  View details →
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
            <Link href={`${endpoint}/drugs/low-stock`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription>
                  Monitor drugs below reorder level
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
            <Link href={`${endpoint}/drugs/expiring`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  Expiry Management
                </CardTitle>
                <CardDescription>
                  Track drugs expiring in 30/60/90 days
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" asChild>
            <Link href={`${endpoint}/drugs/categories`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-500" />
                  Category Management
                </CardTitle>
                <CardDescription>
                  Organize drug categories
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2 space-y-2">
                <Label htmlFor="search">Search Drugs</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, code, or manufacturer..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stock Status</Label>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Expiry</Label>
                <Select value={expiryFilter} onValueChange={setExpiryFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split('-')
                  setSortBy(field)
                  setSortOrder(order)
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="quantity-asc">Quantity Low-High</SelectItem>
                    <SelectItem value="quantity-desc">Quantity High-Low</SelectItem>
                    <SelectItem value="expiry-asc">Expiry Soon-Late</SelectItem>
                    <SelectItem value="expiry-desc">Expiry Late-Soon</SelectItem>
                    <SelectItem value="price-asc">Price Low-High</SelectItem>
                    <SelectItem value="price-desc">Price High-Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Drugs Table */}
        <Card>
          <CardHeader>
            <CardTitle>Drug Inventory</CardTitle>
            <CardDescription>
              Showing {filteredDrugs.length} of {drugsData?.length || 0} drugs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrugs.map((drug: Drug) => {
                  const stockStatus = getStockStatus(drug)
                  return (
                    <TableRow key={drug.id}>
                      <TableCell className="font-medium">{drug.code}</TableCell>
                      <TableCell>{drug.name}</TableCell>
                      <TableCell>{drug.category}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${stockStatus.icon === '✅' ? 'text-green-600' : stockStatus.icon === '⚠️' ? 'text-yellow-600' : 'text-red-600'}`}>
                            {stockStatus.icon}
                          </span>
                          {drug.quantity}
                        </div>
                      </TableCell>
                      <TableCell>{drug.reorderLevel}</TableCell>
                      <TableCell>{formatCurrency(drug.price)}</TableCell>
                      <TableCell>
                        {new Date(drug.expiryDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={stockStatus.status === 'in_stock' ? 'default' : 
                                  stockStatus.status === 'low_stock' ? 'secondary' : 'destructive'}
                        >
                          {stockStatus.text}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`${endpoint}/drugs/${drug.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`${endpoint}/drugs/${drug.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Drug
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`${endpoint}/drugs/${drug.id}/adjust-stock`}>
                                <Activity className="mr-2 h-4 w-4" />
                                Adjust Stock
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`${endpoint}/drugs/${drug.id}/history`}>
                                <FileText className="mr-2 h-4 w-4" />
                                Usage History
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  )
}