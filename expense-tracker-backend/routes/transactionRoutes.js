const express = require('express');
const router = express.Router();
const {
    getTransactions,
    createTransaction,
    updateTransaction,
    deleteTransaction
} = require('../controllers/transactionController');

// Mount routes for /api/transactions
router.route('/')
    .get(getTransactions)
    .post(createTransaction);

// Mount routes for /api/transactions/:id
router.route('/:id')
    .put(updateTransaction)
    .delete(deleteTransaction);

module.exports = router;
