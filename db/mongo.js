// MongoDB stub — not used when DATA_SOURCE = "mysql"
// connectMongo is a no-op; getMongoDB returns null so all mongo paths skip gracefully.

async function connectMongo() {
    // No-op: MongoDB not configured
}

async function getMongoDB() {
    return null;
}

module.exports = { connectMongo, getMongoDB };
