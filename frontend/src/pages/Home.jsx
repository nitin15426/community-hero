import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  ThumbsUp, 
  Users, 
  AlertTriangle, 
  FileText 
} from 'lucide-react';

export default function Home({ setActivePage }) {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalReports: 0,
    resolved: 0,
    pending: 0,
    critical: 0
  });
  const [recentIssues, setRecentIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHomeData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch('/api/analytics/stats');
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch issues
      const issuesRes = await fetch('/api/issues');
      if (issuesRes.ok) {
        const issuesData = await issuesRes.json();
        // Take top 4 recent issues
        setRecentIssues(issuesData.slice(0, 4));
      }
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, []);

  const handleVote = async (issueId, type) => {
    if (!user) {
      setActivePage('profile');
      return;
    }

    try {
      const res = await fetch(`/api/issues/${issueId}/${type}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        // Refresh feed
        fetchHomeData();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Voting failed.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'High': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    }
  };

  const getStatusColor = (stat) => {
    switch (stat) {
      case 'Resolved': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'In Progress': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Assigned': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Verified': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-zinc-400 bg-zinc-800/40 border-zinc-700/30';
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero Banner Section */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/30 border border-zinc-800 p-8 sm:p-12 text-center sm:text-left shadow-2xl">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Sparkles className="w-96 h-96 text-emerald-500" />
        </div>
        
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="h-3 w-3 animate-pulse" />
            AI-Driven Civic Action Platform
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Empower Your Community.<br />
            Report Issues. <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Accelerate Repair.</span>
          </h1>

          <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
            Community Hero bridges the gap between citizens, artificial intelligence, and local government.
            Submit a photo, and let AI analyze, citizens verify, and authorities action the repair immediately.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-2 justify-center sm:justify-start">
            <button
              onClick={() => setActivePage('report')}
              className="group flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-6 py-3.5 rounded-xl transition-all shadow-glow hover:shadow-emerald-500/20"
            >
              Report New Issue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => setActivePage('map')}
              className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 font-semibold px-6 py-3.5 rounded-xl transition-all"
            >
              Explore Live Map
            </button>
          </div>
        </div>
      </div>

      {/* Real-time statistics counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Reports', value: stats.totalReports || 0, icon: FileText, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/15' },
          { label: 'Successfully Resolved', value: stats.resolved || 0, icon: CheckCircle2, color: 'text-teal-400 bg-teal-500/5 border-teal-500/15' },
          { label: 'Verifications Pending', value: stats.pending || 0, icon: Clock, color: 'text-amber-400 bg-amber-500/5 border-amber-500/15' },
          { label: 'High Priority Risks', value: stats.critical || 0, icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/5 border-rose-500/15' }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`rounded-xl border p-5 flex items-center justify-between shadow-lg ${stat.color}`}>
              <div>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-extrabold mt-1 text-zinc-100">{loading ? '...' : stat.value}</h3>
              </div>
              <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/40 text-inherit">
                <Icon className="h-6 w-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* The 4-step Action Loop */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">How it Works</h2>
          <p className="text-zinc-400 text-sm mt-1">Four simple steps toward a cleaner, safer neighborhood.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Citizen Reports', desc: 'Snap a photo, write a description, and select the location. Super fast.', icon: Users },
            { step: '2', title: 'AI Categorization', desc: 'Gemini instantly classifies, evaluates severity, and checks for existing duplicates.', icon: Sparkles },
            { step: '3', title: 'Community Verifies', desc: 'Other citizens vote to confirm if the report is active or resolved, preventing spam.', icon: ThumbsUp },
            { step: '4', title: 'Authority Action', desc: 'Municipal boards assign workers, log live notes, and mark completed tasks.', icon: CheckCircle2 }
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="relative rounded-xl bg-zinc-900/40 border border-zinc-800/60 p-6 space-y-4 hover:border-zinc-700 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-500 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1">STEP {item.step}</span>
                  <Icon className="h-5 w-5 text-emerald-400" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-zinc-200">{item.title}</h4>
                  <p className="text-zinc-400 text-xs leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Recent Issues Feed */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Recent Reports needing Verification</h2>
              <p className="text-zinc-400 text-sm mt-1">Upvote to verify active reports, downvote if fake or already fixed.</p>
            </div>
            <button 
              onClick={() => setActivePage('map')} 
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
            >
              View All Map Issues <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(n => (
                <div key={n} className="h-32 bg-zinc-900/40 border border-zinc-800 rounded-xl animate-pulse"></div>
              ))}
            </div>
          ) : recentIssues.length === 0 ? (
            <div className="text-center py-12 rounded-xl bg-zinc-900/20 border border-dashed border-zinc-800 text-zinc-500 text-sm">
              No reports reported yet. Be the first to report!
            </div>
          ) : (
            <div className="space-y-4">
              {recentIssues.map((issue) => {
                const isVotedUp = user && issue.upvotes?.includes(user.id);
                const isVotedDown = user && issue.downvotes?.includes(user.id);
                const isReporter = user && (issue.reporter?._id === user.id || issue.reporter === user.id);
                
                return (
                  <div key={issue._id} className="group relative rounded-xl bg-zinc-900/30 border border-zinc-800 p-5 flex flex-col sm:flex-row gap-5 hover:border-zinc-700 transition-colors">
                    {/* Thumbnail placeholder if no image */}
                    <div className="w-full sm:w-36 h-28 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 flex items-center justify-center flex-shrink-0">
                      {issue.image ? (
                        <img src={issue.image} alt={issue.title} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl">🛡️</span>
                      )}
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getSeverityColor(issue.severity)}`}>
                          {issue.severity} Priority
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getStatusColor(issue.status)}`}>
                          {issue.status}
                        </span>
                        <span className="text-xs text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-900 font-mono">
                          {issue.category}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h4 className="font-bold text-base text-zinc-200 group-hover:text-emerald-400 transition-colors truncate">{issue.title}</h4>
                        <p className="text-zinc-400 text-xs line-clamp-2 leading-relaxed">{issue.description}</p>
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-800/40">
                        <span>Near: <strong className="text-zinc-400 font-medium truncate max-w-[200px] inline-block align-bottom">{issue.location?.address}</strong></span>
                        <span>By: <span className="text-zinc-400">{issue.reporter?.name || 'Anonymous'}</span></span>
                      </div>
                    </div>

                    {/* Verification Voting Block */}
                    <div className="sm:border-l sm:border-zinc-800 sm:pl-5 flex sm:flex-col justify-around sm:justify-center items-center gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/40">
                      <button
                        onClick={() => handleVote(issue._id, 'upvote')}
                        disabled={isReporter || isVotedUp}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          isVotedUp
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : isReporter
                              ? 'border-zinc-800 text-zinc-600 cursor-not-allowed'
                              : 'border-zinc-800 hover:border-emerald-500/30 hover:bg-emerald-500/5 text-zinc-400 hover:text-emerald-400'
                        }`}
                        title={isReporter ? 'Cannot vote on your own reports' : 'Yes, this issue is active'}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>{issue.upvotes?.length || 0}</span>
                      </button>
                      <button
                        onClick={() => handleVote(issue._id, 'downvote')}
                        disabled={isReporter || isVotedDown}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                          isVotedDown
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            : isReporter
                              ? 'border-zinc-800 text-zinc-600 cursor-not-allowed'
                              : 'border-zinc-800 hover:border-rose-500/30 hover:bg-rose-500/5 text-zinc-400 hover:text-rose-400'
                        }`}
                        title={isReporter ? 'Cannot vote on your own reports' : 'No, this is fixed/fake'}
                      >
                        <ThumbsUp className="h-3.5 w-3.5 rotate-180" />
                        <span>{issue.downvotes?.length || 0}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Informative Panel */}
        <div className="space-y-6">
          <div className="rounded-xl bg-zinc-900/30 border border-zinc-800 p-6 space-y-6">
            <h3 className="font-bold text-lg text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-emerald-400" />
              Community Rewards
            </h3>

            <div className="space-y-4 text-xs">
              <p className="text-zinc-400 leading-relaxed">
                By participating in community reporting and moderation, you earn <strong>Hero Points</strong> to unlock badges and help local government prioritize repairs.
              </p>
              
              <div className="space-y-3 bg-zinc-950 p-4 rounded-lg border border-zinc-800">
                <h4 className="font-bold text-zinc-200">Point Scoreboard</h4>
                <ul className="space-y-2 text-zinc-400 list-disc list-inside">
                  <li><strong className="text-emerald-400">+10 Pts</strong> for a unique report</li>
                  <li><strong className="text-emerald-400">+5 Pts</strong> for reporting a duplicate</li>
                  <li><strong className="text-emerald-400">+2 Pts</strong> for verified upvotes/downvotes</li>
                  <li><strong className="text-emerald-400">+50 Pts</strong> when your report is resolved!</li>
                </ul>
              </div>

              <div className="space-y-3">
                <h4 className="font-bold text-zinc-200">Community Badges</h4>
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
                  <div className="p-2 border border-zinc-800 rounded bg-zinc-900/30 text-emerald-400">🏅 First Responder</div>
                  <div className="p-2 border border-zinc-800 rounded bg-zinc-900/30 text-amber-400">🛡️ Inspector</div>
                  <div className="p-2 border border-zinc-800 rounded bg-zinc-900/30 text-teal-400">🚀 Local Hero</div>
                  <div className="p-2 border border-zinc-800 rounded bg-zinc-900/30 text-rose-400">⚡ Guardian</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tip Card */}
          <div className="rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 p-6 space-y-3">
            <h4 className="font-bold text-zinc-200 text-sm flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
              AI Duplicate Prevention
            </h4>
            <p className="text-zinc-400 text-xs leading-relaxed">
              If multiple neighbors report the same pothole, Community Hero's AI compares coordinates and details to automatically group reports, keeping the municipal action plan clean.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
