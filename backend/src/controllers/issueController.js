import fs from 'fs';
import { dbHelper } from '../services/dbHelper.js';
import { geminiService } from '../services/geminiService.js';

// Helper to convert file to base64
const fileToBase64 = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  const fileBuffer = fs.readFileSync(filePath);
  return fileBuffer.toString('base64');
};

export const analyzeIssueDetails = async (req, res) => {
  try {
    const { description } = req.body;
    let imageBase64 = null;
    let mimeType = 'image/jpeg';

    if (req.file) {
      imageBase64 = fileToBase64(req.file.path);
      mimeType = req.file.mimetype;
      
      // Clean up uploaded file since it was only for analysis
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Failed to delete temp file:', err);
      });
    }

    if (!description && !imageBase64) {
      return res.status(400).json({ message: 'Provide either a description or an image for AI analysis.' });
    }

    // Call Gemini API service
    const analysis = await geminiService.analyzeIssue(description || '', imageBase64, mimeType);
    
    res.json(analysis);
  } catch (error) {
    console.error('AI Analysis controller error:', error);
    res.status(500).json({ message: 'Server error during AI analysis.' });
  }
};

export const createIssue = async (req, res) => {
  try {
    const { title, description, category, confidence, severity, severityReason, latitude, longitude, address, isDuplicateCheck } = req.body;
    const userId = req.user.id;

    if (!title || !description || !latitude || !longitude) {
      return res.status(400).json({ message: 'Title, description, and GPS coordinates are required.' });
    }

    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);

    let imagePath = '';
    let imageBase64 = '';
    let mimeType = 'image/jpeg';

    if (req.file) {
      // For local upload, we'll store the local static URL
      imagePath = `/uploads/${req.file.filename}`;
      imageBase64 = fileToBase64(req.file.path);
      mimeType = req.file.mimetype;
    }

    // Double-check AI categorization if not provided by client
    let finalCategory = category || 'Other';
    let finalConfidence = confidence ? parseFloat(confidence) : 100;
    let finalSeverity = severity || 'Medium';
    let finalSeverityReason = severityReason || '';

    if (!category || !severity) {
      const analysis = await geminiService.analyzeIssue(description, imageBase64, mimeType);
      finalCategory = analysis.category;
      finalConfidence = analysis.confidence;
      finalSeverity = analysis.severity;
      finalSeverityReason = analysis.severityReason;
    }

    const coordinates = [lngNum, latNum]; // [longitude, latitude]

    // 1. Duplicate Detection
    let duplicateOf = null;
    let dupReason = '';
    
    // Find nearby issues within 50 meters of same category
    const nearbyIssues = await dbHelper.findNearbyIssues(coordinates, finalCategory, 50);
    
    if (nearbyIssues.length > 0) {
      // Ask Gemini to compare descriptions to confirm duplicate
      const duplicateResult = await geminiService.checkDuplicate(description, nearbyIssues);
      if (duplicateResult) {
        duplicateOf = duplicateResult.duplicateOf;
        dupReason = duplicateResult.reason;
      }
    }

    // 2. Build Issue Object
    const issueData = {
      title,
      description,
      image: imagePath,
      category: finalCategory,
      confidence: finalConfidence,
      severity: finalSeverity,
      severityReason: finalSeverityReason,
      location: {
        type: 'Point',
        coordinates,
        address: address || `Lat: ${latNum.toFixed(4)}, Lng: ${lngNum.toFixed(4)}`
      },
      reporter: userId,
      status: duplicateOf ? 'Verified' : 'Reported', // If duplicate, it is already verified
      duplicateOf,
      timeline: [{
        status: 'Reported',
        note: duplicateOf 
          ? `Merged report: Identified as duplicate of existing issue. ${dupReason}`
          : 'Issue reported by citizen and received by municipal system.',
        updatedBy: userId,
        updatedAt: new Date()
      }]
    };

    const newIssue = await dbHelper.createIssue(issueData);

    // 3. Citizen Reward Gamification (Points)
    // Citizens get 10 points for a new unique report
    // If it's a duplicate, they get 5 points for helping verify it
    const pointsAwarded = duplicateOf ? 5 : 10;
    await dbHelper.updateUserPoints(userId, pointsAwarded);

    res.status(201).json({
      message: duplicateOf ? 'Duplicate issue merged successfully' : 'Issue reported successfully',
      issue: newIssue,
      pointsAwarded,
      isDuplicate: !!duplicateOf,
      duplicateOfId: duplicateOf
    });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ message: 'Server error creating issue.' });
  }
};

export const getIssues = async (req, res) => {
  try {
    const { category, severity, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;

    const issues = await dbHelper.getIssues(filter);
    res.json(issues);
  } catch (error) {
    console.error('Fetch issues error:', error);
    res.status(500).json({ message: 'Server error fetching issues.' });
  }
};

export const getMyIssues = async (req, res) => {
  try {
    const issues = await dbHelper.getIssues({ reporter: req.user.id });
    res.json(issues);
  } catch (error) {
    console.error('Fetch citizen issues error:', error);
    res.status(500).json({ message: 'Server error fetching your reports.' });
  }
};

export const getIssueById = async (req, res) => {
  try {
    const issue = await dbHelper.findIssueById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    // Fetch duplicates if any
    const duplicates = await dbHelper.getIssues({ duplicateOf: issue._id });

    res.json({
      issue,
      duplicates
    });
  } catch (error) {
    console.error('Get issue details error:', error);
    res.status(500).json({ message: 'Server error fetching issue details.' });
  }
};

export const upvoteIssue = async (req, res) => {
  try {
    const issue = await dbHelper.findIssueById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    const userId = req.user.id;
    let upvotes = issue.upvotes.map(id => id.toString());
    let downvotes = issue.downvotes.map(id => id.toString());

    // Prevent reporter from voting
    if (issue.reporter.toString() === userId || issue.reporter._id?.toString() === userId) {
      return res.status(400).json({ message: 'You cannot vote on your own reports.' });
    }

    if (upvotes.includes(userId)) {
      return res.status(400).json({ message: 'You have already upvoted this issue.' });
    }

    // Remove downvote if present
    downvotes = downvotes.filter(id => id !== userId);
    upvotes.push(userId);

    // Update issue
    const updatedTimeline = [...issue.timeline];
    
    // Automatically transition status to 'Verified' if upvotes cross a threshold (e.g. 3 votes) and it is still 'Reported'
    let finalStatus = issue.status;
    if (issue.status === 'Reported' && upvotes.length >= 3) {
      finalStatus = 'Verified';
      updatedTimeline.push({
        status: 'Verified',
        note: `Auto-verified by community vote threshold reached (${upvotes.length} upvotes).`,
        updatedAt: new Date()
      });
    }

    const updatedIssue = await dbHelper.updateIssue(req.params.id, {
      upvotes,
      downvotes,
      status: finalStatus,
      timeline: updatedTimeline
    });

    // Reward the voter with 2 contribution points for helping verify!
    await dbHelper.updateUserPoints(userId, 2);

    res.json({
      message: 'Vote registered. Contribution points earned!',
      issue: updatedIssue,
      pointsAwarded: 2
    });
  } catch (error) {
    console.error('Upvote error:', error);
    res.status(500).json({ message: 'Server error upvoting.' });
  }
};

export const downvoteIssue = async (req, res) => {
  try {
    const issue = await dbHelper.findIssueById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    const userId = req.user.id;
    let upvotes = issue.upvotes.map(id => id.toString());
    let downvotes = issue.downvotes.map(id => id.toString());

    if (issue.reporter.toString() === userId || issue.reporter._id?.toString() === userId) {
      return res.status(400).json({ message: 'You cannot vote on your own reports.' });
    }

    if (downvotes.includes(userId)) {
      return res.status(400).json({ message: 'You have already downvoted this issue.' });
    }

    // Remove upvote if present
    upvotes = upvotes.filter(id => id !== userId);
    downvotes.push(userId);

    // If downvotes outnumber upvotes substantially (e.g., 5 downvotes and downvotes > upvotes), we can flag it or lower priority.
    const updatedIssue = await dbHelper.updateIssue(req.params.id, {
      upvotes,
      downvotes
    });

    // Reward voter with 2 contribution points for community moderation!
    await dbHelper.updateUserPoints(userId, 2);

    res.json({
      message: 'Dispute vote registered. Contribution points earned!',
      issue: updatedIssue,
      pointsAwarded: 2
    });
  } catch (error) {
    console.error('Downvote error:', error);
    res.status(500).json({ message: 'Server error registering dispute.' });
  }
};

export const updateIssueStatus = async (req, res) => {
  try {
    const { status, note } = req.body;
    const authorityId = req.user.id;

    if (!status) {
      return res.status(400).json({ message: 'Please specify the new status.' });
    }

    const issue = await dbHelper.findIssueById(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: 'Issue not found.' });
    }

    const timeline = [...issue.timeline];
    timeline.push({
      status,
      note: note || `Status updated to ${status} by municipal authority.`,
      updatedBy: authorityId,
      updatedAt: new Date()
    });

    const updatedIssue = await dbHelper.updateIssue(req.params.id, {
      status,
      timeline
    });

    // If status is Resolved, reward the original reporter with 50 big bonus points!
    let pointsAwarded = 0;
    if (status === 'Resolved') {
      pointsAwarded = 50;
      await dbHelper.updateUserPoints(issue.reporter._id || issue.reporter, pointsAwarded);
      
      // Also reward any linked duplicate reporters with 20 points!
      const duplicates = await dbHelper.getIssues({ duplicateOf: issue._id });
      for (const dup of duplicates) {
        await dbHelper.updateUserPoints(dup.reporter._id || dup.reporter, 20);
      }
    }

    res.json({
      message: `Status successfully updated to: ${status}`,
      issue: updatedIssue,
      reporterPointsAwarded: pointsAwarded
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Server error updating status.' });
  }
};
