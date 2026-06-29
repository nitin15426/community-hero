import mongoose from 'mongoose';

let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return true;
  
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/community-hero';
  
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // fail fast if not running
    });
    console.log(`🚀 MongoDB Connected: ${conn.connection.host}`);
    isConnected = true;
    return true;
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    console.warn('⚠️ WARNING: Backend will fall back to In-Memory Database Emulation!');
    isConnected = false;
    return false;
  }
};

export const getDbStatus = () => isConnected;
