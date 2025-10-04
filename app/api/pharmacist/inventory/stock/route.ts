import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/oflinePrisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      isDeleted: false
    };

    if (category && category !== 'all') {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          genericName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          brandName: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Add status filtering
    if (status === 'out_of_stock') {
      whereClause.quantity = 0;
    } else if (status === 'low_stock') {
      // For low stock, we'll filter in the application layer since Prisma doesn't support field comparisons easily
      whereClause.quantity = { gt: 0 };
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          genericName: true,
          brandName: true,
          category: true,
          manufacturer: true,
          quantity: true,
          reorderLevel: true,
          maxStockLevel: true,
          retailPrice: true,
          expiryDate: true,
          batchNumber: true,
          dosageForm: true,
          strength: true,
          unit: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: [
          { quantity: 'asc' }, // Show low stock first
          { name: 'asc' }
        ],
        skip: offset,
        take: limit
      }),

      prisma.product.count({
        where: whereClause
      })
    ]);

    // Get stock summary
    const stockSummary = await prisma.product.aggregate({
      where: { isDeleted: false },
      _count: {
        id: true
      }
    });

    const outOfStockCount = await prisma.product.count({
      where: {
        quantity: 0,
        isDeleted: false
      }
    });

    // Get all products to calculate low stock in application layer
    const allProducts = await prisma.product.findMany({
      where: { isDeleted: false, quantity: { gt: 0 } },
      select: { quantity: true, reorderLevel: true }
    });
    
    const lowStockCount = allProducts.filter(p => 
      p.reorderLevel ? p.quantity <= p.reorderLevel : p.quantity <= 10
    ).length;

    // Get categories for filter
    const categories = await prisma.product.findMany({
      where: { isDeleted: false },
      select: { category: true },
      distinct: ['category']
    });

    let formattedProducts = products.map(product => {
      const reorderThreshold = product.reorderLevel || 10;
      const stockPercentage = Math.min((product.quantity / reorderThreshold) * 100, 100);

      let stockStatus: 'out_of_stock' | 'low_stock' | 'healthy' = 'healthy';
      if (product.quantity === 0) {
        stockStatus = 'out_of_stock';
      } else if (product.quantity <= reorderThreshold) {
        stockStatus = 'low_stock';
      }

      return {
        id: product.id,
        name: product.name,
        genericName: product.genericName,
        brandName: product.brandName,
        category: product.category,
        manufacturer: product.manufacturer,
        quantity: product.quantity,
        reorderLevel: product.reorderLevel,
        maxStockLevel: product.maxStockLevel,
        retailPrice: product.retailPrice,
        expiryDate: product.expiryDate,
        batchNumber: product.batchNumber,
        dosageForm: product.dosageForm,
        strength: product.strength,
        unit: product.unit,
        stockStatus,
        stockPercentage,
        isExpiringSoon: product.expiryDate ? 
          new Date(product.expiryDate).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000 
          : false,
        lastUpdated: product.updatedAt
      };
    });

    // Filter by status in application layer if needed
    if (status === 'low_stock') {
      formattedProducts = formattedProducts.filter(p => p.stockStatus === 'low_stock');
    }

    return NextResponse.json({
      products: formattedProducts,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      },
      summary: {
        totalDrugs: stockSummary._count.id,
        inStock: stockSummary._count.id - outOfStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount
      },
      categories: categories.map(c => c.category).filter(Boolean)
    });

  } catch (error) {
    console.error('Stock Levels API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock levels' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, quantity, reason, adjustedBy } = body;

    const result = await prisma.$transaction(async (tx) => {
      // Get current product
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      if (!product) {
        throw new Error('Product not found');
      }

      const oldQuantity = product.quantity;
      const newQuantity = quantity;
      const difference = newQuantity - oldQuantity;

      // Update product quantity
      await tx.product.update({
        where: { id: productId },
        data: {
          quantity: newQuantity,
          updatedAt: new Date()
        }
      });

      // Record stock movement (if you have this model)
      // await tx.drugStockMovement.create({
      //   data: {
      //     drugId: productId,
      //     type: difference > 0 ? 'in' : 'out',
      //     quantity: Math.abs(difference),
      //     reason,
      //     balanceAfter: newQuantity,
      //     createdBy: adjustedBy
      //   }
      // });

      return { oldQuantity, newQuantity, difference };
    });

    return NextResponse.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result
    });

  } catch (error) {
    console.error('Stock Adjustment API Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to adjust stock' 
      },
      { status: 500 }
    );
  }
}