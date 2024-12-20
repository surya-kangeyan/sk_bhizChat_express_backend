import Metrics from '../models/metrics.js';

export async function fetchMetrics(shopId: any) {

    try {
        const metrics = await Metrics.findOne({shopId});
        if (!metrics) {
            const defaultData = new Metrics({
                shopId: shopId,
                totalUsers: 0,
                totalConversations: 0,
                totalRecommendations: 0,
                totalProductClicks: 0,

            }) 

            await defaultData.save();
            return {
                success:true,
                metrics: {
                    shopId: shopId,
                    users: 0,
                    conversations: 0,
                    recommendations: 0,
                    productClicks: 0
                }
            }
        }
        if (metrics) {
            return { 
                success: true, 
                metrics: {
                    shopId: metrics.shopId,
                    users: metrics.totalUsers,
                    conversations: metrics.totalConversations,
                    recommendations: metrics.totalRecommendations,
                    productClicks: metrics.totalProductClicks
                }
             }
        } else {
            return { success: false, error: 'No metrics found' }
        }
    } catch (error) {
        console.error('Error fetching metrics:', error);
        return 'Failed to fetch metrics'
    }
}
