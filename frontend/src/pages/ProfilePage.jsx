import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { 
  Award, 
  User, 
  Mail, 
  Key, 
  Lock, 
  ShieldAlert, 
  Trophy, 
  FileText, 
  CheckCircle2, 
  PlusCircle, 
  Shield 
} from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshUserData } = useAuth();
  
  // Auth state inputs
  const [isLogin, setIsLogin] = useState(true);

  // Profile dashboard states
  const [myIssues, setMyIssues] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchProfileData = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      // 1. Fetch reported issues
      const res = await fetch('/api/issues/user/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (res.ok) {
        const issuesData = await res.json();
        setMyIssues(issuesData);
      }

      // 2. Fetch Leaderboard
      const leaderRes = await fetch('/api/auth/leaderboard');
      if (leaderRes.ok) {
        const leaderData = await leaderRes.json();
        setLeaderboard(leaderData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);



  const getStatusColor = (stat) => {
    switch (stat) {
      case 'Resolved': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'In Progress': return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
      case 'Assigned': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'Verified': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-zinc-400 bg-zinc-800/40 border-zinc-700/30';
    }
  };

  // Auth UI (Register / Login Forms)
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        {isLogin ? (
          <SignIn 
            routing="hash"
            signUpUrl="#signup"
            afterSignInUrl="#"
          />
        ) : (
          <SignUp 
            routing="hash"
            signInUrl="#signin"
            afterSignUpUrl="#"
          />
        )}
        <div className="text-center pt-2">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    );
  }

  // Dashboard UI (Profile statistics & Leaderboard)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      {/* Profile Overview Card (Left column) */}
      <div className="space-y-6">
        <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl glassmorphism space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 text-emerald-400 rounded-full flex items-center justify-center text-xl font-bold font-mono shadow-glow">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-bold text-lg text-white leading-tight">{user.name}</h3>
              <p className="text-zinc-500 text-xs mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-zinc-800 pt-5">
            <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Account Role</span>
              <p className={`text-xs font-extrabold ${user.role === 'authority' ? 'text-rose-400' : 'text-emerald-400'}`}>
                {user.role === 'authority' ? 'Authority' : 'Citizen'}
              </p>
            </div>
            <div className="bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-xl text-center space-y-1">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Hero Points</span>
              <p className="text-lg font-black text-amber-400">{user.points || 0}</p>
            </div>
          </div>

          {/* Badges List */}
          {user.role === 'citizen' && (
            <div className="border-t border-zinc-800 pt-5 space-y-3">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Award className="h-4 w-4 text-emerald-400" />
                Community Badges Earned
              </h4>
              
              {user.badges && user.badges.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.badges.map((badge, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md font-bold text-[10px] tracking-wide"
                    >
                      🏆 {badge}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-zinc-500 text-[11px] italic">No badges unlocked yet. File your first report to start!</p>
              )}
            </div>
          )}
        </div>

        {/* Leaderboard Panel */}
        <div className="bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl glassmorphism space-y-4">
          <h3 className="font-bold text-base text-white flex items-center gap-1.5">
            <Trophy className="h-4 w-4 text-amber-400" />
            Citizen Leaderboard
          </h3>

          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No users listed yet.</p>
            ) : (
              leaderboard.filter(u => u.role === 'citizen').slice(0, 5).map((u, idx) => (
                <div key={u.id} className="flex items-center justify-between border-b border-zinc-800/40 pb-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] font-mono ${
                      idx === 0 ? 'bg-amber-400/10 text-amber-400' : idx === 1 ? 'bg-zinc-300/10 text-zinc-300' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-zinc-300">{u.name}</span>
                  </div>
                  <strong className="text-amber-400">{u.points} pts</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Reported History Table (Right columns) */}
      <div className="lg:col-span-2 bg-zinc-900/30 border border-zinc-800 p-6 rounded-2xl glassmorphism flex flex-col min-h-[400px]">
        <div className="border-b border-zinc-800 pb-4 mb-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-1.5">
            <FileText className="h-5 w-5 text-emerald-400" />
            Report History ({myIssues.length})
          </h3>
          <p className="text-zinc-400 text-xs mt-0.5">Track reviews, upvotes, and official status milestones of your reports.</p>
        </div>

        {loadingHistory ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
            Loading your civic logs...
          </div>
        ) : myIssues.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
            <span className="text-4xl">📭</span>
            <p className="text-zinc-400 text-sm">You haven't reported any community issues yet.</p>
            <p className="text-zinc-500 text-xs max-w-xs leading-relaxed">Potholes, leakage, or broken lights? Capture them to earn points and help your neighbors.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-bold uppercase tracking-wider text-[9px] pb-2">
                  <th className="pb-3 pr-2">Issue Title</th>
                  <th className="pb-3 px-2">Category</th>
                  <th className="pb-3 px-2">Status</th>
                  <th className="pb-3 px-2">Verifications</th>
                  <th className="pb-3 pl-2">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 text-zinc-300 font-medium">
                {myIssues.map((issue) => (
                  <tr key={issue._id} className="hover:bg-zinc-900/25 transition-colors">
                    <td className="py-3 pr-2 font-bold text-zinc-200 max-w-[200px] truncate">{issue.title}</td>
                    <td className="py-3 px-2 font-mono text-[10px] text-zinc-400">{issue.category}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${getStatusColor(issue.status)}`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-mono text-zinc-400">
                      👍 {issue.upvotes?.length || 0} / 👎 {issue.downvotes?.length || 0}
                    </td>
                    <td className="py-3 pl-2 text-zinc-500 font-mono text-[10px]">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
