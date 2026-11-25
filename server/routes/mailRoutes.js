
const router = require('express').Router();
const c = require('../controllers/mailController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', c.send);

router.get('/inbox', c.inbox);
router.get('/sent', c.sent);
router.get('/unread-count', c.unreadCount);

router.post('/read-all', c.readAll);

router.get('/:id', c.get);
router.patch('/:id/unread', c.markUnread);
router.delete('/:id', c.remove);

module.exports = router;
