import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI is not set. Add it to your .env file.");
    process.exit(1);
  }
  try {
    mongoose.set("strictQuery", true);
    // Force the app to always use the correct database, even if the
    // connection string has no db name (which would default to "test").
    const dbName = process.env.DB_NAME || "localmart";
    const conn = await mongoose.connect(uri, { dbName });
    console.log(`MongoDB connected: ${conn.connection.host} (db: ${conn.connection.name})`);
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
};
