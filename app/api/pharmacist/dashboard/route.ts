import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/oflinePrisma";

export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Get today's statistics
    const [
      pendingPrescriptions,
      dispensedToday,
      totalRevenue,
      patientsServed,
      priorityPrescriptions,
      lowStockDrugs,
      expiringDrugs,
      recentActivity
    ] = await Promise.all([
      // Pending prescriptions count
      prisma.prescription.count({
        where: {
          status: 'pending',
          isDeleted: false
        }
      }),

      // Dispensed today count
      prisma.prescription.count({
        where: {
          status: 'dispensed',
          dispensedAt: {
            gte: startOfDay,
            lt: endOfDay
          },
          isDeleted: false
        }
      }),

      // Today's revenue
      prisma.prescription.aggregate({
        where: {
          status: 'dispensed',
          dispensedAt: {
            gte: startOfDay,
            lt: endOfDay
          },
          isDeleted: false
        },
        _sum: {
          amountPaid: true
        }
      }),

      // Unique patients served today
      prisma.prescription.findMany({
        where: {
          status: 'dispensed',
          dispensedAt: {
            gte: startOfDay,
            lt: endOfDay
          },
          isDeleted: false
        },
        select: {
          studentId: true
        },
        distinct: ['studentId']
      }),

      // Priority prescriptions (emergency and urgent)
      prisma.prescription.findMany({
        where: {
          status: 'pending',
          priority: {
            in: ['emergency', 'urgent']
          },
          isDeleted: false
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              matricNumber: true,
              phone: true,
              profilePhoto: true
            }
          },
          physician: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          prescriptionItems: {
            include: {
              product: {
                select: {
                  name: true,
                  quantity: true
                }
              }
            }
          }
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'asc' }
        ],
        take: 5
      }),

      // Low stock drugs (we'll filter in application layer)
      prisma.product.findMany({
        where: {
          quantity: { gt: 0 },
          isDeleted: false
        },
        select: {
          name: true,
          quantity: true,
          reorderLevel: true
        },
        orderBy: {
          quantity: 'asc'
        },
        take: 20 // Get more to filter properly
      }),

      // Drugs expiring in 30 days
      prisma.product.findMany({
        where: {
          expiryDate: {
            gte: today,
            lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
          },
          isDeleted: false
        },
        select: {
          name: true,
          expiryDate: true,
          quantity: true
        },
        orderBy: {
          expiryDate: 'asc'
        },
        take: 5
      }),

      // Recent activity (last 10 dispensals)
      prisma.drugDispensal.findMany({
        where: {
          isDeleted: false
        },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 10
      })
    ]);

    const dashboardData = {
      statistics: {
        pendingPrescriptions,
        dispensedToday,
        revenue: totalRevenue._sum.amountPaid || 0,
        patientsServed: patientsServed.length
      },
      priorityPrescriptions: priorityPrescriptions.map(prescription => ({
        id: prescription.id,
        prescriptionNo: prescription.prescriptionNo,
        student: {
          name: `${prescription.student.firstName} ${prescription.student.lastName}`,
          matricNumber: prescription.student.matricNumber,
          phone: prescription.student.phone,
          photo: prescription.student.profilePhoto
        },
        physician: `Dr. ${prescription.physician.firstName} ${prescription.physician.lastName}`,
        diagnosis: prescription.diagnosis,
        priority: prescription.priority,
        itemCount: prescription.prescriptionItems.length,
        totalCost: prescription.totalCost,
        createdAt: prescription.createdAt,
        items: prescription.prescriptionItems.map(item => ({
          drugName: item.product.name,
          quantity: item.quantityPrescribed,
          available: item.product.quantity,
          hasStock: item.product.quantity >= item.quantityPrescribed
        }))
      })),
      inventoryAlerts: {
        lowStock: lowStockDrugs
          .filter(drug => drug.quantity <= (drug.reorderLevel || 10))
          .slice(0, 5)
          .map(drug => ({
            name: drug.name,
            current: drug.quantity,
            reorderLevel: drug.reorderLevel || 10
          })),
        expiring: expiringDrugs.map(drug => ({
          name: drug.name,
          expiryDate: drug.expiryDate,
          quantity: drug.quantity
        }))
      },
      recentActivity: recentActivity.map(activity => ({
        id: activity.id,
        dispensalNo: activity.dispensalNo,
        studentName: `${activity.student.firstName} ${activity.student.lastName}`,
        prescriptionNo: activity.prescriptionNo,
        amount: activity.totalAmount,
        createdAt: activity.createdAt
      }))
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}