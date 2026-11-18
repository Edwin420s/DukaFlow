import express from 'express';
import { z } from 'zod';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { Supplier } from '../models/Supplier.js';
import { Product } from '../models/Product.js';
import { receiveStock } from '../services/stockService.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { logAudit } from '../services/auditService.js';
import { AppError } from '../shared/errors.js';

export const purchaseOrdersRouter = express.Router();

function generatePoNumber() {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = `${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
  return `PO-${dateStr}-${rand}`;
}

const createPoSchema = z.object({
  supplierId: z.string(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        orderedQuantity: z.number().int().positive(),
        unitCost: z.number().int().min(0) // KES cents
      })
    )
    .min(1),
  expectedDate: z.string().datetime().optional(),
  notes: z.string().optional().default('')
});

const receivePoSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        receivedQuantity: z.number().int().positive()
      })
    )
    .min(1),
  notes: z.string().optional().default('')
});

purchaseOrdersRouter.get('/', requireAuth, async (_req, res, next) => {
  try {
    const purchaseOrders = await PurchaseOrder.find()
      .populate('supplierId', 'name contactPerson phone')
      .sort({ createdAt: -1 });
    res.json({ purchaseOrders });
  } catch (err) {
    next(err);
  }
});

purchaseOrdersRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id).populate('supplierId');
    if (!po) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');
    res.json({ purchaseOrder: po });
  } catch (err) {
    next(err);
  }
});

purchaseOrdersRouter.post('/', requireAuth, requireRole('owner', 'manager', 'inventory'), validateBody(createPoSchema), async (req, res, next) => {
  try {
    const supplier = await Supplier.findById(req.body.supplierId);
    if (!supplier) throw new AppError('Supplier not found', 404, 'NOT_FOUND');

    const poItems = [];
    let totalAmount = 0;

    for (const item of req.body.items) {
      const product = await Product.findById(item.productId);
      if (!product) throw new AppError(`Product ${item.productId} not found`, 404, 'NOT_FOUND');

      const lineTotal = item.unitCost * item.orderedQuantity;
      totalAmount += lineTotal;

      poItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: 0,
        unitCost: item.unitCost,
        totalCost: lineTotal
      });
    }

    const poNumber = generatePoNumber();
    const po = await PurchaseOrder.create({
      poNumber,
      supplierId: supplier._id,
      supplierName: supplier.name,
      items: poItems,
      totalAmount,
      status: 'ordered',
      expectedDate: req.body.expectedDate ? new Date(req.body.expectedDate) : null,
      notes: req.body.notes,
      createdBy: {
        id: req.user._id,
        name: req.user.name
      }
    });

    supplier.totalOrders += 1;
    supplier.totalPurchases += totalAmount;
    await supplier.save();

    await logAudit({
      req,
      action: 'po.created',
      entityType: 'PurchaseOrder',
      entityId: po._id,
      after: { poNumber, totalAmount, supplier: supplier.name }
    });

    res.status(201).json({ purchaseOrder: po });
  } catch (err) {
    next(err);
  }
});

purchaseOrdersRouter.post('/:id/receive', requireAuth, requireRole('owner', 'manager', 'inventory'), validateBody(receivePoSchema), async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) throw new AppError('Purchase order not found', 404, 'NOT_FOUND');

    if (po.status === 'received' || po.status === 'cancelled') {
      throw new AppError(`Cannot receive goods for a ${po.status} purchase order`, 400, 'INVALID_STATUS');
    }

    for (const item of req.body.items) {
      const poItem = po.items.find((i) => String(i.productId) === String(item.productId));
      if (!poItem) continue;

      poItem.receivedQuantity = (poItem.receivedQuantity || 0) + item.receivedQuantity;

      // Update product on-hand inventory and log immutable StockMovement!
      await receiveStock({
        productId: poItem.productId,
        quantity: item.receivedQuantity,
        referenceType: 'purchase_order',
        referenceId: po.poNumber,
        notes: `Received from PO ${po.poNumber}. ${req.body.notes || ''}`,
        actor: req.user
      });
    }

    const allReceived = po.items.every((i) => i.receivedQuantity >= i.orderedQuantity);
    po.status = allReceived ? 'received' : 'partially_received';
    po.receivedAt = new Date();
    await po.save();

    await logAudit({
      req,
      action: 'po.goods_received',
      entityType: 'PurchaseOrder',
      entityId: po._id,
      after: { poNumber: po.poNumber, status: po.status, receivedItems: req.body.items }
    });

    res.json({ message: 'Goods received and inventory updated successfully', purchaseOrder: po });
  } catch (err) {
    next(err);
  }
});
