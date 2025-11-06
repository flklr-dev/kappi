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
    
    console.log('Saving scan for user:', req.user._id);
    
    let { disease, confidence, severity, stage, imageUri, coordinates, address } = req.body as any;

    // Parse JSON fields if they came as strings from multipart
    if (typeof coordinates === 'string') {
      try { coordinates = JSON.parse(coordinates); } catch {}
    }
    if (typeof address === 'string') {
      try { address = JSON.parse(address); } catch {}
    }

    // Log received data
    console.log('Received scan data:', { disease, confidence, severity, stage, imageUri, coordinates, address });

    // If multer uploaded a file to Cloudinary, set imageUri to Cloudinary URL
    if ((req as any).file) {
      imageUri = (req as any).file.path; // Cloudinary URL
      console.log('Using Cloudinary URL from uploaded file:', imageUri);
    } else {
      console.log('No file uploaded, using provided imageUri:', imageUri);
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
    
    console.log('Saving scan to database with imageUri:', imageUri);
    await scan.save();
    console.log('Scan saved successfully:', scan._id);
    
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
    // Update filter to handle documents that may not have isDeleted field
    const filter: any = { user: req.user._id, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] };

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

    // Update query to handle documents that may not have isDeleted field
    const scans = await Scan.find({ user: req.user._id, $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] });

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

// Add delete scan endpoint
export const deleteScan = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { id } = req.params;
    
    // Find the scan and verify it belongs to the user
    // Update query to handle documents that may not have isDeleted field
    const scan = await Scan.findOne({ 
      _id: id, 
      user: req.user._id, 
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] 
    });
    
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found or not authorized' });
    }

    // If the scan has an imageUri, try to delete it from Cloudinary
    if (scan.imageUri) {
      try {
        // Extract public ID from Cloudinary URL
        // Cloudinary URLs are in the format: https://res.cloudinary.com/{cloud_name}/{version}/{public_id}.{extension}
        const urlParts = scan.imageUri.split('/');
        const publicIdWithExtension = urlParts[urlParts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        
        // Import Cloudinary SDK
        const { v2: cloudinary } = await import('cloudinary');
        
        // Configure Cloudinary with credentials
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET
        });
        
        // Delete the image from Cloudinary
        await cloudinary.uploader.destroy(publicId);
        console.log(`[CLOUDINARY] Deleted image with public ID: ${publicId}`);
      } catch (cloudinaryError) {
        console.error('[CLOUDINARY] Error deleting image:', cloudinaryError);
        // Don't fail the request if Cloudinary deletion fails
      }
    }

    // Soft delete: Mark the scan as deleted instead of removing it from database
    scan.isDeleted = true;
    scan.deletedAt = new Date();
    await scan.save();

    res.json({ message: 'Scan deleted successfully' });
  } catch (error) {
    console.error('Error deleting scan:', error);
    res.status(500).json({ message: 'Error deleting scan' });
  }
};










