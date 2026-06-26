const express = require('express');
const router = express.Router();
const { createSession, joinSession, getSession } = require('../controllers/sessionController');

router.post('/create', createSession);
router.post('/join', joinSession);
router.get('/:sessionId', getSession);

module.exports = router;
