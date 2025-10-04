import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/oflinePrisma";

export async function GET(req: NextRequest) {
  try {
    const drugs = await prisma.drug.findMany({
      where: {
        isDeleted: false
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Add calculated fields
    const drugsWithStatus = drugs.map(drug => {
      const today = new Date();
      const expiryDate = new Date(drug.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      let status = 'in_stock';
      if (expiryDate < today) {
        status = 'expired';
      } else if (daysUntilExpiry <= 30) {
        status = 'expiring_soon';
      } else if (drug.quantity === 0) {
        status = 'out_of_stock';
      } else if (drug.quantity <= drug.reorderLevel) {
        status = 'low_stock';
      }

      return {
        ...drug,
        status,
        daysUntilExpiry
      };
    });

    return NextResponse.json(drugsWithStatus, { status: 200 });
  } catch (error) {
    console.error('Error fetching drugs:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch drugs' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}