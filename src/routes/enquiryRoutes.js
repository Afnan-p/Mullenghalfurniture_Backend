const express = require('express');
const { createEnquiry, getUserEnquiries, getAllEnquiries, updateEnquiryStatus } = require('../controllers/enquiryController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', protect, createEnquiry);
router.get('/my', protect, getUserEnquiries);
router.get('/', protect, admin, getAllEnquiries);
router.put('/:id/status', protect, admin, updateEnquiryStatus);

module.exports = router;
