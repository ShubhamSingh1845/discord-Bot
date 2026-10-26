import mongoose from 'mongoose';

const urlSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true
    },
    shortId: {
      type: String,
      required: true,
      match: /^[a-f0-9]{12}$/
    },
    discordUserId: {
      type: String,
      required: true
    },
    commandSource: {
      type: String,
      required: true,
      enum: ['message', 'slash']
    }
  },
  {
    collection: 'urls',
    timestamps: true
  }
);

urlSchema.index({ shortId: 1 }, { unique: true });

export default mongoose.model('Url', urlSchema);
