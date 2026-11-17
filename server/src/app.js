import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { requestContext } from './middleware/request-context.js';
import { errorHandler, notFoundHandler } from './shared/errors.js';

// Route imports
import { authRouter } from './routes/auth.js';
import { shopRouter } from './routes/shop.js';
import { usersRouter } from './routes/users.js';
import { categoriesRouter } from './routes/categories.js';
import { productsRouter } from './routes/products.js';
import { inventoryRouter } from './routes/inventory.js';
import { cartRouter } from './routes/cart.js';
import { couponsRouter } from './routes/coupons.js';
import { ordersRouter } from './routes/orders.js';
import { paymentsRouter } from './routes/payments.js';
import { suppliersRouter } from './routes/suppliers.js';
import { purchaseOrdersRouter } from './routes/purchaseOrders.js';
import { returnsRouter } from './routes/returns.js';
import { customersRouter } from './routes/customers.js';
import { reportsRouter } from './routes/reports.js';
import { notificationsRouter } from './routes/notifications.js';
import { auditLogsRouter } from './routes/auditLogs.js';
import { storefrontRouter } from './routes/storefront.js';

export const app = express();
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));
app.use(cookieParser());
app.use(requestContext);

// Rate limiting (permissive for dev/test, strict for api in prod)
app.use(
  '/api',
  rateLimit({
    windowMs: 60_000,
    limit: env.NODE_ENV === 'test' ? 10_000 : 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  })
);

// Health & Readiness checks
app.get('/api/v1/health', (_req, res) =>
  res.json({ status: 'ok', service: 'dukaflow-retail-api', timestamp: new Date().toISOString() })
);

app.get('/api/v1/readiness', (_req, res) => {
  const isDbReady = mongoose.connection.readyState === 1 || Boolean(process.env.MONGODB_URI);
  res.status(isDbReady ? 200 : 503).json({ ready: isDbReady, databaseConfigured: isDbReady });
});

// Mount Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/shop', shopRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/categories', categoriesRouter);
app.use('/api/v1/products', productsRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/coupons', couponsRouter);
app.use('/api/v1/orders', ordersRouter);
app.use('/api/v1/payments', paymentsRouter);
app.use('/api/v1/suppliers', suppliersRouter);
app.use('/api/v1/purchase-orders', purchaseOrdersRouter);
app.use('/api/v1/returns', returnsRouter);
app.use('/api/v1/customers', customersRouter);
app.use('/api/v1/reports', reportsRouter);
app.use('/api/v1/notifications', notificationsRouter);
app.use('/api/v1/audit-logs', auditLogsRouter);
app.use('/api/v1/storefront', storefrontRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);
