const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    password: { type: String, required: true },
    email: { type: String, required: true },
    verified: { type: Boolean, required: true },
    sessionId: { type: String, required: false }
});

module.exports = mongoose.model('User', UserSchema);