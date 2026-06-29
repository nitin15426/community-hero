import { dbHelper } from '../services/dbHelper.js';
import { geminiService } from '../services/geminiService.js';

export const getHotspotAnalysis = async (req, res) => {
  try {
    // Fetch all issues (including duplicates, so we see complete historical patterns)
    const issues = await dbHelper.getIssues({ duplicateOf: { $exists: true } });
    
    if (issues.length === 0) {
      return res.json({
        summary: 'No reports filed in the system yet. Predictive analytics will activate once citizens report issues.',
        predictions: []
      });
    }

    const analysis = await geminiService.predictHotspots(issues);
    
    res.json(analysis);
  } catch (error) {
    console.error('Analytics analysis error:', error);
    res.status(500).json({ message: 'Server error generating predictive analytics.' });
  }
};

export const getCivicStats = async (req, res) => {
  try {
    const allIssues = await dbHelper.getIssues({ duplicateOf: { $exists: true } });
    
    // Calculate key numbers
    const totalReports = allIssues.length;
    const resolved = allIssues.filter(i => i.status === 'Resolved').length;
    const pending = allIssues.filter(i => ['Reported', 'Verified', 'Assigned', 'In Progress'].includes(i.status)).length;
    const critical = allIssues.filter(i => i.severity === 'High' && i.status !== 'Resolved').length;
    
    // Group by category
    const categoryStats = allIssues.reduce((acc, i) => {
      acc[i.category] = (acc[i.category] || 0) + 1;
      return acc;
    }, {});

    // Month-by-month trend (last 6 months, or simple grouping)
    // For simplicity, we can do a 7-day trend
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentIssues = allIssues.filter(i => new Date(i.createdAt) >= sevenDaysAgo);
    
    const dailyTrend = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });
      dailyTrend[dateStr] = 0;
    }

    recentIssues.forEach(i => {
      const dateStr = new Date(i.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
      if (dailyTrend[dateStr] !== undefined) {
        dailyTrend[dateStr] += 1;
      }
    });

    const trendData = Object.keys(dailyTrend).map(day => ({
      day,
      count: dailyTrend[day]
    }));

    res.json({
      totalReports,
      resolved,
      pending,
      critical,
      categoryStats,
      trendData
    });
  } catch (error) {
    console.error('Civic stats error:', error);
    res.status(500).json({ message: 'Server error generating general civic stats.' });
  }
};
