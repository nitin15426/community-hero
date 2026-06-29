import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench,
  Search,
  Filter,
  FileText
} from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  
  // Dashboard states
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [statusFilter, setStatusFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Status edit inputs
  const [statusInput, setStatusInput] = useState('Reported');
  const [noteInput, setNoteInput] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchAdminIssues = async () => {
    try {
      // Fetch all issues (including verified/reported)
      const res = await fetch('/api/issues?status=All');
      if (res.ok) {
        const data = await res.json();
        // Sort: High severity first, then newest
        const sorted = data.sort((a, b) => {
          if (a.severity === 'High' && b.severity !== 'High') return -1;
          if (a.severity !== 'High' && b.severity === 'High') return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        setIssues(sorted);
        setFilteredIssues(sorted);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminIssues();
  }, []);

  // Filter dispatcher
  useEffect(() => {
    let result = [...issues];
    
    if (statusFilter !== 'All') {
      result = result.filter(i => i.status === statusFilter);
    }
    if (severityFilter !== 'All') {
      result = result.filter(i => i.severity === severityFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i => 
        i.title.toLowerCase().includes(q) || 
        i.description.toLowerCase().includes(q) ||
        (i.location?.address && i.location.address.toLowerCase().includes(q))
      );
    }
    setFilteredIssues(result);

    // Sync selected issue if refreshed
    if (selectedIssue) {
      const synced = result.find(i => i._id === selectedIssue._id);
      if (synced) {
        setSelectedIssue(synced);
      }
    }
  }, [statusFilter, severityFilter, searchQuery, issues]);

  const selectIssue = (issue) => {
    setSelectedIssue(issue);
    setStatusInput(issue.status);
    setNoteInput('');
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedIssue) return;
    setUpdating(true);

    try {
      const res = await fetch(`/api/issues/${selectedIssue._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: statusInput,
          note: noteInput || `Work status updated to: ${statusInput}`
        })
      });

      const responseData = await res.json();

      if (res.ok) {
        // Refresh grid
        await fetchAdminIssues();
        
        // Notify of points awarded to reporter if resolved
        if (statusInput === 'Resolved' && responseData.reporterPointsAwarded) {
          alert(`Issue resolved successfully! Reporter awarded +${responseData.reporterPointsAwarded} Hero Points!`);
        }
        
        setNoteInput('');
      } else {
        alert(responseData.message || 'Status update failed.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'High': return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-rose-400 bg-rose-500/10 border-rose-500/20">High Priority</span>;
      case 'Medium': return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/20">Medium Priority</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-blue-400 bg-blue-500/10 border-blue-500/20">Low Priority</span>;
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
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-950/20 to-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
            Authority Control Board
          </h2>
          <p className="text-zinc-400 text-xs mt-0.5">Municipal action panel. Review community reports and authorize repairs.</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-xl text-xs text-zinc-500 font-semibold">
          Logged in as: <strong className="text-rose-400">{user?.name}</strong>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-zinc-900/30 border border-zinc-800 p-4 rounded-xl glassmorphism">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Search issues by location/keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/35 rounded-lg pl-10 pr-4 py-2 text-xs text-zinc-300 focus:outline-none"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-zinc-500" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Verified">Verified</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-zinc-500" />
          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="High">🔴 High Priority first</option>
            <option value="Medium">🟡 Medium Priority</option>
            <option value="Low">🟢 Low Priority</option>
          </select>
        </div>

      </div>

      {/* Main Grid Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Issues List Column (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              Loading community reports queue...
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/20 border border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-xs">
              No issues matching current filter.
            </div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue._id}
                onClick={() => selectIssue(issue)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex gap-4 ${
                  selectedIssue?._id === issue._id
                    ? 'border-rose-500/40 bg-rose-500/5 shadow-lg'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/20'
                }`}
              >
                {/* Thumbnail */}
                <div className="w-20 h-16 rounded bg-zinc-950 border border-zinc-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {issue.image ? (
                    <img src={issue.image} alt={issue.title} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🛡️</span>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-zinc-500 font-mono">{issue.category}</span>
                    <div className="flex items-center gap-1.5">
                      {getSeverityBadge(issue.severity)}
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusColor(issue.status)}`}>
                        {issue.status}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-sm text-zinc-200 truncate">{issue.title}</h4>
                  
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span className="truncate max-w-[200px]">📍 {issue.location?.address}</span>
                    <span>👍 {issue.upvotes?.length || 0} votes</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Action Panel Column (Right 1 col) */}
        <div className="bg-zinc-900/30 border border-zinc-800 p-5 rounded-2xl glassmorphism space-y-5">
          {!selectedIssue ? (
            <div className="text-center py-16 text-zinc-500 text-xs italic flex flex-col items-center gap-2">
              <Wrench className="h-8 w-8 text-zinc-700 animate-pulse" />
              <span>Select an issue from the queue to edit and assign work.</span>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b border-zinc-800 pb-3">
                <h4 className="font-bold text-white text-sm">{selectedIssue.title}</h4>
                <p className="text-zinc-500 text-[10px] font-mono mt-0.5">Reporter ID: {selectedIssue.reporter?.name || 'Anonymous'}</p>
              </div>

              {/* Description preview */}
              <div className="space-y-1 text-xs">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Report details</span>
                <p className="bg-zinc-950 p-3 border border-zinc-800 rounded-lg text-zinc-400 leading-relaxed max-h-24 overflow-y-auto">
                  {selectedIssue.description}
                </p>
              </div>

              {/* Coordinates map click */}
              <div className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-950/40 p-2 rounded border border-zinc-800/40">
                <MapPin className="h-3.5 w-3.5 text-rose-400" />
                <span className="truncate font-semibold">{selectedIssue.location?.address}</span>
              </div>

              {/* Status Update Form */}
              <form onSubmit={handleUpdateStatus} className="space-y-4 border-t border-zinc-800 pt-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Modify Work Status</label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/40 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="Reported">Reported</option>
                    <option value="Verified">Verified (Confirmed)</option>
                    <option value="Assigned">Assigned (Worker Dispatched)</option>
                    <option value="In Progress">In Progress (Under Repair)</option>
                    <option value="Resolved">Resolved (Repair Complete)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Work Notes / Timeline updates</label>
                  <textarea
                    rows="3"
                    placeholder="e.g. Patching crew assigned for morning dispatch..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-rose-500/40 rounded-lg p-2 text-xs text-zinc-300 placeholder-zinc-700 focus:outline-none resize-none font-sans"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={updating}
                  className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg text-xs transition-all shadow-glow hover:shadow-rose-500/10"
                >
                  {updating ? 'Updating status...' : 'Authorize Action Update'}
                </button>
              </form>

              {/* Existing History Notes */}
              <div className="border-t border-zinc-800 pt-4 space-y-2">
                <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Timeline Log
                </span>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedIssue.timeline?.map((step, idx) => (
                    <div key={idx} className="bg-zinc-950 p-2 rounded border border-zinc-800/40 text-[10px] space-y-0.5">
                      <div className="flex items-center justify-between font-bold text-zinc-400">
                        <span>{step.status}</span>
                        <span>{new Date(step.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-zinc-500 leading-relaxed font-sans">{step.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
