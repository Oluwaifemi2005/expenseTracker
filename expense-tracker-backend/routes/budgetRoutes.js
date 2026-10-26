const express = require('express');
const router = express.Router();
const {
    getBudgets,
    createBudget,
    updateBudget,
    deleteBudget
} = require('../controllers/budgetController');
const { requireAuth } = require('../middleware/auth');

// Protect all budget routes: requires valid session cookie or Bearer token
router.use(requireAuth);

// Mount routes for /api/budgets
router.route('/')
    .get(getBudgets)
    .post(createBudget);

// Mount routes for /api/budgets/:id
router.route('/:id')
    .put(updateBudget)
    .delete(deleteBudget);

module.exports = router;
