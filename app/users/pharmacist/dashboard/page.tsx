"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { 
  Activity, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Package, 
  Pill, 
  TrendingUp, 
  Users,
  RefreshCw,
  Eye,
  ArrowRight
} from "lucide-react"
import { useRouter } from "next/navigation"

interface DashboardData {
  statistics: {
    pendingPrescriptions: number
    dispensedToday: number
    revenue: number
    patientsServed: number
  }
  priorityPrescriptions: Array<{
    id: string
    prescriptionNo: string
    student: {
      name: string
      matricNumber: string
      phone: string
      photo?: string
    }
    physician: string
    diagnosis: string
    priority: 'emergency' | 'urgent' | 'normal'
    itemCount: number
    totalCost: number
    createdAt: string
    items: Array<{
      drugName: string
      quantity: number
      available: number
      hasStock: boolean
    }>
  }>
  inventoryAlerts: {
    lowStock: Array<{
      name: string
      current: number
      reorderLevel: number
    }>
    expiring: Array<{
      name: string
      expiryDate: string
      quantity: number
    }>
  }
  recentActivity: Array<{
    id: string
    dispensalNo: string
    studentName: string
    prescriptionNo: string
    amount: number
    createdAt: string
  }>
}

export default function PharmacistDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/pharmacist/dashboard')
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    fetchDashboardData()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-500'
      case 'urgent': return 'bg-yellow-500'
      default: return 'bg-blue-500'
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
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Pharmacy Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-16 animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="text-center">
          <p className="text-gray-500">Failed to load dashboard data</p>
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
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Pharmacy Dashboard</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Prescriptions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {dashboardData.statistics.pendingPrescriptions}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting dispensing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispensed Today</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.statistics.dispensedToday}
            </div>
            <p className="text-xs text-muted-foreground">
              Prescriptions completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.statistics.revenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients Served</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.statistics.patientsServed}
            </div>
            <p className="text-xs text-muted-foreground">
              Unique patients today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Priority Prescriptions */}
        <Card className="col-span-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                🚨 Priority Prescriptions 
                <Badge variant="destructive">
                  {dashboardData.priorityPrescriptions.filter(p => p.priority === 'emergency').length} urgent
                </Badge>
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push('/users/pharmacist/dispensary/pending')}
              >
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboardData.priorityPrescriptions.slice(0, 3).map((prescription) => (
              <div key={prescription.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{getPriorityIcon(prescription.priority)}</span>
                    <div>
                      <div className="font-medium">
                        {prescription.priority.toUpperCase()} - {prescription.prescriptionNo}
                      </div>
                      <div className="text-sm text-gray-600">
                        {prescription.student.name} ({prescription.student.matricNumber})
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className={getPriorityColor(prescription.priority)}>
                    {formatTime(prescription.createdAt)}
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Physician:</strong> {prescription.physician}<br />
                  <strong>Diagnosis:</strong> {prescription.diagnosis}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    {prescription.itemCount} items | {formatCurrency(prescription.totalCost)}
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => router.push(`/users/pharmacist/dispensary/dispense/${prescription.id}`)}
                    className={prescription.priority === 'emergency' ? 'bg-red-600 hover:bg-red-700' : ''}
                  >
                    {prescription.priority === 'emergency' ? '🚀 DISPENSE NOW' : 'Dispense'}
                  </Button>
                </div>
              </div>
            ))}
            
            {dashboardData.priorityPrescriptions.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No priority prescriptions at the moment
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inventory Alerts */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ⚠️ Inventory Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Low Stock */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-red-600">
                  🔴 Low Stock ({dashboardData.inventoryAlerts.lowStock.length})
                </h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/users/pharmacist/inventory/alerts')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {dashboardData.inventoryAlerts.lowStock.slice(0, 3).map((drug, index) => (
                  <div key={index} className="text-sm">
                    <div className="flex justify-between">
                      <span>{drug.name}</span>
                      <span className="text-red-600">
                        {drug.current} left (Reorder: {drug.reorderLevel})
                      </span>
                    </div>
                    <Progress 
                      value={(drug.current / drug.reorderLevel) * 100} 
                      className="h-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Expiring Soon */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-yellow-600">
                  🟡 Expiring Soon ({dashboardData.inventoryAlerts.expiring.length})
                </h4>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push('/users/pharmacist/inventory/expiring')}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {dashboardData.inventoryAlerts.expiring.slice(0, 3).map((drug, index) => (
                  <div key={index} className="text-sm flex justify-between">
                    <span>{drug.name}</span>
                    <span className="text-yellow-600">
                      Exp: {new Date(drug.expiryDate).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dashboardData.recentActivity.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm">
                    Dispensed {activity.prescriptionNo} to {activity.studentName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{formatCurrency(activity.amount)}</span>
                  <span>•</span>
                  <span>{formatTime(activity.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>⚡ Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push('/users/pharmacist/dispensary/pending')}
            >
              <Clock className="h-6 w-6" />
              View Pending
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push('/users/pharmacist/inventory/stock')}
            >
              <Package className="h-6 w-6" />
              Check Stock
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push('/users/pharmacist/reports/daily')}
            >
              <TrendingUp className="h-6 w-6" />
              Reports
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push('/users/pharmacist/settings')}
            >
              <Activity className="h-6 w-6" />
              Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}