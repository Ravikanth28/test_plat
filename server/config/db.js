import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    // Don't exit the process: keep the web server alive so the platform's
    // health check still passes. Surface the misconfiguration in the logs.
    throw new Error("MONGO_URI is not set. Add it to your environment.");
  }
  mongoose.set("strictQuery", true);
  // Force the app to always use the correct database, even if the
  // connection string has no db name (which would default to "test").
  const dbName = process.env.DB_NAME || "localmart";
  const conn = await mongoose.connect(uri, {
    dbName,
    // Fail fast on an unreachable cluster instead of hanging the startup.
    serverSelectionTimeoutMS: 15000,
  });
  console.log(`MongoDB connected: ${conn.connection.host} (db: ${conn.connection.name})`);
  return conn;
};
