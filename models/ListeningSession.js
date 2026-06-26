const mongoose = require('mongoose');

const listeningSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
    },
    host: {
        type: String, // Or mongoose.Schema.Types.ObjectId if referencing User model
        required: true,
    },
    participants: [{
        type: String, // Array of strings (could be user IDs or usernames)
    }],
    currentSong: {
        type: String, // URL or ID of the current song
        default: '',
    },
    currentTime: {
        type: Number,
        default: 0,
    },
    isPlaying: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('ListeningSession', listeningSessionSchema);
