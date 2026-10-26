const express = require('express');
const router = express.Router();
const {
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    previewImportTransactions,
    importTransactions
} = require('../controllers/transactionController');
const { requireAuth } = require('../middleware/auth');

// Protect all transaction routes: requires valid session cookie or Bearer token
router.use(requireAuth);

// Mount routes for /api/transactions/import-preview and /api/transactions/import
router.post('/import-preview', previewImportTransactions);
router.post('/import', importTransactions);

// Mount routes for /api/transactions
router.route('/')
    .get(getTransactions)
    .post(createTransaction);

// Mount routes for /api/transactions/:id
router.route('/:id')
    .put(updateTransaction)
    .delete(deleteTransaction);

module.exports = router;
