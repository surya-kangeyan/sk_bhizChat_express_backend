import mongoose from 'mongoose';

const MetricsSchema = new mongoose.Schema({
  totalUsers: { type: Number, default: 0 },
  totalConversations: {
    type: Number,
    default: 0,
  },
  totalRecommendations: {
    type: Number,
    default: 0,
  },
  totalProductClicks: {
    type: Number,
    default: 0,
  }, 
});

export default mongoose.model('Metrics', MetricsSchema);
