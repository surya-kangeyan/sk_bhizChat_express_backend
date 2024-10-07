import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const url = process.env.MONGODB_URI;

if (!url) {
  throw new Error('MONGODB_URI is not defined in the environment variables.');
}

mongoose.set('strictQuery', false);

console.log(`Connecting to MongoDB at ${url}`);

mongoose
  .connect(url)
  .then(() => {
    console.log('Connected to MongoDB');
    const sessionSchema = new mongoose.Schema({
      content: String,
    });

    const Session = mongoose.model('Session', sessionSchema);

    const session = new Session({
      content: 'hi',
    });

    return session.save();
  })
  .then(() => {
    console.log('Session saved to MongoDB');
    mongoose.connection.close();
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });
