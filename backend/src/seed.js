import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { dbHelper } from './services/dbHelper.js';
import User from './models/User.js';
import Issue from './models/Issue.js';

dotenv.config();

// Standard coordinates for Gurgaon
const CENTER_LAT = 28.459;
const CENTER_LNG = 77.026;

// Random jitter generator for spreading out markers
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
  'Sector 45 Main Rd, near Huda City Centre',
  'Sector 47 Market St, opposite Supermart',
  'Leisure Valley Lane, near Sector 29',
  'Ardee City Main Road, near gate 2',
  'Medanta Hospital Road, Sector 38',
  'Sohna Road, near Subhash Chowk',
  'Golf Course Road, near Sector 54',
  'DLF Phase 3 Metro Rd',
  'MG Road Mall Mile, Sector 25',
  'Cyber Hub Back Alley, Sector 24'
];

const seedData = async () => {
  try {
    // Connect to DB first
    await connectDB();

    console.log('🧹 Cleaning existing data (User & Issue)...');
    // If DB is connected, delete documents. If in-memory, dbHelper has separate state, but seed runs in Node process.
    // So we clean up using mongoose model directly.
    try {
      await User.deleteMany({});
      await Issue.deleteMany({});
      console.log('✅ Collections cleared.');
    } catch (e) {
      console.log('⚠️ Direct MongoDB clean skipped (running in-memory or connection pending).');
    }
    
    dbHelper.clearMemoryDb();

    console.log('👥 Seeding Users...');

    // Create 4 citizens and 2 authorities
    const citizenData = [
      { name: 'Nitin Sharma', email: 'nitin@community.org', clerkId: 'user_nitin', role: 'citizen', points: 145, badges: ['First Responder', 'Community Inspector', 'Local Hero'] },
      { name: 'Aarav Mehta', email: 'aarav@citizen.in', clerkId: 'user_aarav', role: 'citizen', points: 80, badges: ['First Responder', 'Community Inspector'] },
      { name: 'Sneha Rao', email: 'sneha@mail.com', clerkId: 'user_sneha', role: 'citizen', points: 25, badges: ['First Responder'] },
      { name: 'Vikram Singh', email: 'vikram@gmail.com', clerkId: 'user_vikram', role: 'citizen', points: 110, badges: ['First Responder', 'Community Inspector', 'Local Hero'] }
    ];

    const authorityData = [
      { name: 'Gurgaon Municipal Board (Admin)', email: 'admin@gurgaon.gov.in', clerkId: 'user_admin', role: 'authority', points: 0, badges: [] },
      { name: 'Civic Repairs Cell', email: 'repairs@gurgaon.gov.in', clerkId: 'user_repairs', role: 'authority', points: 0, badges: [] }
    ];

    const users = [];
    for (const u of [...citizenData, ...authorityData]) {
      const user = await dbHelper.createUser(u);
      users.push(user);
    }

    const citizens = users.filter(u => u.role === 'citizen');
    const authorities = users.filter(u => u.role === 'authority');
    console.log(`✅ Seeded ${users.length} users successfully.`);

    console.log('📌 Seeding Issues...');
    const seededIssues = [];

    // Create 45 issues scattered over 30 days
    // We will place them in clusters to create Hotspots!
    // Hotspot 1: Sector 45 (high Water Leakage concentration)
    // Hotspot 2: Sector 47 (high Pothole concentration)
    // Hotspot 3: Cyber Hub Alley (high Garbage concentration)
    // Hotspot 4: Scattered items

    for (let i = 0; i < 45; i++) {
      let lat = CENTER_LAT;
      let lng = CENTER_LNG;
      let cat = categories[i % categories.length];
      let addr = addressNames[i % addressNames.length];

      // Assign coordinate patterns to form clusters
      if (i < 15) {
        // Cluster 1: Sector 45 (Leakage hotspot)
        lat = CENTER_LAT + 0.002 + jitter(0.001);
        lng = CENTER_LNG - 0.003 + jitter(0.001);
        cat = 'Water Leakage';
        addr = `Sector 45 Block B, ${addressNames[0]}`;
      } else if (i >= 15 && i < 28) {
        // Cluster 2: Sector 47 (Pothole hotspot)
        lat = CENTER_LAT - 0.004 + jitter(0.0015);
        lng = CENTER_LNG + 0.005 + jitter(0.0015);
        cat = 'Pothole';
        addr = `Sector 47 Lane 4, ${addressNames[1]}`;
      } else if (i >= 28 && i < 38) {
        // Cluster 3: DLF Phase 3/Cyber Hub (Garbage hotspot)
        lat = CENTER_LAT + 0.008 + jitter(0.002);
        lng = CENTER_LNG + 0.007 + jitter(0.002);
        cat = 'Garbage';
        addr = `DLF Phase 3 Alleyway, ${addressNames[7]}`;
      } else {
        // Rest are randomly scattered
        lat = CENTER_LAT + jitter(0.015);
        lng = CENTER_LNG + jitter(0.015);
        cat = categories[i % categories.length];
      }

      const reporter = citizens[i % citizens.length];
      const descList = descriptions[cat];
      const desc = descList[i % descList.length];
      const status = statuses[i % statuses.length];
      const severity = severities[i % severities.length];

      // Build historical timestamp spread over 30 days
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - (i % 30));

      const title = `${cat} reported at ${addr.split(',')[0]}`;

      // Build random upvotes
      const upvoteCount = Math.floor(Math.random() * 8);
      const voterIds = [];
      for (let v = 0; v < upvoteCount; v++) {
        const voter = citizens[(reporter.name === citizens[v % citizens.length].name ? v + 1 : v) % citizens.length];
        if (voter) voterIds.push(voter._id);
      }

      // Timeline entries
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
        assignDate.setDays ? assignDate.setDate(assignDate.getDate() + 1) : assignDate.setDate(assignDate.getDate() + 1);
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

      const issueData = {
        title,
        description: desc,
        image: '', // leave empty or mock
        category: cat,
        confidence: Math.floor(Math.random() * 15) + 84, // 84-99%
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

      const seeded = await dbHelper.createIssue(issueData);
      seededIssues.push(seeded);
    }

    console.log(`✅ Seeded ${seededIssues.length} issues successfully.`);
    console.log('🚀 Seeding complete! Database is fully populated.');
    
    // Disconnect Mongoose if direct connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('🔌 Mongoose connection closed.');
    }
  } catch (error) {
    console.error('❌ Error during seeding database:', error);
  }
};

seedData();
