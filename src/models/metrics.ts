import mongoose from 'mongoose';

const MetricsSchema = new mongoose.Schema({ //is this the right way to make the schema????
    totalUsers: { type: Number, default: 0 },
    totalConversations: { type: Number, default: 0 },
    totalRecommendations: { type: Number, default: 0 },
});

export default mongoose.model('Metrics', MetricsSchema);
