import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { Shop } from './models/Shop.js';
import { User } from './models/User.js';
import { Category } from './models/Category.js';
import { Product } from './models/Product.js';
import { Supplier } from './models/Supplier.js';
import { PurchaseOrder } from './models/PurchaseOrder.js';
import { Coupon } from './models/Coupon.js';
import { Order } from './models/Order.js';
import { Payment } from './models/Payment.js';
import { Customer } from './models/Customer.js';
import { StockMovement } from './models/StockMovement.js';
import { Notification } from './models/Notification.js';
import { hashPassword } from './services/authService.js';

export async function runSeed() {
  await connectDatabase();
  console.log('Connected to MongoDB. Seeding enterprise demo data...');

  // 1. Shop Configuration
  await Shop.deleteMany({});
  const shop = await Shop.create({
    name: 'DukaFlow Groceries & General Store',
    slug: 'dukaflow',
    description: 'Fresh vegetables, dairy, grains, and daily household essentials delivered straight to your door or ready for express counter pickup.',
    phone: '+254 711 000 123',
    email: 'hello@dukaflow.co.ke',
    address: {
      street: 'Shop 14, Biashara Plaza, Commercial Street',
      city: 'Nairobi',
      country: 'Kenya'
    },
    currency: 'KES',
    currencySymbol: 'KSh',
    timezone: 'Africa/Nairobi',
    taxRate: 16,
    receiptHeader: 'DUKAFLOW RETAIL STORES NAIROBI\nKRA PIN: P051987654A\nVAT NO: 01928374-B',
    receiptFooter: 'Asante sana for shopping at DukaFlow!\nGoods once sold may be returned within 48h in original condition.\nPowered by DukaFlow Enterprise Retail OS.',
    businessHours: {
      open: '07:30',
      close: '21:00',
      isOpen: true
    },
    deliveryZones: [
      { name: 'Nairobi CBD & Immediate Area', fee: 15000, estimatedTime: '30-45 mins', active: true },
      { name: 'Westlands / Parklands', fee: 25000, estimatedTime: '45-60 mins', active: true },
      { name: 'Kilimani / Kileleshwa / Lavington', fee: 20000, estimatedTime: '45-60 mins', active: true },
      { name: 'Karen / Langata', fee: 40000, estimatedTime: '60-90 mins', active: true }
    ],
    mpesaConfig: {
      enabled: true,
      environment: 'sandbox',
      shortcode: '174379',
      passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
      consumerKey: env.MPESA_CONSUMER_KEY || '',
      consumerSecret: env.MPESA_CONSUMER_SECRET || '',
      callbackUrl: 'http://localhost:4000/api/v1/payments/mpesa/callback'
    }
  });

  // 2. Users (Owner, Cashier, Manager)
  await User.deleteMany({});
  const defaultPass = await hashPassword('DukaFlow2026!');

  const owner = await User.create({
    name: 'Edwin Mwiti',
    email: 'owner@dukaflow.co.ke',
    phone: '+254712345678',
    passwordHash: defaultPass,
    role: 'owner',
    permissions: ['*'],
    status: 'active',
    shopId: shop._id
  });

  const manager = await User.create({
    name: 'Wanjiku Kamau',
    email: 'manager@dukaflow.co.ke',
    phone: '+254722334455',
    passwordHash: defaultPass,
    role: 'manager',
    permissions: ['products.*', 'orders.*', 'inventory.*', 'reports.view'],
    status: 'active',
    shopId: shop._id
  });

  const cashier = await User.create({
    name: 'Brian Omondi',
    email: 'cashier@dukaflow.co.ke',
    phone: '+254733445566',
    passwordHash: defaultPass,
    role: 'cashier',
    permissions: ['orders.create', 'orders.view', 'payments.cash'],
    status: 'active',
    shopId: shop._id
  });

  // 3. Categories
  await Category.deleteMany({});
  const catProduce = await Category.create({
    name: 'Fresh Produce',
    slug: 'fresh-produce',
    description: 'Farm-fresh vegetables, herbs, and fruits sourced daily.',
    icon: 'Apple',
    isActive: true,
    sortOrder: 1
  });

  const catGrains = await Category.create({
    name: 'Grains, Flour & Baking',
    slug: 'grains-flour',
    description: 'Premium maize meal, wheat flour, rice and staple cereals.',
    icon: 'Wheat',
    isActive: true,
    sortOrder: 2
  });

  const catDairy = await Category.create({
    name: 'Dairy, Eggs & Bakery',
    slug: 'dairy-bakery',
    description: 'Fresh milk, butter, yoghurt, farm eggs and breads.',
    icon: 'Milk',
    isActive: true,
    sortOrder: 3
  });

  const catBeverages = await Category.create({
    name: 'Beverages & Tea',
    slug: 'beverages',
    description: 'Highland Kenyan tea, coffee, juices and drinking waters.',
    icon: 'Coffee',
    isActive: true,
    sortOrder: 4
  });

  const catHousehold = await Category.create({
    name: 'Household & Cleaning',
    slug: 'household',
    description: 'Soaps, detergents, sanitizers and home cleaning essentials.',
    icon: 'Sparkles',
    isActive: true,
    sortOrder: 5
  });

  // 4. Products
  await Product.deleteMany({});
  await StockMovement.deleteMany({});

  const productDefs = [
    {
      name: 'Unga Wa Dola Premium Maize Meal 2kg',
      slug: 'unga-dola-2kg',
      sku: 'UNGA-DOL-2KG',
      barcode: '616110000101',
      description: 'Finely milled fortified grade-1 maize flour for soft, delicious ugali.',
      categoryId: catGrains._id,
      categoryName: catGrains.name,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
      unit: '2kg packet',
      costPrice: 17500, // KES 175.00
      sellingPrice: 22000, // KES 220.00
      taxCategory: 'zero_rated', // Maize meal is zero-rated in Kenya
      taxRate: 0,
      onHand: 48,
      reserved: 0,
      lowStockThreshold: 10
    },
    {
      name: 'Jogoo Superior Maize Flour 2kg',
      slug: 'jogoo-maize-flour-2kg',
      sku: 'UNGA-JOG-2KG',
      barcode: '616110000102',
      description: 'The household favorite maize meal enriched with essential vitamins and minerals.',
      categoryId: catGrains._id,
      categoryName: catGrains.name,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80',
      unit: '2kg packet',
      costPrice: 17000,
      sellingPrice: 21500,
      taxCategory: 'zero_rated',
      taxRate: 0,
      onHand: 60,
      reserved: 0,
      lowStockThreshold: 10
    },
    {
      name: 'Brookside Homogenized Fresh Milk 500ml',
      slug: 'brookside-fresh-milk-500ml',
      sku: 'MILK-BRK-500',
      barcode: '616110000201',
      description: 'Pasteurised, fresh whole cows milk from dairy farms in the Rift Valley.',
      categoryId: catDairy._id,
      categoryName: catDairy.name,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80',
      unit: 'pouch 500ml',
      costPrice: 5400, // KES 54.00
      sellingPrice: 6500, // KES 65.00
      taxCategory: 'standard',
      taxRate: 16,
      onHand: 65,
      reserved: 0,
      lowStockThreshold: 12
    },
    {
      name: 'Tuzo Long-Life Whole Milk 500ml',
      slug: 'tuzo-whole-milk-500ml',
      sku: 'MILK-TUZ-500',
      barcode: '616110000202',
      description: 'Creamy, rich homogenized wholesome cow milk.',
      categoryId: catDairy._id,
      categoryName: catDairy.name,
      imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=600&q=80',
      unit: 'pouch 500ml',
      costPrice: 5400,
      sellingPrice: 6500,
      taxCategory: 'standard',
      taxRate: 16,
      onHand: 40,
      reserved: 0,
      lowStockThreshold: 10
    },
    {
      name: 'Golden Fry Pure Vegetable Cooking Oil 1L',
      slug: 'golden-fry-cooking-oil-1l',
      sku: 'OIL-GLD-1L',
      barcode: '616110000301',
      description: 'Triple refined pure palm cooking oil enriched with vitamins A & D.',
      categoryId: catGrains._id,
      categoryName: catGrains.name,
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=600&q=80',
      unit: '1 Litre bottle',
      costPrice: 28000, // KES 280.00
      sellingPrice: 34000, // KES 340.00
      taxCategory: 'standard',
      taxRate: 16,
      onHand: 30,
      reserved: 0,
      lowStockThreshold: 8
    },
    {
      name: 'Farm Fresh Ripe Red Tomatoes 1kg',
      slug: 'fresh-tomatoes-1kg',
      sku: 'VEG-TOM-1KG',
      barcode: '616110000401',
      description: 'Juicy, firm field-grown tomatoes perfect for salads, sauces, and stews.',
      categoryId: catProduce._id,
      categoryName: catProduce.name,
      imageUrl: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
      unit: '1 kg',
      costPrice: 8500, // KES 85.00
      sellingPrice: 13000, // KES 130.00
      taxCategory: 'zero_rated',
      taxRate: 0,
      onHand: 45,
      reserved: 0,
      lowStockThreshold: 10
    },
    {
      name: 'Sukuma Wiki Fresh Collard Greens Bunch',
      slug: 'sukuma-wiki-bunch',
      sku: 'VEG-SKM-BNC',
      barcode: '616110000402',
      description: 'Crisp, organically grown tender kales freshly picked every dawn.',
      categoryId: catProduce._id,
      categoryName: catProduce.name,
      imageUrl: 'https://images.unsplash.com/photo-1524179091875-bf99a9a6fa57?auto=format&fit=crop&w=600&q=80',
      unit: 'bunch',
      costPrice: 2000, // KES 20.00
      sellingPrice: 3500, // KES 35.00
      taxCategory: 'zero_rated',
      taxRate: 0,
      onHand: 90,
      reserved: 0,
      lowStockThreshold: 15
    },
    {
      name: 'Red Bulb Onions 1kg',
      slug: 'red-onions-1kg',
      sku: 'VEG-ONI-1KG',
      barcode: '616110000403',
      description: 'Pungent, flavorful cured red onions with thick dry skin for longer shelf life.',
      categoryId: catProduce._id,
      categoryName: catProduce.name,
      imageUrl: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=600&q=80',
      unit: '1 kg',
      costPrice: 9500,
      sellingPrice: 14500,
      taxCategory: 'zero_rated',
      taxRate: 0,
      onHand: 35,
      reserved: 0,
      lowStockThreshold: 10
    },
    {
      name: 'Ketepa Pride Tagged Tea Bags 100s',
      slug: 'ketepa-pride-tea-bags-100s',
      sku: 'BEV-KTP-100',
      barcode: '616110000701',
      description: '100% pure Kenyan black tea bags with bold, brisk aroma.',
      categoryId: catBeverages._id,
      categoryName: catBeverages.name,
      imageUrl: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?auto=format&fit=crop&w=600&q=80',
      unit: 'box (100 bags)',
      costPrice: 19000,
      sellingPrice: 24500,
      taxCategory: 'standard',
      taxRate: 16,
      onHand: 3, // LOW STOCK TRIGGER FOR DASHBOARD WARNING!
      reserved: 0,
      lowStockThreshold: 5
    },
    {
      name: 'Omo Active Auto Washing Powder 1kg',
      slug: 'omo-washing-powder-1kg',
      sku: 'HSE-OMO-1KG',
      barcode: '616110000601',
      description: 'Tough stain removal powder detergent with lasting floral freshness.',
      categoryId: catHousehold._id,
      categoryName: catHousehold.name,
      imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=600&q=80',
      unit: '1kg bag',
      costPrice: 29000,
      sellingPrice: 35000,
      taxCategory: 'standard',
      taxRate: 16,
      onHand: 24,
      reserved: 0,
      lowStockThreshold: 5
    }
  ];

  const createdProducts = [];
  for (const def of productDefs) {
    const prod = await Product.create(def);
    createdProducts.push(prod);

    // Initial stock ledger entry
    await StockMovement.create({
      productId: prod._id,
      productName: prod.name,
      sku: prod.sku,
      change: prod.onHand,
      previousOnHand: 0,
      newOnHand: prod.onHand,
      reason: 'count_correction',
      referenceType: 'manual',
      notes: 'Initial inventory baseline',
      actorId: owner._id,
      actorName: owner.name
    });
  }

  // 5. Suppliers
  await Supplier.deleteMany({});
  const supGrains = await Supplier.create({
    name: 'Unga Holdings Grain Mills Ltd',
    contactPerson: 'David Kilonzo',
    email: 'sales@ungaholdings.co.ke',
    phone: '+254722100200',
    address: 'Commercial Street, Industrial Area, Nairobi',
    taxPin: 'P051122334K',
    status: 'active',
    notes: 'Primary national distributor for maize meal and baking flour.',
    totalOrders: 4,
    totalPurchases: 45000000
  });

  const supDairy = await Supplier.create({
    name: 'Brookside Dairy Distributors',
    contactPerson: 'Grace Njeri',
    email: 'orders@brooksidedairy.co.ke',
    phone: '+254733200300',
    address: 'Thika Superhighway, Ruiru Hub',
    taxPin: 'P059988776M',
    status: 'active',
    notes: 'Daily early morning delivery by 06:30 AM.',
    totalOrders: 8,
    totalPurchases: 28000000
  });

  // 6. Purchase Orders
  await PurchaseOrder.deleteMany({});
  const samplePo = await PurchaseOrder.create({
    poNumber: 'PO-202611-101',
    supplierId: supGrains._id,
    supplierName: supGrains.name,
    items: [
      {
        productId: createdProducts[0]._id,
        productName: createdProducts[0].name,
        sku: createdProducts[0].sku,
        orderedQuantity: 50,
        receivedQuantity: 50,
        unitCost: 17500,
        totalCost: 875000
      }
    ],
    status: 'received',
    totalAmount: 875000,
    expectedDate: new Date(),
    receivedAt: new Date(),
    notes: 'Delivered in good condition on morning freight.',
    createdBy: { id: owner._id, name: owner.name }
  });

  // 7. Coupons
  await Coupon.deleteMany({});
  await Coupon.create({
    code: 'KARIBU10',
    description: '10% Welcome Discount for new DukaFlow customers',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 100000, // min KES 1,000
    maxDiscount: 50000, // max KES 500 discount
    usageLimit: 500,
    usageCount: 14,
    isActive: true
  });

  await Coupon.create({
    code: 'DUKA200',
    description: 'Flat KES 200 off purchases above KES 1,500',
    discountType: 'fixed',
    discountValue: 20000, // KES 200 in cents
    minOrderValue: 150000, // min KES 1,500
    usageLimit: 200,
    usageCount: 8,
    isActive: true
  });

  // 8. Sample Customers & Orders
  await Customer.deleteMany({});
  await Order.deleteMany({});
  await Payment.deleteMany({});

  const cust1 = await Customer.create({
    name: 'Samuel Kiprop',
    phone: '0722123456',
    email: 'samuel.kiprop@example.com',
    address: 'House 4B, Woodley Estate, Nairobi',
    totalOrders: 3,
    totalSpend: 1450000
  });

  const cust2 = await Customer.create({
    name: 'Faith Achieng',
    phone: '0733987654',
    email: 'faith.achieng@example.com',
    address: 'Apt 12, Westlands Heights, Rhapta Road',
    totalOrders: 2,
    totalSpend: 890000
  });

  // Sample Completed Order with Paid M-Pesa
  const sampleOrder1 = await Order.create({
    orderNumber: 'ORD-202611-1001',
    customerType: 'registered',
    customerId: cust1._id,
    customerName: cust1.name,
    customerEmail: cust1.email,
    customerPhone: cust1.phone,
    fulfilmentType: 'delivery',
    deliveryAddress: {
      street: 'House 4B, Woodley Estate',
      city: 'Nairobi',
      zone: 'Kilimani / Kileleshwa / Lavington',
      instructions: 'Gate 2, call upon arrival'
    },
    items: [
      {
        productId: createdProducts[0]._id,
        productName: createdProducts[0].name,
        sku: createdProducts[0].sku,
        imageUrl: createdProducts[0].imageUrl,
        unitPrice: 22000,
        costPrice: 17500,
        quantity: 2,
        total: 44000
      },
      {
        productId: createdProducts[2]._id,
        productName: createdProducts[2].name,
        sku: createdProducts[2].sku,
        imageUrl: createdProducts[2].imageUrl,
        unitPrice: 6500,
        costPrice: 5400,
        quantity: 4,
        total: 26000
      }
    ],
    subtotal: 70000, // KES 700.00
    discountTotal: 0,
    taxTotal: 4160, // 16% on milk (26000) = 4160
    deliveryFee: 20000, // KES 200.00
    grandTotal: 94160, // KES 941.60
    orderStatus: 'completed',
    fulfilmentStatus: 'delivered',
    paymentStatus: 'paid',
    paymentMethod: 'mpesa',
    timeline: [
      { status: 'Order Placed', note: 'Customer ordered via web storefront', actor: cust1.name },
      { status: 'Payment Confirmed', note: 'M-Pesa Receipt NL82716382 verified', actor: 'M-Pesa Daraja' },
      { status: 'Order Dispatched', note: 'Rider on route', actor: 'Fulfilment Desk' },
      { status: 'Delivered', note: 'Handed over to customer', actor: 'Rider' }
    ]
  });

  const pay1 = await Payment.create({
    paymentNumber: 'PAY-202611-1001',
    orderId: sampleOrder1._id,
    orderNumber: sampleOrder1.orderNumber,
    amount: sampleOrder1.grandTotal,
    currency: 'KES',
    method: 'mpesa',
    status: 'paid',
    transactionReference: 'NL82716382',
    mpesaDetails: {
      checkoutRequestId: 'ws_CO_202611_MOCK1',
      phoneNumber: '254722123456',
      mpesaReceiptNumber: 'NL82716382',
      resultCode: 0,
      resultDesc: 'The service request is processed successfully.'
    }
  });
  sampleOrder1.paymentId = pay1._id;
  await sampleOrder1.save();

  // Sample Preparing Order with Cash on Pickup
  const sampleOrder2 = await Order.create({
    orderNumber: 'ORD-202611-1002',
    customerType: 'guest',
    customerName: 'Mary Wambui',
    customerEmail: 'mary@example.com',
    customerPhone: '0711445566',
    fulfilmentType: 'pickup',
    items: [
      {
        productId: createdProducts[4]._id,
        productName: createdProducts[4].name,
        sku: createdProducts[4].sku,
        imageUrl: createdProducts[4].imageUrl,
        unitPrice: 34000,
        costPrice: 28000,
        quantity: 1,
        total: 34000
      },
      {
        productId: createdProducts[5]._id,
        productName: createdProducts[5].name,
        sku: createdProducts[5].sku,
        imageUrl: createdProducts[5].imageUrl,
        unitPrice: 13000,
        costPrice: 8500,
        quantity: 2,
        total: 26000
      }
    ],
    subtotal: 60000,
    discountTotal: 0,
    taxTotal: 5440,
    deliveryFee: 0,
    grandTotal: 65440,
    orderStatus: 'preparing',
    fulfilmentStatus: 'packing',
    paymentStatus: 'unpaid',
    paymentMethod: 'cash',
    timeline: [
      { status: 'Order Placed', note: 'Counter pickup requested', actor: 'Mary Wambui' },
      { status: 'Preparing', note: 'Staff assembling items in bag', actor: 'Brian Omondi' }
    ]
  });

  // 9. Notifications
  await Notification.deleteMany({});
  await Notification.create({
    title: 'Low Stock Alert',
    message: 'Ketepa Pride Tagged Tea Bags 100s (BEV-KTP-100) has only 3 units remaining!',
    type: 'inventory',
    severity: 'warning',
    link: '/inventory'
  });

  await Notification.create({
    title: 'New Online Order',
    message: 'Order ORD-202611-1002 received for Mary Wambui (KES 654.40). Ready for pickup packaging.',
    type: 'order',
    severity: 'info',
    link: '/orders'
  });

  console.log('Enterprise seed successfully completed!');
  console.log(`- Shop: "${shop.name}"`);
  console.log(`- Owner: ${owner.email} (Password: DukaFlow2026!)`);
  console.log(`- Cashier: ${cashier.email} (Password: DukaFlow2026!)`);
  console.log(`- Manager: ${manager.email} (Password: DukaFlow2026!)`);
  console.log(`- Products: ${createdProducts.length} items loaded`);
  console.log(`- Categories: 5 categories loaded`);
  console.log(`- Coupons: KARIBU10, DUKA200 loaded`);
}

// Run directly if called as main script
if (process.argv[1]?.endsWith('seed.js')) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
