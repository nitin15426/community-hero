import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';
import { 
  Filter, 
  AlertTriangle, 
  ThumbsUp, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ShieldAlert,
  X
} from 'lucide-react';

// Central Gurgaon coordinates fallback
const GURGAON_CENTER = [28.459, 77.026];

// Helper to compile dynamic custom HTML/SVG markers (fixes Vite path issues)
const createCustomIcon = (severity, category) => {
  let color = '#3b82f6'; // blue (Low)
  let shadow = 'rgba(59, 130, 246, 0.4)';
  if (severity === 'High') {
    color = '#ef4444'; // red
    shadow = 'rgba(239, 68, 68, 0.5)';
  } else if (severity === 'Medium') {
    color = '#f59e0b'; // amber
    shadow = 'rgba(245, 158, 11, 0.5)';
  }

  let emoji = '🛡️';
  if (category === 'Pothole') emoji = '🕳️';
  else if (category === 'Water Leakage') emoji = '💧';
  else if (category === 'Garbage') emoji = '🗑️';
  else if (category === 'Broken Streetlight') emoji = '💡';
  else if (category === 'Road Damage') emoji = '🚧';

  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 border-zinc-950 text-white shadow-lg transition-transform duration-200" 
           style="background-color: ${color}; box-shadow: 0 0 10px ${shadow};">
        <span class="text-xs font-bold leading-none select-none">${emoji}</span>
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border-r border-b border-zinc-950" 
             style="background-color: ${color};"></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
};

// Component to handle map positioning updates dynamically
function ChangeMapView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
}

export default function MapPage({ setActivePage }) {
  const { user } = useAuth();
  const [issues, setIssues] = useState([]);
  const [filteredIssues, setFilteredIssues] = useState([]);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [mapCenter, setMapCenter] = useState(GURGAON_CENTER);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [catFilter, setCatFilter] = useState('All');
  const [sevFilter, setSevFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchIssues = async () => {
    try {
      const res = await fetch('/api/issues');
      if (res.ok) {
        const data = await res.json();
        setIssues(data);
        setFilteredIssues(data);
        
        // If there's issues, set center to the first high priority issue coordinates if possible
        const highPriority = data.find(i => i.severity === 'High');
        if (highPriority && highPriority.location?.coordinates) {
          const [lng, lat] = highPriority.location.coordinates;
          setMapCenter([lat, lng]);
        }
      }
    } catch (error) {
      console.error('Error fetching map issues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  // Re-run filters whenever filters or issues change
  useEffect(() => {
    let result = [...issues];
    if (catFilter !== 'All') {
      result = result.filter(i => i.category === catFilter);
    }
    if (sevFilter !== 'All') {
      result = result.filter(i => i.severity === sevFilter);
    }
    if (statusFilter !== 'All') {
      result = result.filter(i => i.status === statusFilter);
    }
    setFilteredIssues(result);

    // Deselect if filtered out
    if (selectedIssue && !result.some(i => i._id === selectedIssue._id)) {
      setSelectedIssue(null);
    }
  }, [catFilter, sevFilter, statusFilter, issues]);

  const handleMarkerClick = (issue) => {
    setSelectedIssue(issue);
    if (issue.location?.coordinates) {
      setMapCenter([issue.location.coordinates[1], issue.location.coordinates[0]]);
    }
  };

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
      
      const data = await res.json();
      if (res.ok) {
        // Refresh local issues
        await fetchIssues();
        // Update selected issue data in panel
        if (selectedIssue && selectedIssue._id === issueId) {
          setSelectedIssue(data.issue);
        }
      } else {
        alert(data.message || 'Voting error.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev) {
      case 'High': return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-rose-400 bg-rose-500/10 border-rose-500/20">High Risk</span>;
      case 'Medium': return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/20">Medium Risk</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-blue-400 bg-blue-500/10 border-blue-500/20">Low Risk</span>;
    }
  };

  const getStatusBadge = (stat) => {
    switch (stat) {
      case 'Resolved': return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-emerald-400 bg-emerald-500/10 border-emerald-500/20">Resolved</span>;
      case 'In Progress': return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-purple-400 bg-purple-500/10 border-purple-500/20">Repair In Progress</span>;
      case 'Assigned': return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-blue-400 bg-blue-500/10 border-blue-500/20">Assigned</span>;
      case 'Verified': return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-amber-400 bg-amber-500/10 border-amber-500/20">Community Verified</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold border text-zinc-400 bg-zinc-800/40 border-zinc-700/30">Reported</span>;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] relative">
      {/* Filtering Control Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl glassmorphism z-10">
        <div className="flex items-center gap-2 text-zinc-400 text-xs font-bold uppercase tracking-wider pr-3 border-r border-zinc-800">
          <Filter className="h-4 w-4 text-emerald-400" />
          <span>Filters</span>
        </div>

        {/* Category selector */}
        <div className="space-y-1">
          <select 
            value={catFilter} 
            onChange={(e) => setCatFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="All">All Categories</option>
            <option value="Pothole">🕳️ Potholes</option>
            <option value="Water Leakage">💧 Water Leakage</option>
            <option value="Garbage">🗑️ Garbage Pile</option>
            <option value="Broken Streetlight">💡 Streetlights</option>
            <option value="Road Damage">🚧 Road Damage</option>
          </select>
        </div>

        {/* Severity Selector */}
        <div className="space-y-1">
          <select 
            value={sevFilter} 
            onChange={(e) => setSevFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="All">All Severity</option>
            <option value="High">🔴 High Priority</option>
            <option value="Medium">🟡 Medium Priority</option>
            <option value="Low">🟢 Low Priority</option>
          </select>
        </div>

        {/* Status Selector */}
        <div className="space-y-1">
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500 font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Reported">Reported</option>
            <option value="Verified">Verified</option>
            <option value="Assigned">Assigned</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {/* Info text */}
        <div className="ml-auto text-xs text-zinc-500 font-semibold pr-2">
          Displaying <span className="text-emerald-400">{filteredIssues.length}</span> of {issues.length} active issues
        </div>
      </div>

      {/* Main Map Content + Sidebar Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row rounded-2xl overflow-hidden border border-zinc-800 relative bg-zinc-950">
        
        {/* Leaflet Map Frame */}
        <div className="flex-1 h-full relative z-0 min-h-[400px]">
          <MapContainer 
            center={mapCenter} 
            zoom={14} 
            className="h-full w-full"
            style={{ filter: 'none' }}
          >
            {/* Dark custom tiles using CartoDB */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              className="dark-tiles"
            />
            
            <ChangeMapView center={mapCenter} />

            {/* Render markers */}
            {filteredIssues.map((issue) => {
              const [lng, lat] = issue.location?.coordinates || GURGAON_CENTER;
              return (
                <Marker
                  key={issue._id}
                  position={[lat, lng]}
                  icon={createCustomIcon(issue.severity, issue.category)}
                  eventHandlers={{
                    click: () => handleMarkerClick(issue)
                  }}
                >
                  <Popup className="dark-popup bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-lg">
                    <div className="p-1 space-y-1.5 text-xs text-zinc-300">
                      <h4 className="font-extrabold text-white text-sm leading-tight pr-4">{issue.title}</h4>
                      <p className="line-clamp-2 text-[11px] leading-relaxed text-zinc-400">{issue.description}</p>
                      <div className="flex items-center justify-between border-t border-zinc-800 pt-1.5 mt-1.5">
                        <span>{issue.category}</span>
                        <strong className="text-emerald-400 font-medium cursor-pointer" onClick={() => setSelectedIssue(issue)}>View Details &rarr;</strong>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Floating instructions if nothing is selected */}
          {!selectedIssue && (
            <div className="absolute bottom-4 left-4 p-3 bg-zinc-950/90 border border-zinc-800 rounded-lg text-xs text-zinc-400 pointer-events-none glassmorphism shadow-2xl flex items-center gap-2 max-w-sm">
              <MapPin className="h-4 w-4 text-emerald-400 animate-pulse" />
              <span>Click on any map marker to view details and upvote to verify it!</span>
            </div>
          )}
        </div>

        {/* Selected Issue Detail Sidebar */}
        {selectedIssue && (
          <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-zinc-800 bg-zinc-900/60 lg:h-full overflow-y-auto flex flex-col p-5 space-y-5 glassmorphism z-10 max-h-[50vh] lg:max-h-full">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="font-bold text-lg text-white truncate max-w-[200px]">{selectedIssue.title}</h3>
              <button 
                onClick={() => setSelectedIssue(null)}
                className="p-1 text-zinc-500 hover:text-white rounded hover:bg-zinc-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Image Preview */}
            <div className="w-full h-40 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex items-center justify-center relative">
              {selectedIssue.image ? (
                <img src={selectedIssue.image} alt={selectedIssue.title} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">🛡️</span>
              )}
            </div>

            {/* Category / Status Badges */}
            <div className="flex flex-wrap gap-2 items-center">
              {getSeverityBadge(selectedIssue.severity)}
              {getStatusBadge(selectedIssue.status)}
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-950 text-zinc-400 border border-zinc-800">
                Confidence: {selectedIssue.confidence}%
              </span>
            </div>

            {/* Description / Location details */}
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">Description</p>
                <p className="text-zinc-300 leading-relaxed bg-zinc-950 p-3 rounded-lg border border-zinc-800/60">{selectedIssue.description}</p>
              </div>

              {selectedIssue.severityReason && (
                <div className="space-y-1">
                  <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px]">AI Risk Assessment</p>
                  <p className="text-emerald-400 bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/15 leading-relaxed">
                    {selectedIssue.severityReason}
                  </p>
                </div>
              )}

              <div className="flex items-start gap-1.5 text-zinc-400 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/40">
                <MapPin className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-zinc-300 text-[11px]">{selectedIssue.location?.address}</p>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    [{selectedIssue.location?.coordinates[1]?.toFixed(4)}, {selectedIssue.location?.coordinates[0]?.toFixed(4)}]
                  </span>
                </div>
              </div>
            </div>

            {/* Community verification upvote controls */}
            <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-300 flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-emerald-400" />
                  Community Verification
                </span>
                <span className="text-[10px] text-zinc-500">Votes: {selectedIssue.upvotes?.length + selectedIssue.downvotes?.length}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleVote(selectedIssue._id, 'upvote')}
                  disabled={user && (selectedIssue.reporter === user.id || selectedIssue.reporter?._id === user.id || selectedIssue.upvotes?.includes(user.id))}
                  className="flex items-center justify-center gap-1.5 py-2 border border-zinc-800 hover:border-emerald-500/30 bg-zinc-900 hover:bg-emerald-500/5 text-xs text-zinc-400 hover:text-emerald-400 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  <span>Yes, active ({selectedIssue.upvotes?.length || 0})</span>
                </button>
                <button
                  onClick={() => handleVote(selectedIssue._id, 'downvote')}
                  disabled={user && (selectedIssue.reporter === user.id || selectedIssue.reporter?._id === user.id || selectedIssue.downvotes?.includes(user.id))}
                  className="flex items-center justify-center gap-1.5 py-2 border border-zinc-800 hover:border-rose-500/30 bg-zinc-900 hover:bg-rose-500/5 text-xs text-zinc-400 hover:text-rose-400 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ThumbsUp className="h-3.5 w-3.5 rotate-180" />
                  <span>No, resolved ({selectedIssue.downvotes?.length || 0})</span>
                </button>
              </div>
            </div>

            {/* Resolution Timeline Notes */}
            <div className="space-y-2.5 text-xs">
              <p className="text-zinc-500 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                Status Timeline
              </p>
              
              <div className="relative border-l border-zinc-800 ml-2.5 pl-4 space-y-4">
                {selectedIssue.timeline?.map((step, idx) => (
                  <div key={idx} className="relative">
                    {/* Circle icon */}
                    <div className="absolute -left-[22px] top-0.5 w-3 h-3 rounded-full border border-zinc-950 bg-emerald-500 shadow-glow"></div>
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-300">{step.status}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(step.updatedAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">{step.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
