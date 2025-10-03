import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client/generated/database";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      status: 'pending',
      isDeleted: false
    };

    if (priority && priority !== 'all') {
      whereClause.priority = priority;
    }

    if (search) {
      whereClause.OR = [
        {
          prescriptionNo: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          student: {
            OR: [
              {
                firstName: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                lastName: {
                  contains: search,
                  mode: 'insensitive'
                }
              },
              {
                matricNumber: {
                  contains: search,
                  mode: 'insensitive'
                }
              }
            ]
          }
        }
      ];
    }

    const [prescriptions, totalCount] = await Promise.all([
      prisma.prescription.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
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
              lastName: true,
              specialization: true
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
          { priority: 'asc' }, // emergency first, then urgent, then normal
          { createdAt: 'asc' }
        ],
        skip: offset,
        take: limit
      }),

      prisma.prescription.count({
        where: whereClause
      })
    ]);

    // Get priority counts for filters
    const priorityCounts = await prisma.prescription.groupBy({
      by: ['priority'],
      where: {
        status: 'pending',
        isDeleted: false
      },
      _count: {
        priority: true
      }
    });

    const formattedPrescriptions = prescriptions.map(prescription => ({
      id: prescription.id,
      prescriptionNo: prescription.prescriptionNo,
      student: {
        id: prescription.student.id,
        name: `${prescription.student.firstName} ${prescription.student.lastName}`,
        matricNumber: prescription.student.matricNumber,
        phone: prescription.student.phone,
        photo: prescription.student.profilePhoto
      },
      physician: {
        name: `Dr. ${prescription.physician.firstName} ${prescription.physician.lastName}`,
        specialization: prescription.physician.specialization
      },
      diagnosis: prescription.diagnosis,
      priority: prescription.priority,
      itemCount: prescription.prescriptionItems.length,
      totalCost: prescription.totalCost,
      createdAt: prescription.createdAt,
      items: prescription.prescriptionItems.map(item => ({
        id: item.id,
        drugName: item.product.name,
        quantity: item.quantityPrescribed,
        available: item.product.quantity,
        hasStock: item.product.quantity >= item.quantityPrescribed,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      })),
      hasStockIssues: prescription.prescriptionItems.some(
        item => item.product.quantity < item.quantityPrescribed
      )
    }));

    const priorityCountMap = priorityCounts.reduce((acc, item) => {
      acc[item.priority] = item._count.priority;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      prescriptions: formattedPrescriptions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      priorityCounts: {
        all: totalCount,
        emergency: priorityCountMap.emergency || 0,
        urgent: priorityCountMap.urgent || 0,
        normal: priorityCountMap.normal || 0
      }
    });
  } catch (error) {
    console.error('Pending Prescriptions API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending prescriptions' },
      { status: 500 }
    );
  }
}