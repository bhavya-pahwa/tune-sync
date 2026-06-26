const ListeningSession = require('../models/ListeningSession');

// @desc    Create a new session
// @route   POST /api/sessions/create
// @access  Public (or Private depending on requirements)
const createSession = async (req, res) => {
    try {
        const { sessionId, host } = req.body;

        if (!sessionId || !host) {
            res.status(400);
            throw new Error('Session ID and host are required');
        }

        const existingSession = await ListeningSession.findOne({ sessionId });
        if (existingSession) {
            res.status(400);
            throw new Error('Session ID already exists');
        }

        const newSession = await ListeningSession.create({
            sessionId,
            host,
            participants: [host], // Host is the first participant
        });

        res.status(201).json({
            success: true,
            message: 'Session created successfully',
            data: newSession
        });
    } catch (error) {
        console.error(error);
        res.status(res.statusCode === 200 ? 500 : res.statusCode);
        throw new Error(error.message || 'Server error creating session');
    }
};

// @desc    Join an existing session
// @route   POST /api/sessions/join
// @access  Public (or Private)
const joinSession = async (req, res) => {
    try {
        const { sessionId, participant } = req.body;

        if (!sessionId || !participant) {
            res.status(400);
            throw new Error('Session ID and participant are required');
        }

        const session = await ListeningSession.findOne({ sessionId });

        if (!session) {
            res.status(404);
            throw new Error('Session not found');
        }

        if (!session.participants.includes(participant)) {
            session.participants.push(participant);
            await session.save();
        }

        res.status(200).json({
            success: true,
            message: 'Successfully joined session',
            data: session
        });
    } catch (error) {
        console.error(error);
        res.status(res.statusCode === 200 ? 500 : res.statusCode);
        throw new Error(error.message || 'Server error joining session');
    }
};

// @desc    Get session details
// @route   GET /api/sessions/:sessionId
// @access  Public (or Private)
const getSession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await ListeningSession.findOne({ sessionId });

        if (!session) {
            res.status(404);
            throw new Error('Session not found');
        }

        res.status(200).json({
            success: true,
            message: 'Session retrieved successfully',
            data: session
        });
    } catch (error) {
        console.error(error);
        res.status(res.statusCode === 200 ? 500 : res.statusCode);
        throw new Error(error.message || 'Server error fetching session');
    }
};

module.exports = {
    createSession,
    joinSession,
    getSession,
};
