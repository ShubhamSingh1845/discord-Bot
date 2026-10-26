import mongoose from 'mongoose';
import Url from '../models/Url.js';

export async function connectDatabase(uri) {
  await mongoose.connect(uri, { dbName: 'discord_bot' });
  await Url.init();
  console.log('Connected to MongoDB (database: discord_bot, collection: urls).');
}
