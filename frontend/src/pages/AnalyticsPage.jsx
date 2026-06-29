import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { 
  Sparkles, 
  AlertTriangle, 
  BarChart2, 
  MapPin, 
  TrendingUp, 
  AlertCircle,
  Activity,
  FileText
} from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState(null);
  const [hotspots, setHotspots] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const statsRes = await fetch('/api/analytics/stats');
      const hotspotsRes = await fetch('/api/analytics/hotspots', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (statsRes.ok && hotspotsRes.ok) {
        const statsData = await statsRes.json();
        const hotspotsData = await hotspotsRes.json();
        setStats(statsData);
        setHotspots(hotspotsData);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-500">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold tracking-wider uppercase font-mono">Running predictive analysis algorithms...</p>
      </div>
    );
  }

  // Compile Recharts friendly datasets
  const categoryChartData = stats?.categoryStats 
    ? Object.keys(stats.categoryStats).map(cat => ({
        name: cat,
        Reports: stats.categoryStats[cat]
      }))
    : [];

  const trendChartData = stats?.trendData || [];

  const getSeverityBorder = (sev) => {
    switch (sev) {
      case 'High': return 'border-rose-500/20 bg-gradient-to-br from-zinc-900/60 to-rose-950/5';
      case 'Medium': return 'border-amber-500/20 bg-gradient-to-br from-zinc-900/60 to-amber-950/5';
      default: return 'border-blue-500/20 bg-gradient-to-br from-zinc-900/60 to-blue-950/5';
    }
  };

  const getSeverityText = (sev) => {
    switch (sev) {
      case 'High': return 'text-rose-400 font-extrabold uppercase tracking-wide';
      case 'Medium': return 'text-amber-400 font-extrabold uppercase tracking-wide';
      default: return 'text-blue-400 font-extrabold uppercase tracking-wide';
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 glassmorphism">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-400 animate-pulse" />
              AI Predictive Hotspot Insights
            </h2>
            <p className="text-zinc-400 text-xs mt-0.5">Municipal forecasts. Gemini aggregates city-wide reports to predict structural failure points.</p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-semibold font-mono">
            <Activity className="h-3.5 w-3.5" />
            Live Forecast Engine Active
          </div>
        </div>
      </div>

      {/* AI Narrative Analysis Summary */}
      {hotspots?.summary && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
          <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 animate-pulse" />
            Gemini Urban Planner Summary
          </h3>
          <p className="text-zinc-300 text-xs leading-relaxed font-sans">
            {hotspots.summary}
          </p>
        </div>
      )}

      {/* Recharts Analytics Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Category Share Chart */}
        <div className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-2xl glassmorphism flex flex-col h-80">
          <h3 className="font-bold text-sm text-zinc-300 mb-4 flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4 text-emerald-400" />
            Issue Category Breakdown
          </h3>
          <div className="flex-1 min-h-0 text-xs">
            {categoryChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600">No chart data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#6b7280" tickLine={false} style={{ fontSize: 9 }} />
                  <YAxis stroke="#6b7280" axisLine={false} tickLine={false} style={{ fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: 8, fontSize: 10 }}
                    labelStyle={{ fontWeight: 'bold', color: '#ef4444' }}
                  />
                  <Bar dataKey="Reports" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Weekly Trend Chart */}
        <div className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-2xl glassmorphism flex flex-col h-80">
          <h3 className="font-bold text-sm text-zinc-300 mb-4 flex items-center gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            7-Day Reporting Velocity
          </h3>
          <div className="flex-1 min-h-0 text-xs">
            {trendChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600">No trend data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e4e4e7" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" stroke="#6b7280" tickLine={false} style={{ fontSize: 9 }} />
                  <YAxis stroke="#6b7280" axisLine={false} tickLine={false} style={{ fontSize: 9 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e4e4e7', borderRadius: 8, fontSize: 10 }}
                    labelStyle={{ fontWeight: 'bold', color: '#ef4444' }}
                  />
                  <Area type="monotone" dataKey="count" name="Reports" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorReports)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Hotspots Predictions Section */}
      <div className="space-y-5">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            Active Warning Hotspots
          </h3>
          <p className="text-zinc-400 text-xs mt-0.5 font-sans">Geospatial risk projections. Areas with repetitive failure reports trigger preemptive warnings.</p>
        </div>

        {hotspots?.predictions && hotspots.predictions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {hotspots.predictions.map((pred, index) => (
              <div 
                key={pred.id || index} 
                className={`rounded-2xl border p-6 flex flex-col space-y-4 shadow-xl transition-all ${getSeverityBorder(pred.severity)}`}
              >
                <div className="flex items-start justify-between border-b border-zinc-800/60 pb-3">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm text-zinc-100 flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-emerald-400" />
                      {pred.address}
                    </h4>
                    <span className="text-[10px] text-zinc-500 font-mono">Center coords: {pred.location}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[9px] font-extrabold border rounded-md px-2 py-0.5 inline-block ${getSeverityText(pred.severity)}`}>
                      {pred.severity} Risk
                    </span>
                    <p className="text-[10px] text-zinc-400 font-semibold mt-1">Cluster Size: {pred.issuesCount} reports</p>
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <span className="text-zinc-500 font-bold uppercase text-[9px] flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-400" /> Forecast Prediction
                  </span>
                  <p className="text-zinc-300 leading-relaxed font-sans">{pred.prediction}</p>
                </div>

                <div className="space-y-2 border-t border-zinc-800/40 pt-4 flex-1">
                  <span className="text-zinc-500 font-bold uppercase text-[9px]">Preemptive Recommendations</span>
                  <ul className="space-y-1.5 text-xs text-zinc-400 list-inside font-sans">
                    {pred.recommendations?.map((rec, rIdx) => (
                      <li key={rIdx} className="flex items-start gap-1.5">
                        <span className="text-emerald-400 font-bold flex-shrink-0 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
            No geographic warnings active. System is running stable.
          </div>
        )}
      </div>

    </div>
  );
}
