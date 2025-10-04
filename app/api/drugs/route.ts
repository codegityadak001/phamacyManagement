import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/oflinePrisma";

export async function GET(req: NextRequest) {
  try {
    const drugs = await prisma.drug.findMany({
      where: {
        isDeleted: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, drugs }, { status: 200 });
  } catch (error) {
    console.error('Error fetching drugs:', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch drugs' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      code,
      name,
      category,
      manufacturer,
      description,
      activeIngredient,
      strength,
      dosageForm,
      quantity,
      reorderLevel,
      price,
      cost,
      expiryDate,
      batchNumber,
      unit,
      storageConditions,
      prescriptionRequired,
      createdBy
    } = data;

    // Check if drug code already exists
    const existingDrug = await prisma.drug.findFirst({
      where: {
        code,
        isDeleted: false
      }
    });

    if (existingDrug) {
      return NextResponse.json({ success: false, message: 'Drug code already exists' }, { status: 409 });
    }

    // Create the drug
    const drug = await prisma.drug.create({
      data: {
        code,
        name,
        category,
        manufacturer,
        description,
        activeIngredient,
        strength,
        dosageForm,
        quantity: parseInt(quantity),
        reorderLevel: parseInt(reorderLevel),
        price: parseFloat(price),
        cost: parseFloat(cost),
        expiryDate: new Date(expiryDate),
        batchNumber,
        unit: unit || 'Pieces',
        storageConditions,
        prescriptionRequired: prescriptionRequired || false,
        createdBy,
        sync: false,
        syncedAt: null
      }
    });

    return NextResponse.json({ success: true, drug }, { status: 201 });
  } catch (error) {
    console.error('Error creating drug:', error);
    return NextResponse.json({ success: false, message: 'Failed to create drug' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const {
      drugId,
      code,
      name,
      category,
      manufacturer,
      description,
      activeIngredient,
      strength,
      dosageForm,
      quantity,
      reorderLevel,
      price,
      cost,
      expiryDate,
      batchNumber,
      unit,
      storageConditions,
      prescriptionRequired
    } = data;

    // Check if drug exists
    const existingDrug = await prisma.drug.findUnique({
      where: { id: drugId, isDeleted: false }
    });

    if (!existingDrug) {
      return NextResponse.json({ success: false, message: 'Drug does not exist' }, { status: 404 });
    }

    // Check if new code conflicts with another drug (if code is being changed)
    if (code !== existingDrug.code) {
      const codeConflict = await prisma.drug.findFirst({
        where: {
          code,
          isDeleted: false,
          id: { not: drugId }
        }
      });

      if (codeConflict) {
        return NextResponse.json({ success: false, message: 'Drug code already exists' }, { status: 409 });
      }
    }

    // Update the drug
    const updatedDrug = await prisma.drug.update({
      where: { id: drugId },
      data: {
        code,
        name,
        category,
        manufacturer,
        description,
        activeIngredient,
        strength,
        dosageForm,
        quantity: parseInt(quantity),
        reorderLevel: parseInt(reorderLevel),
        price: parseFloat(price),
        cost: parseFloat(cost),
        expiryDate: new Date(expiryDate),
        batchNumber,
        unit,
        storageConditions,
        prescriptionRequired,
        sync: false,
        syncedAt: null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, drug: updatedDrug }, { status: 200 });
  } catch (error) {
    console.error('Error updating drug:', error);
    return NextResponse.json({ success: false, message: 'Failed to update drug' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { drugId } = await req.json();

    const drug = await prisma.drug.findUnique({
      where: { id: drugId }
    });

    if (!drug) {
      return NextResponse.json({ success: false, message: 'Drug does not exist' }, { status: 404 });
    }

    const deletedDrug = await prisma.drug.update({
      where: { id: drugId },
      data: {
        isDeleted: true,
        sync: false,
        syncedAt: null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, drug: deletedDrug }, { status: 200 });
  } catch (error) {
    console.error('Error deleting drug:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete drug' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}