const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/authController');

router.post('/admin/login',          ctrl.adminLogin);
router.post('/admin/request-otp',    ctrl.requestAdminOTP);
router.post('/admin/verify-otp',     ctrl.verifyAdminOTP);
router.post('/user/register',        ctrl.userRegister);
router.post('/user/verify-email',    ctrl.verifyEmail);
router.post('/user/resend-otp',      ctrl.resendOTP);
router.post('/user/login',           ctrl.userLogin);

module.exports = router;