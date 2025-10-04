import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/oflinePrisma";

function generateDispensalNo(): string {
  const now = new Date();
  const year = now.getFullYear();
  const timestamp = now.getTime().toString().slice(-6);
  return `DISP-${year}-${timestamp}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { prescriptionId: string } }
) {
  try {
    const { prescriptionId } = params;
    const body = await request.json();
    const { 
      dispensedItems, 
      totalAmount, 
      amountPaid, 
      paymentMethod, 
      notes, 
      dispensedBy 
    } = body;

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify prescription exists and is pending
      const prescription = await tx.prescription.findUnique({
        where: { id: prescriptionId, isDeleted: false },
        include: {
          student: true,
          prescriptionItems: {
            include: {
              product: true
            }
          }
        }
      });

      if (!prescription) {
        throw new Error('Prescription not found');
      }

      if (prescription.status !== 'pending') {
        throw new Error('Prescription is not in pending status');
      }

      // 2. Verify stock availability for all items
      for (const dispensedItem of dispensedItems) {
        const prescriptionItem = prescription.prescriptionItems.find(
          item => item.id === dispensedItem.itemId
        );
        
        if (!prescriptionItem) {
          throw new Error(`Prescription item not found: ${dispensedItem.itemId}`);
        }

        if (prescriptionItem.product.quantity < dispensedItem.quantityDispensed) {
          throw new Error(
            `Insufficient stock for ${prescriptionItem.product.name}. Available: ${prescriptionItem.product.quantity}, Required: ${dispensedItem.quantityDispensed}`
          );
        }
      }

      // 3. Create drug dispensal record
      const dispensal = await tx.drugDispensal.create({
        data: {
          dispensalNo: generateDispensalNo(),
          prescriptionId: prescription.id,
          prescriptionNo: prescription.prescriptionNo,
          studentId: prescription.studentId,
          dispensedBy,
          dispensedItems: JSON.stringify(dispensedItems),
          totalAmount,
          notes
        }
      });

      // 4. Update prescription items
      for (const dispensedItem of dispensedItems) {
        await tx.prescriptionItem.update({
          where: { id: dispensedItem.itemId },
          data: {
            quantityDispensed: dispensedItem.quantityDispensed,
            isDispensed: true,
            dispensedAt: new Date(),
            dispensedBy
          }
        });

        // 5. Deduct from product inventory
        await tx.product.update({
          where: { id: dispensedItem.productId },
          data: {
            quantity: {
              decrement: dispensedItem.quantityDispensed
            }
          }
        });
      }

      // 6. Update prescription status
      const allItemsDispensed = dispensedItems.length === prescription.prescriptionItems.length;
      await tx.prescription.update({
        where: { id: prescription.id },
        data: {
          status: allItemsDispensed ? 'dispensed' : 'partially_dispensed',
          isDispensed: allItemsDispensed,
          dispensedAt: allItemsDispensed ? new Date() : undefined,
          dispensedBy: allItemsDispensed ? dispensedBy : undefined,
          amountPaid
        }
      });

      // 7. Record payment transaction
      if (amountPaid > 0) {
        await tx.balanceTransaction.create({
          data: {
            studentId: prescription.studentId,
            amount: amountPaid,
            type: 'DEBIT',
            description: `Payment for prescription ${prescription.prescriptionNo}`,
            paymentMethod,
            prescriptionId: prescription.id,
            balanceAfter: 0 // You might want to calculate actual balance
          }
        });
      }

      return {
        dispensal,
        prescription: {
          ...prescription,
          status: allItemsDispensed ? 'dispensed' : 'partially_dispensed'
        }
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Prescription dispensed successfully',
      data: {
        dispensalNo: result.dispensal.dispensalNo,
        prescriptionNo: result.prescription.prescriptionNo,
        studentName: `${result.prescription.student.firstName} ${result.prescription.student.lastName}`,
        totalAmount,
        amountPaid,
        change: amountPaid - totalAmount
      }
    });

  } catch (error) {
    console.error('Dispense Prescription API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to dispense prescription' 
      },
      { status: 500 }
    );
  }
}