import express from 'express';
import {
  getDashboardMetrics,
  getSalesReport,
  getInventoryValuationReport,
  getPaymentBreakdownReport,
  formatToCsv
} from '../services/reportService.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

export const reportsRouter = express.Router();

reportsRouter.get('/dashboard', requireAuth, requireRole('owner', 'manager'), async (_req, res, next) => {
  try {
    const data = await getDashboardMetrics();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/sales', requireAuth, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await getSalesReport({ startDate, endDate });
    res.json(report);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/sales/csv', requireAuth, requireRole('owner', 'manager'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const report = await getSalesReport({ startDate, endDate });

    const headers = [
      { key: 'orderNumber', label: 'Order Number' },
      { key: 'createdAt', label: 'Date' },
      { key: 'customerName', label: 'Customer' },
      { key: 'customerPhone', label: 'Phone' },
      { key: 'orderStatus', label: 'Order Status' },
      { key: 'paymentStatus', label: 'Payment Status' },
      { key: 'paymentMethod', label: 'Payment Method' },
      { key: 'subtotalKes', label: 'Subtotal (KES)' },
      { key: 'discountKes', label: 'Discount (KES)' },
      { key: 'taxKes', label: 'Tax (KES)' },
      { key: 'deliveryKes', label: 'Delivery (KES)' },
      { key: 'grandTotalKes', label: 'Total (KES)' }
    ];

    const rows = report.orders.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: new Date(o.createdAt).toISOString().slice(0, 10),
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      orderStatus: o.orderStatus,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      subtotalKes: (o.subtotal / 100).toFixed(2),
      discountKes: ((o.discountTotal || 0) / 100).toFixed(2),
      taxKes: ((o.taxTotal || 0) / 100).toFixed(2),
      deliveryKes: ((o.deliveryFee || 0) / 100).toFixed(2),
      grandTotalKes: (o.grandTotal / 100).toFixed(2)
    }));

    const csv = formatToCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dukaflow_sales_report.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/inventory-valuation', requireAuth, async (_req, res, next) => {
  try {
    const report = await getInventoryValuationReport();
    res.json(report);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/inventory-valuation/csv', requireAuth, requireRole('owner', 'manager'), async (_req, res, next) => {
  try {
    const report = await getInventoryValuationReport();
    const headers = [
      { key: 'sku', label: 'SKU' },
      { key: 'name', label: 'Product Name' },
      { key: 'category', label: 'Category' },
      { key: 'onHand', label: 'Quantity On Hand' },
      { key: 'costPriceKes', label: 'Cost Price (KES)' },
      { key: 'sellingPriceKes', label: 'Selling Price (KES)' },
      { key: 'costValKes', label: 'Total Cost Value (KES)' },
      { key: 'retailValKes', label: 'Total Retail Value (KES)' },
      { key: 'marginPercent', label: 'Gross Margin %' }
    ];

    const rows = report.rows.map((r) => ({
      sku: r.sku,
      name: r.name,
      category: r.category,
      onHand: r.onHand,
      costPriceKes: (r.costPrice / 100).toFixed(2),
      sellingPriceKes: (r.sellingPrice / 100).toFixed(2),
      costValKes: (r.totalCostValue / 100).toFixed(2),
      retailValKes: (r.totalRetailValue / 100).toFixed(2),
      marginPercent: r.marginPercent
    }));

    const csv = formatToCsv(headers, rows);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="dukaflow_inventory_valuation.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get('/payments', requireAuth, async (_req, res, next) => {
  try {
    const report = await getPaymentBreakdownReport();
    res.json({ report });
  } catch (err) {
    next(err);
  }
});
