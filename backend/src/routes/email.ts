import express from 'express';
import { emailService } from '../services/emailService';

const router = express.Router();

// Send RFP to vendors
router.post('/rfps/:rfpId/send', async (req, res) => {
  try {
    const rfpId = parseInt(req.params.rfpId);
    const { vendorIds } = req.body;

    if (!vendorIds || !Array.isArray(vendorIds) || vendorIds.length === 0) {
      return res.status(400).json({ success: false, error: 'vendorIds array is required' });
    }

    const sentTo = await emailService.sendRFPToVendors(rfpId, vendorIds);

    res.json({ success: true, sentTo });
  } catch (error) {
    console.error('Error sending RFP:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send RFP',
    });
  }
});

// Verify email connection
router.get('/verify', async (req, res) => {
  try {
    const isValid = await emailService.verifyConnection();
    res.json({ success: true, connected: isValid });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ success: false, error: 'Failed to verify email connection' });
  }
});

export default router;

