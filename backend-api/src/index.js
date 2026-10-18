const express = require('express');
const cors = require('cors');
const pool = require('./db');

const authRoutes = require('./routes/auth');
const productsRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');
const partiesRoutes = require('./routes/parties');
const invoicesRoutes = require('./routes/invoices');
const settingsRoutes = require('./routes/settings');
const crmRoutes = require('./routes/crm');
const uploadRoutes = require('./routes/upload');
const rpcRoutes = require('./routes/rpc');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id', 'apikey', 'prefer'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as server_time');
    return res.json({
      status: 'online',
      db: 'connected',
      db_time: result.rows[0].server_time,
      version: '1.0.0',
    });
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      db: 'disconnected',
      message: err.message,
    });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api', inventoryRoutes); // For product-batches and adjust-stock
app.use('/api', partiesRoutes);   // For customers, suppliers, parties, credit-transactions, bank-accounts
app.use('/api', invoicesRoutes);  // For sales, purchases, purchase-invoices, expenses, returns
app.use('/api', settingsRoutes);  // For organizations, organization-memberships, storefront-settings, locations
app.use('/api/crm', crmRoutes);
app.use('/', uploadRoutes);       // For /api/upload/:bucket and storage
app.use('/', rpcRoutes);          // For /rpc/:fn and /rest/v1/:table

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error Handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`CredSmart Backend API server listening on http://0.0.0.0:${PORT}`);
});

module.exports = app;
