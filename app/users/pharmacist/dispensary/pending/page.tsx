"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, 
  RefreshCw, 
  Clock, 
  AlertTriangle, 
  Phone, 
  User,
  Pill,
  Eye,
  ArrowRight,
  Settings,
  Filter
} from "lucide-react"
import { useRouter } from "next/navigation"

interface PrescriptionItem {
  id: string
  drugName: string
  quantity: number
  available: number
  hasStock: boolean
  unitPrice: number
  totalPrice: number
}

interface Prescription {
  id: string
  prescriptionNo: string
  student: {
    id: string
    name: string
    matricNumber: string
    phone: string
    photo?: string
  }
  physician: {
    name: string
    specialization: string
  }
  diagnosis: string
  priority: 'emergency' | 'urgent' | 'normal'
  itemCount: number
  totalCost: number
  createdAt: string
  items: PrescriptionItem[]
  hasStockIssues: boolean
}

interface PendingPrescriptionsData {
  prescriptions: Prescription[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  priorityCounts: {
    all: number
    emergency: number
    urgent: number
    normal: number
  }
}

export default function PendingPrescriptions() {
  const [data, setData] = useState<PendingPrescriptionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPriority, setSelectedPriority] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const router = useRouter()

  const fetchPrescriptions = async (page = 1, priority = selectedPriority, search = searchQuery) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(priority !== 'all' && { priority }),
        ...(search && { search })
      })

      const response = await fetch(`/api/pharmacist/prescriptions/pending?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Failed to fetch prescriptions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPrescriptions()
    
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(() => {
        setRefreshing(true)
        fetchPrescriptions(currentPage, selectedPriority, searchQuery)
      }, 30000) // 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, currentPage, selectedPriority, searchQuery])

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    setCurrentPage(1)
    fetchPrescriptions(1, selectedPriority, value)
  }

  const handlePriorityChange = (priority: string) => {
    setSelectedPriority(priority)
    setCurrentPage(1)
    fetchPrescriptions(1, priority, searchQuery)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchPrescriptions(currentPage, selectedPriority, searchQuery)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-500 text-white'
      case 'urgent': return 'bg-yellow-500 text-black'
      default: return 'bg-blue-500 text-white'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'emergency': return '🔴'
      case 'urgent': return '🟡'
      default: return '🔵'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} mins ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Pending Prescriptions</h2>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
          <p className="text-gray-500">Failed to load prescriptions</p>
          <Button onClick={handleRefresh} className="mt-2">
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
        <h2 className="text-3xl font-bold tracking-tight">
          Pending Prescriptions ({data.priorityCounts.all})
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500' : 'bg-gray-400'}`}></div>
            Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by prescription no, student name, matric number..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Tabs value={selectedPriority} onValueChange={handlePriorityChange} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">
                  All ({data.priorityCounts.all})
                </TabsTrigger>
                <TabsTrigger value="emergency" className="text-red-600">
                  Emergency ({data.priorityCounts.emergency})
                </TabsTrigger>
                <TabsTrigger value="urgent" className="text-yellow-600">
                  Urgent ({data.priorityCounts.urgent})
                </TabsTrigger>
                <TabsTrigger value="normal" className="text-blue-600">
                  Normal ({data.priorityCounts.normal})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions List */}
      <div className="space-y-4">
        {data.prescriptions.map((prescription) => (
          <Card key={prescription.id} className={`${prescription.priority === 'emergency' ? 'border-red-500 border-2' : ''}`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={prescription.student.photo} />
                    <AvatarFallback>
                      {prescription.student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getPriorityIcon(prescription.priority)}</span>
                      <Badge className={getPriorityColor(prescription.priority)}>
                        {prescription.priority.toUpperCase()}
                      </Badge>
                      <span className="font-semibold">{prescription.prescriptionNo}</span>
                    </div>
                    <h3 className="font-semibold text-lg">{prescription.student.name}</h3>
                    <p className="text-sm text-gray-600">{prescription.student.matricNumber}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Phone className="h-3 w-3" />
                      {prescription.student.phone}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500 mb-1">{formatTime(prescription.createdAt)}</div>
                  {prescription.hasStockIssues && (
                    <Badge variant="destructive" className="mb-2">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Stock Issues
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Physician:</strong> {prescription.physician.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    <strong>Specialization:</strong> {prescription.physician.specialization}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    <strong>Diagnosis:</strong> {prescription.diagnosis}
                  </p>
                </div>
              </div>

              {/* Items Preview */}
              <div className="mb-4">
                <h4 className="font-medium mb-2">Items ({prescription.itemCount}):</h4>
                <div className="space-y-1">
                  {prescription.items.slice(0, 3).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span>{item.drugName} ({item.quantity})</span>
                      <div className="flex items-center gap-2">
                        {item.hasStock ? (
                          <Badge variant="outline" className="text-green-600">
                            ✅ Available ({item.available})
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            ⚠️ Low stock ({item.available} left)
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {prescription.items.length > 3 && (
                    <p className="text-sm text-gray-500">
                      +{prescription.items.length - 3} more items...
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">
                  Total: {formatCurrency(prescription.totalCost)}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => router.push(`/users/pharmacist/prescriptions/${prescription.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Button>
                  <Button 
                    onClick={() => router.push(`/users/pharmacist/dispensary/dispense/${prescription.id}`)}
                    className={prescription.priority === 'emergency' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {prescription.priority === 'emergency' ? '🚀 DISPENSE NOW' : 'Dispense'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {data.prescriptions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No pending prescriptions</h3>
              <p className="text-gray-500">
                {searchQuery || selectedPriority !== 'all' 
                  ? 'No prescriptions match your current filters.' 
                  : 'All prescriptions have been processed.'}
              </p>
              {(searchQuery || selectedPriority !== 'all') && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedPriority('all')
                    fetchPrescriptions(1, 'all', '')
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
              onClick={() => fetchPrescriptions(currentPage - 1, selectedPriority, searchQuery)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchPrescriptions(currentPage + 1, selectedPriority, searchQuery)}
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