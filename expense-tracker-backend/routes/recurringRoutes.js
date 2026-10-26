const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
    getRecurringRules,
    createRecurringRule,
    updateRecurringRule,
    toggleStatus,
    deleteRecurringRule,
    processUserDueRules,
    cronProcessDueRules
} = require('../controllers/recurringController');

const router = express.Router();

// Specific routes first to prevent parameter collisions with /:id
router.post('/process-due', requireAuth, processUserDueRules);
router.post('/cron-process', cronProcessDueRules);

// Base user collection routes
router.get('/', requireAuth, getRecurringRules);
router.post('/', requireAuth, createRecurringRule);

// Specific ID-based resource routes
router.put('/:id', requireAuth, updateRecurringRule);
router.patch('/:id/status', requireAuth, toggleStatus);
router.delete('/:id', requireAuth, deleteRecurringRule);

module.exports = router;
