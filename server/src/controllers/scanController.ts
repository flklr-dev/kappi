import { Request, Response } from 'express';
import { Scan } from '../models/Scan';
import { IUser } from '../models/User';
import path from 'path';

interface AuthRequest extends Request {
  user?: IUser;
}

export const saveScan = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    let { disease, confidence, severity, stage, imageUri, coordinates, address } = req.body as any;

    // Parse JSON fields if they came as strings from multipart
    if (typeof coordinates === 'string') {
      try { coordinates = JSON.parse(coordinates); } catch {}
    }
    if (typeof address === 'string') {
      try { address = JSON.parse(address); } catch {}
    }

    // If multer uploaded a file, set imageUri to served path
    if ((req as any).file) {
      const fileName = path.basename((req as any).file.path);
      imageUri = `/uploads/${fileName}`;
    }

    const numericConfidence = typeof confidence === 'string' ? parseFloat(confidence) : confidence;
    const scan = new Scan({
      user: req.user._id,
      disease,
      confidence: numericConfidence,
      severity,
      stage,
      imageUri,
      coordinates,
      address
    });
    await scan.save();
    res.status(201).json({ scan });
  } catch (error) {
    console.error('Error saving scan:', error);
    res.status(500).json({ message: 'Error saving scan result' });
  }
};

export const getUserScans = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { disease, stage } = req.query; // Get filter parameters from query
    const filter: any = { user: req.user._id };

    if (disease && typeof disease === 'string') {
      filter.disease = new RegExp(disease, 'i'); // Case-insensitive search
    }
    if (stage && typeof stage === 'string') {
      filter.stage = stage; // Exact match for stage
    }

    const scans = await Scan.find(filter).sort({ createdAt: -1 });
    res.json({ scans });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching scan results' });
  }
};

export const getScanStatistics = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Get all user scans
    const scans = await Scan.find({ user: req.user._id });

    // Calculate total scans
    const totalScans = scans.length;

    // Calculate this month scans
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthScans = scans.filter(scan => scan.createdAt >= startOfMonth).length;

    // Calculate last month scans for comparison
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthScans = scans.filter(scan => 
      scan.createdAt >= startOfLastMonth && scan.createdAt <= endOfLastMonth
    ).length;

    // Calculate percentage change
    let thisMonthChange = 0;
    if (lastMonthScans > 0) {
      thisMonthChange = Math.round(((thisMonthScans - lastMonthScans) / lastMonthScans) * 100);
    } else if (thisMonthScans > 0) {
      thisMonthChange = 100; // 100% increase if last month had 0 scans
    }

    // Calculate healthy vs diseased percentages
    const healthyScans = scans.filter(scan => 
      scan.severity === 'healthy' || scan.stage === 'Healthy'
    ).length;

    const diseasedScans = scans.length - healthyScans;

    const healthyPercentage = totalScans > 0 ? Math.round((healthyScans / totalScans) * 100) : 0;
    const diseasedPercentage = totalScans > 0 ? Math.round((diseasedScans / totalScans) * 100) : 0;

    // Get disease distribution
    const diseaseCounts: Record<string, number> = {};
    scans.forEach(scan => {
      const key = scan.severity === 'healthy' || scan.stage === 'Healthy' ? 'Healthy' : scan.disease;
      diseaseCounts[key] = (diseaseCounts[key] || 0) + 1;
    });

    const diseaseDistribution = Object.entries(diseaseCounts).map(([disease, count]) => ({
      disease,
      count,
      percentage: totalScans > 0 ? Math.round((count / totalScans) * 100) : 0
    }));

    // Get weekly scan activity (last 8 weeks)
    const weeklyActivity = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7 + 6)); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      weekEnd.setHours(23, 59, 59, 999);
      
      const count = scans.filter(scan => 
        scan.createdAt >= weekStart && scan.createdAt <= weekEnd
      ).length;
      
      weeklyActivity.push({
        week: `Wk ${8 - i}`,
        startDate: weekStart,
        endDate: weekEnd,
        count
      });
    }

    res.json({
      summary: {
        totalScans,
        thisMonthScans,
        thisMonthChange,
        healthyPercentage,
        diseasedPercentage
      },
      diseaseDistribution,
      weeklyActivity: weeklyActivity.map(item => ({
        week: item.week,
        count: item.count
      }))
    });
  } catch (error) {
    console.error('Error fetching scan statistics:', error);
    res.status(500).json({ message: 'Error fetching scan statistics' });
  }
};