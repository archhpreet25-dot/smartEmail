
const router = require('express').Router();
const c = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', c.register);
router.post('/login', c.login);

router.get('/me', protect, c.me);
router.put('/settings', protect, c.updateSettings);
router.get('/users', protect, c.searchUsers);

module.exports = router;
