import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Payment } from '../models/Payment.js';

export async function getDashboardMetrics() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [todayOrders, lowStockProducts, pendingFulfilment, recentOrders] = await Promise.all([
    Order.find({ createdAt: { $gte: startOfToday }, orderStatus: { $ne: 'cancelled' } }),
    Product.find({ status: 'active' }),
    Order.countDocuments({ fulfilmentStatus: { $in: ['unfulfilled', 'packing'] }, orderStatus: { $ne: 'cancelled' } }),
    Order.find().sort({ createdAt: -1 }).limit(8)
  ]);

  const todaySales = todayOrders.reduce((sum, o) => sum + (o.paymentStatus === 'paid' ? o.grandTotal : 0), 0);
  const lowStockCount = lowStockProducts.filter((p) => Math.max(0, p.onHand - p.reserved) <= p.lowStockThreshold).length;

  return {
    todaySales,
    todayOrderCount: todayOrders.length,
    lowStockCount,
    pendingFulfilmentCount: pendingFulfilment,
    recentOrders
  };
}

export async function getSalesReport({ startDate, endDate }) {
  const filter = { orderStatus: { $ne: 'cancelled' } };
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const orders = await Order.find(filter).sort({ createdAt: -1 });

  let totalRevenue = 0;
  let totalDiscounts = 0;
  let totalTaxes = 0;
  let totalDeliveryFees = 0;
  let paidOrdersCount = 0;

  for (const o of orders) {
    if (o.paymentStatus === 'paid') {
      totalRevenue += o.grandTotal;
      paidOrdersCount += 1;
    }
    totalDiscounts += o.discountTotal || 0;
    totalTaxes += o.taxTotal || 0;
    totalDeliveryFees += o.deliveryFee || 0;
  }

  return {
    ordersCount: orders.length,
    paidOrdersCount,
    totalRevenue,
    totalDiscounts,
    totalTaxes,
    totalDeliveryFees,
    orders
  };
}

export async function getInventoryValuationReport() {
  const products = await Product.find({ status: 'active' }).populate('categoryId', 'name');

  let totalSkus = products.length;
  let totalUnits = 0;
  let totalCostValue = 0; // KES cents
  let totalRetailValue = 0; // KES cents

  const rows = products.map((p) => {
    const onHand = p.onHand || 0;
    const costVal = onHand * (p.costPrice || 0);
    const retailVal = onHand * (p.sellingPrice || 0);

    totalUnits += onHand;
    totalCostValue += costVal;
    totalRetailValue += retailVal;

    return {
      sku: p.sku,
      name: p.name,
      category: p.categoryName || 'General',
      onHand,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      totalCostValue: costVal,
      totalRetailValue: retailVal,
      marginPercent: p.sellingPrice > 0 ? (((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100).toFixed(1) : 0
    };
  });

  const projectedProfit = Math.max(0, totalRetailValue - totalCostValue);

  return {
    totalSkus,
    totalUnits,
    totalCostValue,
    totalRetailValue,
    projectedProfit,
    rows
  };
}

export async function getPaymentBreakdownReport() {
  const payments = await Payment.find({ status: 'paid' });

  const summary = {
    cash: { count: 0, total: 0 },
    mpesa: { count: 0, total: 0 },
    simulated: { count: 0, total: 0 }
  };

  for (const p of payments) {
    if (summary[p.method]) {
      summary[p.method].count += 1;
      summary[p.method].total += p.amount;
    }
  }

  return summary;
}

export function formatToCsv(headers, rows) {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const headerLine = headers.map((h) => escapeCsv(h.label)).join(',');
  const rowLines = rows.map((r) => headers.map((h) => escapeCsv(r[h.key])).join(','));
  return [headerLine, ...rowLines].join('\n');
}
