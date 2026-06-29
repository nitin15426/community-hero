import { GoogleGenAI } from '@google/genai';
import { getDbStatus } from '../config/db.js';

// Initialize Gemini client if API key is present
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Mock AI analyzer when Gemini API Key is missing
const mockAnalyzeIssue = (description = '') => {
  const desc = description.toLowerCase();
  
  let category = 'Other';
  let confidence = Math.floor(Math.random() * 15) + 80; // 80 - 95%
  let severity = 'Medium';
  let severityReason = 'Assigned medium risk based on standard urban safety guidelines.';
  
  if (desc.includes('pothole') || desc.includes('crater') || desc.includes('hole in road') || desc.includes('bump')) {
    category = 'Pothole';
    severity = desc.includes('big') || desc.includes('huge') || desc.includes('deep') || desc.includes('highway') ? 'High' : 'Medium';
    severityReason = severity === 'High' 
      ? 'Deep pothole detected on active roadway. High risk of vehicle damage or tire bursts.'
      : 'Moderate size pothole. May cause minor traffic slow-downs and vehicle wear.';
  } else if (desc.includes('water') || desc.includes('leak') || desc.includes('pipe') || desc.includes('burst') || desc.includes('flooding')) {
    category = 'Water Leakage';
    severity = desc.includes('flooded') || desc.includes('gushing') || desc.includes('main') || desc.includes('waste') ? 'High' : 'Medium';
    severityReason = severity === 'High' 
      ? 'Large volume water main rupture, causing local flooding and potential clean water waste.'
      : 'Minor water pipe seepage. Needs repair before ground erosion occurs.';
  } else if (desc.includes('garbage') || desc.includes('trash') || desc.includes('waste') || desc.includes('pile') || desc.includes('dump') || desc.includes('smell')) {
    category = 'Garbage';
    severity = desc.includes('large') || desc.includes('toxic') || desc.includes('block') || desc.includes('rot') ? 'High' : 'Medium';
    severityReason = severity === 'High' 
      ? 'Massive accumulation of unsorted waste blocking pedestrian path and attracting pests.'
      : 'Overflowing dustbin. Health hazard if left uncollected for more than 48 hours.';
  } else if (desc.includes('street light') || desc.includes('streetlight') || desc.includes('broken light') || desc.includes('dark') || desc.includes('lamp')) {
    category = 'Broken Streetlight';
    severity = desc.includes('crime') || desc.includes('completely dark') || desc.includes('junction') || desc.includes('highway') ? 'High' : 'Low';
    severityReason = severity === 'High' 
      ? 'Key intersection streetlight is inactive. Creates safety hazards and increases pedestrian vulnerability at night.'
      : 'Single streetlight bulb failure on a well-lit secondary street.';
  } else if (desc.includes('road damage') || desc.includes('sidewalk') || desc.includes('divider') || desc.includes('crack') || desc.includes('asphalt')) {
    category = 'Road Damage';
    severity = desc.includes('collapsed') || desc.includes('sinkhole') || desc.includes('unsafe') ? 'High' : 'Medium';
    severityReason = severity === 'High' 
      ? 'Structural failure of road section (sinkhole/collapse), posing direct risk to drivers.'
      : 'Cracked road pavement or broken pavement tiles on sidewalk.';
  }

  // Double-check severity overrides based on urgent keywords
  if (desc.includes('accident') || desc.includes('crash') || desc.includes('danger') || desc.includes('emergency') || desc.includes('hazard') || desc.includes('kill')) {
    severity = 'High';
    severityReason = 'High hazard: User description indicates immediate physical safety threat or historical accidents at this location.';
  }

  return { category, confidence, severity, severityReason };
};

export const geminiService = {
  /**
   * Analyze issue details (image + text) to predict category, confidence, and severity
   */
  async analyzeIssue(description, imageBase64, mimeType = 'image/jpeg') {
    const ai = getGeminiClient();
    
    if (!ai) {
      console.log('🤖 Gemini API Key not set. Using Mock AI for Categorization & Severity.');
      return mockAnalyzeIssue(description);
    }

    try {
      const contents = [];
      
      // If image is uploaded, add it to contents
      if (imageBase64) {
        contents.push({
          inlineData: {
            data: imageBase64,
            mimeType: mimeType
          }
        });
      }

      contents.push({
        text: `Citizen Report Description: "${description}"`
      });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
          systemInstruction: `You are the AI engine of "Community Hero", a civic action system. Your task is to analyze the reported issue description and visual media.
          Return ONLY a JSON object containing:
          - category: Must be exactly one of: "Pothole", "Water Leakage", "Garbage", "Broken Streetlight", "Road Damage", "Other"
          - confidence: Integer between 0 and 100 representing your classification confidence
          - severity: Must be exactly one of: "Low", "Medium", "High"
          - severityReason: A one-sentence explanation of why you selected this severity, analyzing public risk, potential accidents, and resources wasted.
          
          Example JSON output:
          {
            "category": "Pothole",
            "confidence": 94,
            "severity": "High",
            "severityReason": "Located on a high-speed lane, forcing drivers to swerve dangerously."
          }
          Do not include any markdown formatting or extra text outside the JSON.`,
          responseMimeType: 'application/json'
        }
      });

      const jsonText = response.text;
      const result = JSON.parse(jsonText);
      
      // Sanitize fields
      const validCategories = ["Pothole", "Water Leakage", "Garbage", "Broken Streetlight", "Road Damage", "Other"];
      const validSeverities = ["Low", "Medium", "High"];
      
      return {
        category: validCategories.includes(result.category) ? result.category : 'Other',
        confidence: typeof result.confidence === 'number' ? result.confidence : 85,
        severity: validSeverities.includes(result.severity) ? result.severity : 'Medium',
        severityReason: result.severityReason || 'Categorized by Gemini AI.'
      };

    } catch (error) {
      console.error('Error with Gemini analyzeIssue API:', error);
      // Fallback to mock AI on API failure
      return mockAnalyzeIssue(description);
    }
  },

  /**
   * Determine if a newly reported issue is a duplicate of a nearby issue
   */
  async checkDuplicate(newDesc, existingIssues) {
    if (existingIssues.length === 0) return null;

    const ai = getGeminiClient();
    if (!ai) {
      // Mock duplicate check: if they have the same category and description matches by 40% keyword overlap
      const newWords = new Set(newDesc.toLowerCase().split(/\W+/).filter(w => w.length > 3));
      for (const issue of existingIssues) {
        const existWords = newDesc.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const intersection = existWords.filter(w => newWords.has(w));
        const overlapRatio = intersection.length / Math.max(1, newWords.size);
        
        if (overlapRatio > 0.4) {
          console.log(`🤖 Mock AI Duplicate Engine: Detected Duplicate for issue: "${issue.title}" (overlap: ${Math.round(overlapRatio*100)}%)`);
          return {
            duplicateOf: issue._id,
            reason: `Highly similar description reported at the same location: "${issue.description}"`
          };
        }
      }
      return null;
    }

    try {
      const candidates = existingIssues.map((i, index) => ({
        id: i._id,
        index: index + 1,
        title: i.title,
        description: i.description,
        category: i.category
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            text: `New Issue Description: "${newDesc}"\n\nNearby Active Issues:\n${JSON.stringify(candidates, null, 2)}`
          }
        ],
        config: {
          systemInstruction: `You are the AI engine of "Community Hero". A citizen is reporting a new issue.
          Analyze the new issue description and compare it against the list of nearby active issues.
          Determine if the new report is describing the EXACT SAME physical incident or object (e.g. the same pothole on the same corner, the same pile of garbage on the pavement) as any of the nearby issues.
          
          Respond ONLY with a JSON object:
          {
            "isDuplicate": true or false,
            "duplicateIndex": 1-indexed number of the matching issue (null if not duplicate),
            "reason": "Explain why they match, or why they are separate occurrences."
          }
          Do not include any markdown formatting. Output pure JSON.`,
          responseMimeType: 'application/json'
        }
      });

      const result = JSON.parse(response.text);
      if (result.isDuplicate && result.duplicateIndex) {
        const matchedIssue = existingIssues[result.duplicateIndex - 1];
        if (matchedIssue) {
          return {
            duplicateOf: matchedIssue._id,
            reason: result.reason || 'AI determined this is a duplicate of an existing report.'
          };
        }
      }
      return null;

    } catch (error) {
      console.error('Error with Gemini duplicate detection:', error);
      return null;
    }
  },

  /**
   * Predict future hotspot locations and systemic failures based on historical logs
   */
  async predictHotspots(issues) {
    const ai = getGeminiClient();

    // Group issues by category and general location clusters
    const stats = issues.reduce((acc, issue) => {
      const cat = issue.category;
      // Round GPS coordinates to 3 decimals to group close issues (~100m)
      const lat = issue.location?.coordinates[1]?.toFixed(3) || '0.000';
      const lng = issue.location?.coordinates[0]?.toFixed(3) || '0.000';
      const locKey = `(${lat}, ${lng})`;
      const address = issue.location?.address?.split(',')[0] || `Area ${locKey}`;

      if (!acc[locKey]) {
        acc[locKey] = {
          location: locKey,
          address,
          issuesCount: 0,
          categories: {},
          recentDates: []
        };
      }

      acc[locKey].issuesCount += 1;
      acc[locKey].categories[cat] = (acc[locKey].categories[cat] || 0) + 1;
      acc[locKey].recentDates.push(issue.createdAt);
      return acc;
    }, {});

    const clusters = Object.values(stats).sort((a, b) => b.issuesCount - a.issuesCount);
    const topClusters = clusters.slice(0, 5); // top 5 hotspots

    if (!ai) {
      console.log('🤖 Gemini API Key not set. Generating Mock Predictive Insights.');
      
      const mockPredictions = topClusters.map((c, idx) => {
        const majorCategory = Object.keys(c.categories).sort((x, y) => c.categories[y] - c.categories[x])[0];
        
        let predictionText = '';
        let recommendations = [];
        
        if (majorCategory === 'Pothole' || majorCategory === 'Road Damage') {
          predictionText = `Increasing rate of asphalt erosion near ${c.address}. High likelihood of a major pothole chain or deep sinkhole forming within the next 15-30 days, especially if rainfall increases.`;
          recommendations = [
            `Initiate resurfacing of the high-wear zone near ${c.address}.`,
            'Inspect base-layer compaction for drainage failure.',
            'Deploy traffic warnings to limit heavy vehicle speeds.'
          ];
        } else if (majorCategory === 'Water Leakage') {
          predictionText = `Repeated water leakages near ${c.address} (${c.categories['Water Leakage']} reports) indicate water main pipe pressure spikes or local rust. Expected major pipe rupture and street erosion within 10 days.`;
          recommendations = [
            `Conduct acoustic leakage detection on the main pipeline segment near ${c.address}.`,
            'Check pressure reduction valves in the supply circuit.',
            'Pre-position municipal repair teams for rapid deployment.'
          ];
        } else if (majorCategory === 'Garbage') {
          predictionText = `Persistent sanitation issues at ${c.address} highlight insufficient containment and irregular collection intervals. Predicts rodent infestation and severe blockage of storm drains ahead of monsoon.`;
          recommendations = [
            `Install a high-capacity closed dumpster at ${c.address}.`,
            'Increase garbage vehicle clearance frequency to twice daily.',
            'Deploy surveillance or warning signs to deter commercial dumpers.'
          ];
        } else if (majorCategory === 'Broken Streetlight') {
          predictionText = `Concentrated darkness near ${c.address} increases night-time crime risks and traffic accidents. Forecasts 40% bump in vehicle-pedestrian incidents over the next month.`;
          recommendations = [
            'Conduct a circuit line-load check to detect transformer overload.',
            'Replace existing incandescent bulbs with long-life LED bulbs.',
            'Add solar-powered auxiliary path lights.'
          ];
        } else {
          predictionText = `General cluster of civic issues at ${c.address}. Represents general urban maintenance lag. High risk of community dissatisfaction.`;
          recommendations = [
            `Schedule a comprehensive maintenance drive in the ${c.address} sector.`,
            'Engage community leaders in reporting status updates.',
            'Verify all resolved reports are authenticated.'
          ];
        }

        return {
          id: `pred-${idx}`,
          location: c.location,
          address: c.address,
          issuesCount: c.issuesCount,
          categories: c.categories,
          prediction: predictionText,
          recommendations: recommendations,
          severity: c.issuesCount >= 3 ? 'High' : 'Medium'
        };
      });

      return {
        summary: `AI analyzed ${issues.length} active and historical reports. Detected ${clusters.length} active geographic clusters. Systemic water line stress is predicted in areas with repetitive leakages, and road surface damage threatens key transit paths.`,
        predictions: mockPredictions.length > 0 ? mockPredictions : [
          {
            id: 'pred-default',
            location: '(28.459, 77.026)',
            address: 'Sector 47 main street',
            issuesCount: 1,
            categories: { 'Pothole': 1 },
            prediction: 'Isolated pothole. Unlikely to expand if patched within 14 days.',
            recommendations: ['Patch during next routine maintenance.'],
            severity: 'Low'
          }
        ]
      };
    }

    try {
      const promptData = clusters.map(c => ({
        location: c.location,
        address: c.address,
        totalIssues: c.issuesCount,
        categories: c.categories
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            text: `Analyze the following municipal issue clusters: ${JSON.stringify(promptData, null, 2)}`
          }
        ],
        config: {
          systemInstruction: `You are a municipal planner and AI analyst. Analyze the provided geographic issue clusters reported by citizens.
          Forecast systemic problems (e.g., if an area has many water leakages, it means the pipes are aging and will burst. If there are many dark streetlights, a transformer is overloading).
          Provide a summary overview, and a list of specific predictions for the top hotspots.
          
          Return ONLY a JSON object:
          {
            "summary": "High-level overview analyzing overall trends in the city.",
            "predictions": [
              {
                "location": "(lat, lng)",
                "address": "General Area Name",
                "issuesCount": 10,
                "categories": { "Category": count },
                "prediction": "AI forecast about what will fail and why (2 sentences).",
                "recommendations": ["Action item 1", "Action item 2", "Action item 3"],
                "severity": "Low" or "Medium" or "High"
              }
            ]
          }
          Ensure output is pure JSON. Do not include markdown wraps.`,
          responseMimeType: 'application/json'
        }
      });

      const result = JSON.parse(response.text);
      return result;

    } catch (error) {
      console.error('Error generating predictive insights via Gemini:', error);
      // Fallback
      return {
        summary: 'Unable to parse AI predictive reports due to API response structure. General monitoring of active issues recommended.',
        predictions: []
      };
    }
  }
};
