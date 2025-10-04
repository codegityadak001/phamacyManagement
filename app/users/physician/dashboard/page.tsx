"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  Users,
  Stethoscope,
  Pill,
  Clock,
  AlertTriangle,
  Loader2,
  Calendar,
  TrendingUp,
  UserCheck,
  Activity,
  Bell,
  ChevronRight,
} from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import axios from "axios"

interface PhysicianDashboardData {
  todayStats: {
    patientsCompleted: number
    consultationsCompleted: number
    prescriptionsWritten: number
    inQueue: number
  }
  currentQueue: Array<{
    id: string
    studentName: string
    matricNumber: string
    priority: 'emergency' | 'urgent' | 'normal'
    complaint: string
    waitTime: string
  }>
  todayAppointments: Array<{
    id: string
    time: string
    studentName: string
    type: string
    status: string
  }>
  weekOverview: {
    totalConsultations: number
    mostCommonDiagnosis: string
    diagnosisCount: number
    avgConsultationTime: number
  }
  consultationsByDay: Array<{
    day: string
    consultations: number
  }>
  diagnosisDistribution: Array<{
    diagnosis: string
    count: number
    color: string
  }>
}

export default function PhysicianDashboard() {
  const [data, setData] = useState<PhysicianDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { data: session } = useSession()
  const router = useRouter()

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        const response = await axios.get("/api/physician/dashboard")
        setData(response.data)
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        // Set empty data structure on error
        setData({
          todayStats: {
            patientsCompleted: 0,
            consultationsCompleted: 0,
            prescriptionsWritten: 0,
            inQueue: 0
          },
          currentQueue: [],
          todayAppointments: [],
          weekOverview: {
            totalConsultations: 0,
            mostCommonDiagnosis: "N/A",
            diagnosisCount: 0,
            avgConsultationTime: 0
          },
          consultationsByDay: [
            { day: "Mon", consultations: 0 },
            { day: "Tue", consultations: 0 },
            { day: "Wed", consultations: 0 },
            { day: "Thu", consultations: 0 },
            { day: "Fri", consultations: 0 },
          ],
          diagnosisDistribution: []
        })
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      fetchDashboardData()
    }
  }, [session])

  const handleCallNextPatient = () => {
    router.push('/users/physician/queue/next')
  }

  const handleNewConsultation = () => {
    router.push('/users/physician/consultations/new')
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'bg-red-500'
      case 'urgent': return 'bg-orange-500'
      case 'normal': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'emergency': return 'destructive'
      case 'urgent': return 'secondary'
      case 'normal': return 'default'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading dashboard...</span>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <AlertTriangle className="h-8 w-8 text-yellow-500" />
        <span className="ml-2">Failed to load dashboard data</span>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Physician Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, Dr. {session?.user?.name || "Doctor"}. Here's your overview for today.
        </p>
      </div>

      {/* Today's Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayStats.patientsCompleted}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Consultations</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayStats.consultationsCompleted}</div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescriptions</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayStats.prescriptionsWritten}</div>
            <p className="text-xs text-muted-foreground">Written</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Queue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.todayStats.inQueue}</div>
            <p className="text-xs text-muted-foreground">Waiting</p>
          </CardContent>
        </Card>
      </div>

      {/* Current Queue */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2 text-blue-500" />
            Current Queue ({data.currentQueue.length} waiting)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.currentQueue.map((patient, index) => (
              <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold text-muted-foreground">{index + 1}.</span>
                    <Badge variant={getPriorityBadge(patient.priority) as any}>
                      {patient.priority.toUpperCase()}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-medium">{patient.studentName}</p>
                    <p className="text-sm text-muted-foreground">{patient.matricNumber}</p>
                    <p className="text-sm text-blue-600">"{patient.complaint}"</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Waiting: {patient.waitTime}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button onClick={handleCallNextPatient} className="w-full">
              <UserCheck className="h-4 w-4 mr-2" />
              Call Next Patient
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Today's Appointments and Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Today's Appointments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-green-500" />
              Today's Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.todayAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-center justify-between p-3 border-l-4 border-blue-500 bg-blue-50">
                  <div>
                    <p className="font-medium">{appointment.time}</p>
                    <p className="text-sm text-muted-foreground">{appointment.studentName}</p>
                    <p className="text-xs text-blue-600">{appointment.type}</p>
                  </div>
                  <Badge variant="outline">{appointment.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2 text-purple-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <Button variant="outline" className="justify-start" onClick={() => router.push('/users/physician/queue')}>
                <Clock className="h-4 w-4 mr-2" />
                View Queue
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button variant="outline" className="justify-start" onClick={handleNewConsultation}>
                <Stethoscope className="h-4 w-4 mr-2" />
                Start New Consultation
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => router.push('/users/physician/patients/search')}>
                <Users className="h-4 w-4 mr-2" />
                Search Patient
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => router.push('/users/physician/schedule')}>
                <Calendar className="h-4 w-4 mr-2" />
                My Schedule
                <ChevronRight className="h-4 w-4 ml-auto" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* This Week Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
            This Week Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{data.weekOverview.totalConsultations}</p>
              <p className="text-sm text-muted-foreground">Total Consultations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{data.weekOverview.mostCommonDiagnosis}</p>
              <p className="text-sm text-muted-foreground">Most Common Diagnosis ({data.weekOverview.diagnosisCount} cases)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{data.weekOverview.avgConsultationTime} min</p>
              <p className="text-sm text-muted-foreground">Average Consultation Time</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">98%</p>
              <p className="text-sm text-muted-foreground">Patient Satisfaction</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Weekly Consultations */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Consultations</CardTitle>
            <CardDescription>Daily consultation activity this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.consultationsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="consultations" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Diagnosis Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Diagnosis Distribution</CardTitle>
            <CardDescription>Most common diagnoses this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.diagnosisDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ diagnosis, count }) => `${diagnosis}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.diagnosisDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}