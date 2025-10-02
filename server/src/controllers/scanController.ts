import { Request, Response } from 'express';
import { Scan } from '../models/Scan';
import { IUser } from '../models/User';

interface AuthRequest extends Request {
  user?: IUser;
}

export const saveScan = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const { disease, confidence, severity, stage, imageUri, coordinates, address } = req.body;
    const scan = new Scan({
      user: req.user._id,
      disease,
      confidence,
      severity,
      stage,
      imageUri,
      coordinates,
      address
    });
    await scan.save();
    res.status(201).json({ scan });
  } catch (error) {
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