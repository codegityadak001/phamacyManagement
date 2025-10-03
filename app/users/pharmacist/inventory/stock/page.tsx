"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Package, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  TrendingDown,
  Calendar,
  Edit,
  Eye,
  FileText,
  Download,
  Filter
} from "lucide-react"

interface Product {
  id: string
  name: string
  genericName?: string
  brandName?: string
  category?: string
  manufacturer?: string
  quantity: number
  reorderLevel?: number
  maxStockLevel?: number
  retailPrice: number
  expiryDate?: string
  batchNumber?: string
  dosageForm?: string
  strength?: string
  unit: string
  stockStatus: 'out_of_stock' | 'low_stock' | 'healthy'
  stockPercentage: number
  isExpiringSoon: boolean
  lastUpdated: string
}

interface StockData {
  products: Product[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    totalDrugs: number
    inStock: number
    lowStock: number
    outOfStock: number
  }
  categories: string[]
}

export default function StockLevels() {
  const [data, setData] = useState<StockData | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [adjustingStock, setAdjustingStock] = useState<Product | null>(null)
  const [newQuantity, setNewQuantity] = useState("")
  const [adjustmentReason, setAdjustmentReason] = useState("")

  const fetchStockData = async (page = 1, category = selectedCategory, status = selectedStatus, search = searchQuery) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(category !== 'all' && { category }),
        ...(status !== 'all' && { status }),
        ...(search && { search })
      })

      const response = await fetch(`/api/pharmacist/inventory/stock?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Failed to fetch stock data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStockData()
  }, [])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
    fetchStockData(1, selectedCategory, selectedStatus, value)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    setCurrentPage(1)
    fetchStockData(1, category, selectedStatus, searchQuery)
  }

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status)
    setCurrentPage(1)
    fetchStockData(1, selectedCategory, status, searchQuery)
  }

  const handleStockAdjustment = async () => {
    if (!adjustingStock || !newQuantity || !adjustmentReason) return

    try {
      const response = await fetch('/api/pharmacist/inventory/stock', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: adjustingStock.id,
          quantity: parseInt(newQuantity),
          reason: adjustmentReason,
          adjustedBy: 'current-user-id' // You'd get this from session
        })
      })

      if (response.ok) {
        setAdjustingStock(null)
        setNewQuantity("")
        setAdjustmentReason("")
        fetchStockData(currentPage, selectedCategory, selectedStatus, searchQuery)
      }
    } catch (error) {
      console.error('Failed to adjust stock:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'out_of_stock': return 'bg-red-500 text-white'
      case 'low_stock': return 'bg-yellow-500 text-black'
      default: return 'bg-green-500 text-white'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'out_of_stock': return '🔴'
      case 'low_stock': return '🟡'
      default: return '🟢'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Inventory - Stock Levels</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center">
          <p className="text-gray-500">Failed to load stock data</p>
          <Button onClick={() => fetchStockData()} className="mt-2">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Inventory - Stock Levels</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => fetchStockData(currentPage, selectedCategory, selectedStatus, searchQuery)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Drugs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalDrugs}</div>
            <p className="text-xs text-muted-foreground">All products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.summary.inStock}</div>
            <p className="text-xs text-muted-foreground">Available products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.summary.lowStock}</div>
            <p className="text-xs text-muted-foreground">Need reordering</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.summary.outOfStock}</div>
            <p className="text-xs text-muted-foreground">Urgent reorder</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search drugs..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {data.categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products List */}
      <div className="space-y-4">
        {/* Out of Stock Section */}
        {data.products.filter(p => p.stockStatus === 'out_of_stock').length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
              🔴 OUT OF STOCK ({data.products.filter(p => p.stockStatus === 'out_of_stock').length})
            </h3>
            <div className="space-y-2">
              {data.products.filter(p => p.stockStatus === 'out_of_stock').map((product) => (
                <Card key={product.id} className="border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <p className="text-sm text-gray-600">
                          Qty: {product.quantity}/{product.reorderLevel || 'N/A'} | 
                          Last dispensed: 2 days ago
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="destructive" size="sm">
                          Reorder Urgently
                        </Button>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Low Stock Section */}
        {data.products.filter(p => p.stockStatus === 'low_stock').length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-yellow-600 mb-3 flex items-center gap-2">
              🟡 LOW STOCK ({data.products.filter(p => p.stockStatus === 'low_stock').length})
            </h3>
            <div className="space-y-2">
              {data.products.filter(p => p.stockStatus === 'low_stock').map((product) => (
                <Card key={product.id} className="border-yellow-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex-1 max-w-xs">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{product.quantity}/{product.reorderLevel || 'N/A'}</span>
                              <span>({product.stockPercentage.toFixed(0)}%)</span>
                            </div>
                            <Progress value={product.stockPercentage} className="h-2" />
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Category: {product.category || 'N/A'}</p>
                            <p>Exp: {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Reorder
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setAdjustingStock(product)
                                setNewQuantity(product.quantity.toString())
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Adjust Stock - {product.name}</DialogTitle>
                              <DialogDescription>
                                Current stock: {product.quantity} {product.unit}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="new-quantity">New Quantity</Label>
                                <Input
                                  id="new-quantity"
                                  type="number"
                                  value={newQuantity}
                                  onChange={(e) => setNewQuantity(e.target.value)}
                                />
                              </div>
                              <div>
                                <Label htmlFor="reason">Reason for Adjustment</Label>
                                <Textarea
                                  id="reason"
                                  value={adjustmentReason}
                                  onChange={(e) => setAdjustmentReason(e.target.value)}
                                  placeholder="Enter reason for stock adjustment..."
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setAdjustingStock(null)}>
                                  Cancel
                                </Button>
                                <Button onClick={handleStockAdjustment}>
                                  Update Stock
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Healthy Stock Section */}
        {data.products.filter(p => p.stockStatus === 'healthy').length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-green-600 mb-3 flex items-center gap-2">
              🟢 HEALTHY STOCK ({data.products.filter(p => p.stockStatus === 'healthy').length})
            </h3>
            <div className="space-y-2">
              {data.products.filter(p => p.stockStatus === 'healthy').slice(0, 10).map((product) => (
                <Card key={product.id} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{product.name}</h4>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex-1 max-w-xs">
                            <div className="flex justify-between text-sm mb-1">
                              <span>{product.quantity}/{product.reorderLevel || 'N/A'}</span>
                              <span>({product.stockPercentage.toFixed(0)}%)</span>
                            </div>
                            <Progress value={Math.min(product.stockPercentage, 100)} className="h-2" />
                          </div>
                          <div className="text-sm text-gray-600">
                            <span>Category: {product.category || 'N/A'}</span>
                            {product.isExpiringSoon && (
                              <Badge variant="outline" className="ml-2 text-yellow-600">
                                <Calendar className="h-3 w-3 mr-1" />
                                Expiring Soon
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {data.products.filter(p => p.stockStatus === 'healthy').length > 10 && (
                <Card>
                  <CardContent className="p-4 text-center">
                    <Button variant="outline" onClick={() => fetchStockData(currentPage + 1, selectedCategory, selectedStatus, searchQuery)}>
                      Show More...
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {data.products.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">
                {searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all'
                  ? 'No products match your current filters.'
                  : 'No products in inventory.'}
              </p>
              {(searchQuery || selectedCategory !== 'all' || selectedStatus !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('all')
                    setSelectedStatus('all')
                    fetchStockData(1, 'all', 'all', '')
                  }}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pagination */}
      {data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{' '}
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{' '}
            {data.pagination.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => fetchStockData(currentPage - 1, selectedCategory, selectedStatus, searchQuery)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchStockData(currentPage + 1, selectedCategory, selectedStatus, searchQuery)}
              disabled={currentPage === data.pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}