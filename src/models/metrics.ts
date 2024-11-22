import mongoose from 'mongoose';


const MetricsSchema = new mongoose.Schema({ 
    shopId: {type: String, required: true},
    totalUsers: { type: Number, default: 0 },
    totalConversations: { type: Number, default: 0 },
    totalRecommendations: { type: Number, default: 0 },
     totalProductClicks: {
    type: Number,
    default: 0,
  }, 

});

export default mongoose.model('Metrics', MetricsSchema);
