import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/oflinePrisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { prescriptionId: string } }
) {
  try {
    const { prescriptionId } = params;

    const prescription = await prisma.prescription.findUnique({
      where: {
        id: prescriptionId,
        isDeleted: false
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            matricNumber: true,
            phone: true,
            profilePhoto: true,
            email: true,
            department: true,
            level: true,
            bloodGroup: true,
            genotype: true,
            allergies: true
          }
        },
        physician: {
          select: {
            firstName: true,
            lastName: true,
            specialization: true,
            qualification: true
          }
        },
        consultation: {
          select: {
            chiefComplaint: true,
            diagnosis: true
          }
        },
        prescriptionItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                genericName: true,
                brandName: true,
                quantity: true,
                batchNumber: true,
                expiryDate: true,
                dosageForm: true,
                strength: true
              }
            }
          }
        }
      }
    });

    if (!prescription) {
      return NextResponse.json(
        { error: 'Prescription not found' },
        { status: 404 }
      );
    }

    const formattedPrescription = {
      id: prescription.id,
      prescriptionNo: prescription.prescriptionNo,
      student: {
        id: prescription.student.id,
        name: `${prescription.student.firstName} ${prescription.student.lastName}`,
        matricNumber: prescription.student.matricNumber,
        phone: prescription.student.phone,
        email: prescription.student.email,
        photo: prescription.student.profilePhoto,
        department: prescription.student.department,
        level: prescription.student.level,
        bloodGroup: prescription.student.bloodGroup,
        genotype: prescription.student.genotype,
        allergies: prescription.student.allergies
      },
      physician: {
        name: `Dr. ${prescription.physician.firstName} ${prescription.physician.lastName}`,
        specialization: prescription.physician.specialization,
        qualification: prescription.physician.qualification
      },
      diagnosis: prescription.diagnosis,
      instructions: prescription.instructions,
      priority: prescription.priority,
      status: prescription.status,
      totalCost: prescription.totalCost,
      createdAt: prescription.createdAt,
      validUntil: prescription.validUntil,
      items: prescription.prescriptionItems.map(item => ({
        id: item.id,
        drugName: item.product.name,
        genericName: item.product.genericName,
        brandName: item.product.brandName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        route: item.route,
        instructions: item.instructions,
        quantityPrescribed: item.quantityPrescribed,
        quantityDispensed: item.quantityDispensed,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        isDispensed: item.isDispensed,
        product: {
          id: item.product.id,
          availableStock: item.product.quantity,
          batchNumber: item.product.batchNumber,
          expiryDate: item.product.expiryDate,
          dosageForm: item.product.dosageForm,
          strength: item.product.strength
        },
        hasStock: item.product.quantity >= item.quantityPrescribed
      }))
    };

    return NextResponse.json(formattedPrescription);
  } catch (error) {
    console.error('Prescription Details API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch prescription details' },
      { status: 500 }
    );
  }
}