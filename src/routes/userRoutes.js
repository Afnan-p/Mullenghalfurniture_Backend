const express = require('express');
const { getAllUsers, getUserDetails, updatePreviousBalance, toggleBlockUser, deleteUser } = require('../controllers/userController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.get('/', protect, admin, getAllUsers);
router.get('/:id', protect, admin, getUserDetails);
router.put('/:id/balance', protect, admin, updatePreviousBalance);
router.patch('/:id/block', protect, admin, toggleBlockUser);
router.delete('/:id', protect, admin, deleteUser);

module.exports = router;
