const express = require('express');
const { addTransaction, updateTransaction, deleteTransaction, getGlobalStats } = require('../controllers/transactionController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', protect, admin, addTransaction);
router.put('/:id', protect, admin, updateTransaction);
router.delete('/:id', protect, admin, deleteTransaction);
router.get('/stats', protect, admin, getGlobalStats);

module.exports = router;
