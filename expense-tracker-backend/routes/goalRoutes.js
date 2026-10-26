const express = require('express');
const router = express.Router();
const {
    getGoals,
    createGoal,
    updateGoal,
    adjustContribution,
    deleteGoal
} = require('../controllers/goalController');
const { requireAuth } = require('../middleware/auth');

// Protect all savings goal routes: requires valid session cookie or Bearer token
router.use(requireAuth);

// Mount routes for /api/goals
router.route('/')
    .get(getGoals)
    .post(createGoal);

// Mount routes for /api/goals/:id
router.route('/:id')
    .put(updateGoal)
    .delete(deleteGoal);

// Mount route for atomic contribution adjustments (deposit / withdraw)
router.route('/:id/adjust')
    .post(adjustContribution);

module.exports = router;
