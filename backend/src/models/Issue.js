import mongoose from 'mongoose';

const IssueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String, // local path, base64, or Cloudinary URL
    default: ''
  },
  category: {
    type: String,
    enum: ['Pothole', 'Water Leakage', 'Garbage', 'Broken Streetlight', 'Road Damage', 'Other'],
    required: true
  },
  confidence: {
    type: Number,
    default: 100
  },
  severity: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  severityReason: {
    type: String,
    default: ''
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    },
    address: {
      type: String,
      default: ''
    }
  },
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Reported', 'Verified', 'Assigned', 'In Progress', 'Resolved'],
    default: 'Reported'
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Issue',
    default: null
  },
  timeline: [{
    status: {
      type: String,
      required: true
    },
    note: {
      type: String,
      default: ''
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Spatial index for geolocation queries (duplicate detection)
IssueSchema.index({ 'location': '2dsphere' });

const Issue = mongoose.model('Issue', IssueSchema);
export default Issue;
