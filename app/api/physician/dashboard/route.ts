import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/oflinePrisma"
import { getServerSession } from "next-auth"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get physician ID from session or query
    const physicianId = session.user.id // Assuming user ID is physician ID

    // Get today's date range
    const today = new Date()
    const startOfDay = new Date(today.setHours(0, 0, 0, 0))
    const endOfDay = new Date(today.setHours(23, 59, 59, 999))

    // Get this week's date range
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())
    startOfWeek.setHours(0, 0, 0, 0)

    // Fetch today's stats
    const [
      todayConsultations,
      todayPrescriptions,
      currentQueue,
      todayAppointments,
      weekConsultations
    ] = await Promise.all([
      // Today's completed consultations
      prisma.consultation.count({
        where: {
          physicianId,
          status: "completed",
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          isDeleted: false
        }
      }),

      // Today's prescriptions
      prisma.prescription.count({
        where: {
          physicianId,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay
          },
          isDeleted: false
        }
      }),

      // Current queue
      prisma.queue.findMany({
        where: {
          status: "waiting",
          isDeleted: false
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              matricNumber: true
            }
          }
        },
        orderBy: {
          queueNumber: 'asc'
        },
        take: 10
      }),

      // Today's appointments
      prisma.appointment.findMany({
        where: {
          physicianId,
          appointmentDate: {
            gte: startOfDay,
            lte: endOfDay
          },
          isDeleted: false
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              matricNumber: true
            }
          }
        },
        orderBy: {
          appointmentTime: 'asc'
        }
      }),

      // This week's consultations
      prisma.consultation.findMany({
        where: {
          physicianId,
          createdAt: {
            gte: startOfWeek
          },
          isDeleted: false
        },
        select: {
          diagnosis: true,
          createdAt: true,
          status: true
        }
      })
    ])

    // Calculate unique patients today
    const todayPatients = await prisma.consultation.findMany({
      where: {
        physicianId,
        status: "completed",
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        },
        isDeleted: false
      },
      select: {
        studentId: true
      },
      distinct: ['studentId']
    })

    // Process queue data
    const queueData = currentQueue.map((item, index) => ({
      id: item.id,
      studentName: `${item.student.firstName} ${item.student.lastName}`,
      matricNumber: item.student.matricNumber,
      priority: item.priority,
      complaint: item.notes || "General consultation",
      waitTime: calculateWaitTime(item.checkInTime)
    }))

    // Process appointments data
    const appointmentsData = todayAppointments.map(appointment => ({
      id: appointment.id,
      time: appointment.appointmentTime,
      studentName: `${appointment.student.firstName} ${appointment.student.lastName}`,
      type: appointment.reason,
      status: appointment.status
    }))

    // Calculate diagnosis distribution
    const diagnosisCount: { [key: string]: number } = {}
    weekConsultations.forEach(consultation => {
      const diagnosis = consultation.diagnosis || "Other"
      diagnosisCount[diagnosis] = (diagnosisCount[diagnosis] || 0) + 1
    })

    const diagnosisDistribution = Object.entries(diagnosisCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([diagnosis, count], index) => ({
        diagnosis,
        count,
        color: getColorForIndex(index)
      }))

    // Calculate consultations by day
    const consultationsByDay = calculateConsultationsByDay(weekConsultations)

    // Find most common diagnosis
    const mostCommonDiagnosis = Object.entries(diagnosisCount)
      .sort(([,a], [,b]) => b - a)[0]

    const dashboardData = {
      todayStats: {
        patientsCompleted: todayPatients.length,
        consultationsCompleted: todayConsultations,
        prescriptionsWritten: todayPrescriptions,
        inQueue: currentQueue.length
      },
      currentQueue: queueData,
      todayAppointments: appointmentsData,
      weekOverview: {
        totalConsultations: weekConsultations.length,
        mostCommonDiagnosis: mostCommonDiagnosis ? mostCommonDiagnosis[0] : "N/A",
        diagnosisCount: mostCommonDiagnosis ? mostCommonDiagnosis[1] : 0,
        avgConsultationTime: 15 // This would need to be calculated from actual consultation durations
      },
      consultationsByDay,
      diagnosisDistribution
    }

    return NextResponse.json(dashboardData)

  } catch (error) {
    console.error("Dashboard API Error:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

function calculateWaitTime(checkInTime: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - checkInTime.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 60) {
    return `${diffMins} mins`
  } else {
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }
}

function getColorForIndex(index: number): string {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7"]
  return colors[index] || "#CCCCCC"
}

function calculateConsultationsByDay(consultations: any[]): Array<{day: string, consultations: number}> {
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const consultationsByDay: { [key: string]: number } = {}
  
  // Initialize all days with 0
  dayNames.forEach(day => {
    consultationsByDay[day] = 0
  })
  
  // Count consultations by day
  consultations.forEach(consultation => {
    const day = dayNames[new Date(consultation.createdAt).getDay()]
    consultationsByDay[day]++
  })
  
  return dayNames.map(day => ({
    day,
    consultations: consultationsByDay[day]
  }))
}