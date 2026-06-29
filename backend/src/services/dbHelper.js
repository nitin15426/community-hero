import User from '../models/User.js';
import Issue from '../models/Issue.js';
import { getDbStatus } from '../config/db.js';
import bcrypt from 'bcryptjs';

// In-Memory storage arrays
let memoryUsers = [];
let memoryIssues = [];

// Helper to generate Mongo-like ObjectIDs in memory
const generateId = () => Math.random().toString(36).substring(2, 11) + Math.random().toString(36).substring(2, 11);

// Citizens badges helper
const updateBadges = (points) => {
  const badges = [];
  if (points >= 10) badges.push('First Responder');
  if (points >= 50) badges.push('Community Inspector');
  if (points >= 100) badges.push('Local Hero');
  if (points >= 200) badges.push('City Guardian');
  return badges;
};

export const dbHelper = {
  // ================= USERS =================
  async createUser(data) {
    if (getDbStatus()) {
      const user = new User({ ...data, points: data.points || 0, badges: data.badges || [] });
      return await user.save();
    } else {
      const newUser = {
        _id: generateId(),
        ...data,
        points: data.points || 0,
        badges: data.badges || [],
        createdAt: new Date()
      };
      memoryUsers.push(newUser);
      return newUser;
    }
  },

  async findUserByEmail(email) {
    const cleanedEmail = email.trim().toLowerCase();
    if (getDbStatus()) {
      return await User.findOne({ email: cleanedEmail });
    } else {
      return memoryUsers.find(u => u.email.toLowerCase() === cleanedEmail) || null;
    }
  },

  async findUserByClerkId(clerkId) {
    if (getDbStatus()) {
      return await User.findOne({ clerkId });
    } else {
      return memoryUsers.find(u => u.clerkId === clerkId) || null;
    }
  },

  async findUserById(id) {
    if (getDbStatus()) {
      return await User.findById(id);
    } else {
      return memoryUsers.find(u => u._id.toString() === id.toString()) || null;
    }
  },

  async updateUserPoints(userId, changePoints) {
    if (getDbStatus()) {
      const user = await User.findById(userId);
      if (!user) return null;
      user.points += changePoints;
      user.badges = updateBadges(user.points);
      return await user.save();
    } else {
      const idx = memoryUsers.findIndex(u => u._id.toString() === userId.toString());
      if (idx === -1) return null;
      memoryUsers[idx].points += changePoints;
      memoryUsers[idx].badges = updateBadges(memoryUsers[idx].points);
      return memoryUsers[idx];
    }
  },

  async updateUser(id, updates) {
    if (getDbStatus()) {
      return await User.findByIdAndUpdate(id, { $set: updates }, { new: true });
    } else {
      const idx = memoryUsers.findIndex(u => u._id.toString() === id.toString());
      if (idx === -1) return null;
      memoryUsers[idx] = {
        ...memoryUsers[idx],
        ...updates
      };
      return memoryUsers[idx];
    }
  },

  async getAllUsers() {
    if (getDbStatus()) {
      return await User.find({}).sort({ points: -1 });
    } else {
      return [...memoryUsers].sort((a, b) => b.points - a.points);
    }
  },

  // ================= ISSUES =================
  async createIssue(data) {
    if (getDbStatus()) {
      const issue = new Issue(data);
      const savedIssue = await issue.save();
      // Populate reporter name/email for compatibility
      return await savedIssue.populate('reporter', 'name email');
    } else {
      const newIssue = {
        _id: generateId(),
        ...data,
        status: data.status || 'Reported',
        upvotes: data.upvotes || [],
        downvotes: data.downvotes || [],
        duplicateOf: data.duplicateOf || null,
        timeline: data.timeline || [{
          status: 'Reported',
          note: 'Issue reported by citizen.',
          updatedAt: new Date()
        }],
        createdAt: data.createdAt || new Date()
      };
      memoryIssues.push(newIssue);
      
      // Emulate populate reporter
      const rep = memoryUsers.find(u => u._id.toString() === data.reporter.toString());
      const populated = {
        ...newIssue,
        reporter: rep ? { _id: rep._id, name: rep.name, email: rep.email } : { _id: data.reporter, name: 'Anonymous' }
      };
      return populated;
    }
  },

  async getIssues(filter = {}) {
    if (getDbStatus()) {
      // Return issues, filtering out duplicates from default map/list views unless explicitly asked
      const query = { ...filter };
      // By default, do not show duplicates
      if (query.duplicateOf === undefined) {
        query.duplicateOf = null;
      }
      return await Issue.find(query)
        .populate('reporter', 'name email')
        .sort({ createdAt: -1 });
    } else {
      let filtered = [...memoryIssues];
      
      // Default: don't show duplicates
      const showDuplicates = filter.duplicateOf !== undefined;
      const dupFilter = filter.duplicateOf;
      
      if (!showDuplicates) {
        filtered = filtered.filter(i => i.duplicateOf === null || i.duplicateOf === undefined);
      } else if (dupFilter !== undefined) {
        filtered = filtered.filter(i => {
          if (dupFilter === null) return i.duplicateOf === null || i.duplicateOf === undefined;
          return i.duplicateOf?.toString() === dupFilter.toString();
        });
      }

      if (filter.status) {
        filtered = filtered.filter(i => i.status === filter.status);
      }
      if (filter.category) {
        filtered = filtered.filter(i => i.category === filter.category);
      }
      if (filter.severity) {
        filtered = filtered.filter(i => i.severity === filter.severity);
      }
      if (filter.reporter) {
        filtered = filtered.filter(i => i.reporter?.toString() === filter.reporter.toString());
      }

      // Emulate populate reporter
      return filtered.map(issue => {
        const rep = memoryUsers.find(u => u._id.toString() === (issue.reporter?._id?.toString() || issue.reporter?.toString()));
        return {
          ...issue,
          reporter: rep ? { _id: rep._id, name: rep.name, email: rep.email } : { _id: issue.reporter, name: 'Anonymous' }
        };
      }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  },

  async findIssueById(id) {
    if (getDbStatus()) {
      return await Issue.findById(id).populate('reporter', 'name email');
    } else {
      const issue = memoryIssues.find(i => i._id.toString() === id.toString());
      if (!issue) return null;
      const rep = memoryUsers.find(u => u._id.toString() === (issue.reporter?._id?.toString() || issue.reporter?.toString()));
      return {
        ...issue,
        reporter: rep ? { _id: rep._id, name: rep.name, email: rep.email } : { _id: issue.reporter, name: 'Anonymous' }
      };
    }
  },

  async updateIssue(id, updates) {
    if (getDbStatus()) {
      return await Issue.findByIdAndUpdate(id, { $set: updates }, { new: true }).populate('reporter', 'name email');
    } else {
      const idx = memoryIssues.findIndex(i => i._id.toString() === id.toString());
      if (idx === -1) return null;
      
      memoryIssues[idx] = {
        ...memoryIssues[idx],
        ...updates
      };
      
      const rep = memoryUsers.find(u => u._id.toString() === (memoryIssues[idx].reporter?._id?.toString() || memoryIssues[idx].reporter?.toString()));
      return {
        ...memoryIssues[idx],
        reporter: rep ? { _id: rep._id, name: rep.name, email: rep.email } : { _id: memoryIssues[idx].reporter, name: 'Anonymous' }
      };
    }
  },

  async deleteIssue(id) {
    if (getDbStatus()) {
      return await Issue.findByIdAndDelete(id);
    } else {
      const idx = memoryIssues.findIndex(i => i._id.toString() === id.toString());
      if (idx === -1) return null;
      const deleted = memoryIssues[idx];
      memoryIssues.splice(idx, 1);
      return deleted;
    }
  },

  // Finding duplicates by geolocation (nearby open issues within ~50m)
  async findNearbyIssues(coordinates, category, maxDistanceMeters = 50) {
    const [longitude, latitude] = coordinates;
    
    if (getDbStatus()) {
      return await Issue.find({
        category: category,
        status: { $ne: 'Resolved' },
        duplicateOf: null,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [longitude, latitude]
            },
            $maxDistance: maxDistanceMeters
          }
        }
      });
    } else {
      // Haversine formula for distance estimation
      const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // in metres
      };

      return memoryIssues.filter(i => {
        if (i.category !== category) return false;
        if (i.status === 'Resolved') return false;
        if (i.duplicateOf !== null && i.duplicateOf !== undefined) return false;
        
        const [issueLng, issueLat] = i.location.coordinates;
        const dist = calculateDistance(latitude, longitude, issueLat, issueLng);
        return dist <= maxDistanceMeters;
      });
    }
  },

  // Clear database mock sets (useful for testing/seeding)
  clearMemoryDb() {
    memoryUsers = [];
    memoryIssues = [];
  },

  setMemoryIssues(issuesList) {
    memoryIssues = [...issuesList];
  },
  
  setMemoryUsers(usersList) {
    memoryUsers = [...usersList];
  },

  // Seed In-Memory Emulation database
  async seedInMemory() {
    this.clearMemoryDb();
    console.log('🌱 Emulating memory database seeding...');

    const usersData = [
      { name: 'Nitin Sharma', email: 'nitin@community.org', clerkId: 'user_nitin', role: 'citizen', points: 145, badges: ['First Responder', 'Community Inspector', 'Local Hero'] },
      { name: 'Aarav Mehta', email: 'aarav@citizen.in', clerkId: 'user_aarav', role: 'citizen', points: 80, badges: ['First Responder', 'Community Inspector'] },
      { name: 'Sneha Rao', email: 'sneha@mail.com', clerkId: 'user_sneha', role: 'citizen', points: 25, badges: ['First Responder'] },
      { name: 'Vikram Singh', email: 'vikram@gmail.com', clerkId: 'user_vikram', role: 'citizen', points: 110, badges: ['First Responder', 'Community Inspector', 'Local Hero'] },
      { name: 'Gurgaon Municipal Board (Admin)', email: 'admin@gurgaon.gov.in', clerkId: 'user_admin', role: 'authority', points: 0, badges: [] },
      { name: 'Civic Repairs Cell', email: 'repairs@gurgaon.gov.in', clerkId: 'user_repairs', role: 'authority', points: 0, badges: [] }
    ];

    const users = [];
    for (const u of usersData) {
      const newUser = {
        _id: generateId(),
        ...u,
        createdAt: new Date()
      };
      memoryUsers.push(newUser);
      users.push(newUser);
    }

    const citizens = users.filter(u => u.role === 'citizen');
    const authorities = users.filter(u => u.role === 'authority');

    const CENTER_LAT = 28.459;
    const CENTER_LNG = 77.026;
    const jitter = (range = 0.015) => (Math.random() - 0.5) * range;

    const categories = ['Pothole', 'Water Leakage', 'Garbage', 'Broken Streetlight', 'Road Damage'];
    const statuses = ['Reported', 'Verified', 'Assigned', 'In Progress', 'Resolved'];
    const severities = ['Low', 'Medium', 'High'];

    const descriptions = {
      'Pothole': [
        'Huge pothole right in the middle of the street near the intersection. Vehicles are swerving to avoid it.',
        'A deep pothole has formed near the school exit. It is a hazard for children and parents.',
        'Series of small potholes on the lane leading to the market. Slows down traffic significantly.',
        'Deep crater in the asphalt, already caused one tire puncture today.',
        'Large asphalt crack and pothole forming near the bus stop. Needs patching.'
      ],
      'Water Leakage': [
        'Clean drinking water is spraying from an underground pipe fracture near the park.',
        'Drainage water is overflowing onto the main road due to a blocked sewer pipe. Stinks badly.',
        'Moderate water leakage from a municipal pipeline junction. Wasting a lot of water.',
        'Continuous water seepage from the sidewalk, eroding the nearby soil.',
        'Gushing pipe leak near Sector 45 intersection. Road surface is starting to flood.'
      ],
      'Garbage': [
        'Huge pile of uncollected garbage on the corner of the residential colony. Attracting stray dogs.',
        'Plastic bags and construction waste dumped on the roadside. Blocked pedestrian pathway.',
        'Overflowing trash bin near the food court. Garbage is scattered everywhere.',
        'Illegal dumping of commercial plastic waste in the empty plot. Emitting foul odor.',
        'Rotting garbage pile near the park entrance. Needs urgent clearance.'
      ],
      'Broken Streetlight': [
        'The streetlight at the dark corner of Sector 47 lane 3 is inactive. Unsafe for women walking home.',
        'Two consecutive streetlights are broken on the main avenue. Completely pitch black at night.',
        'Flickering streetlight bulb. Very annoying and dangerous for drivers.',
        'Streetlight pole knocked down or broken after a windstorm.',
        'Entire sector lane lighting is offline. Potential short circuit.'
      ],
      'Road Damage': [
        'Sidewalk concrete slabs are broken and loose. Pedestrians are tripping.',
        'Major asphalt crack extending across three lanes. Poses skid hazard for motorbikes.',
        'Dividing concrete block has shifted into the driving lane after a collision.',
        'Eroded road pavement on the curve of the flyover bridge.',
        'Loose gravel and broken tiles scattered over the walkway.'
      ]
    };

    const addressNames = [
      'Sector 45 Main Rd, Gurgaon',
      'Sector 47 Market St, Gurgaon',
      'Leisure Valley Lane, Gurgaon',
      'Ardee City Main Road, Gurgaon',
      'Medanta Hospital Road, Gurgaon',
      'Sohna Road, Gurgaon',
      'Golf Course Road, Gurgaon',
      'DLF Phase 3 Metro Rd, Gurgaon',
      'MG Road Mall Mile, Gurgaon',
      'Cyber Hub Back Alley, Gurgaon'
    ];

    for (let i = 0; i < 45; i++) {
      let lat = CENTER_LAT;
      let lng = CENTER_LNG;
      let cat = categories[i % categories.length];
      let addr = addressNames[i % addressNames.length];

      if (i < 15) {
        lat = CENTER_LAT + 0.002 + jitter(0.001);
        lng = CENTER_LNG - 0.003 + jitter(0.001);
        cat = 'Water Leakage';
        addr = `Sector 45 Block B, ${addressNames[0]}`;
      } else if (i >= 15 && i < 28) {
        lat = CENTER_LAT - 0.004 + jitter(0.0015);
        lng = CENTER_LNG + 0.005 + jitter(0.0015);
        cat = 'Pothole';
        addr = `Sector 47 Lane 4, ${addressNames[1]}`;
      } else if (i >= 28 && i < 38) {
        lat = CENTER_LAT + 0.008 + jitter(0.002);
        lng = CENTER_LNG + 0.007 + jitter(0.002);
        cat = 'Garbage';
        addr = `DLF Phase 3 Alleyway, ${addressNames[7]}`;
      } else {
        lat = CENTER_LAT + jitter(0.015);
        lng = CENTER_LNG + jitter(0.015);
        cat = categories[i % categories.length];
      }

      const reporter = citizens[i % citizens.length];
      const descList = descriptions[cat];
      const desc = descList[i % descList.length];
      const status = statuses[i % statuses.length];
      const severity = severities[i % severities.length];

      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - (i % 30));

      const title = `${cat} reported at ${addr.split(',')[0]}`;

      const upvoteCount = Math.floor(Math.random() * 8);
      const voterIds = [];
      for (let v = 0; v < upvoteCount; v++) {
        const voter = citizens[(reporter.name === citizens[v % citizens.length].name ? v + 1 : v) % citizens.length];
        if (voter) voterIds.push(voter._id);
      }

      const timeline = [
        { status: 'Reported', note: 'Citizen reported the issue.', updatedBy: reporter._id, updatedAt: createdAt }
      ];

      if (status !== 'Reported') {
        const verifyDate = new Date(createdAt);
        verifyDate.setHours(verifyDate.getHours() + 4);
        timeline.push({ status: 'Verified', note: 'Community upvote verification complete.', updatedAt: verifyDate });
      }

      if (['Assigned', 'In Progress', 'Resolved'].includes(status)) {
        const assignDate = new Date(createdAt);
        assignDate.setDate(assignDate.getDate() + 1);
        timeline.push({ status: 'Assigned', note: 'Workorder assigned to Municipal maintenance cell.', updatedBy: authorities[0]._id, updatedAt: assignDate });
      }

      if (['In Progress', 'Resolved'].includes(status)) {
        const progressDate = new Date(createdAt);
        progressDate.setDate(progressDate.getDate() + 2);
        timeline.push({ status: 'In Progress', note: 'Ground repair teams deployed to location.', updatedBy: authorities[1]._id, updatedAt: progressDate });
      }

      if (status === 'Resolved') {
        const resolveDate = new Date(createdAt);
        resolveDate.setDate(resolveDate.getDate() + 4);
        timeline.push({ status: 'Resolved', note: 'Repair completed. Paved over / cleaned. Closed.', updatedBy: authorities[0]._id, updatedAt: resolveDate });
      }

      const newIssue = {
        _id: generateId(),
        title,
        description: desc,
        image: '',
        category: cat,
        confidence: Math.floor(Math.random() * 15) + 84,
        severity,
        severityReason: `AI evaluated ${severity.toLowerCase()} impact on vehicle safety and municipal traffic flow.`,
        location: {
          type: 'Point',
          coordinates: [lng, lat],
          address: addr
        },
        reporter: reporter._id,
        status,
        upvotes: voterIds,
        downvotes: [],
        timeline,
        createdAt
      };

      memoryIssues.push(newIssue);
    }
    console.log(`✅ Loaded ${memoryIssues.length} mock issues into memory.`);
  }
};
