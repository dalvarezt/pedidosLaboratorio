const crypto = require("crypto");

module.exports.getUUID = function() {
    return crypto.randomBytes(16).toString("hex");
}