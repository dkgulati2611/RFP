import express from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';

const router = express.Router();
const prisma = new PrismaClient();

// Get all proposals for an RFP
router.get('/:rfpId/proposals', async (req, res) => {
  try {
    const rfpId = parseInt(req.params.rfpId);
    const proposals = await prisma.proposal.findMany({
      where: { rfpId },
      include: {
        vendor: true,
        rfp: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, proposals });
  } catch (error) {
    console.error('Error fetching proposals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
});

// Get proposal comparison with AI recommendations
router.get('/:rfpId/comparison', async (req, res) => {
  try {
    const rfpId = parseInt(req.params.rfpId);

    // Get RFP
    const rfp = await prisma.rFP.findUnique({
      where: { id: rfpId },
    });

    if (!rfp) {
      return res.status(404).json({ success: false, error: 'RFP not found' });
    }

    // Get all proposals for this RFP
    const proposals = await prisma.proposal.findMany({
      where: { rfpId },
      include: {
        vendor: true,
      },
    });

    if (proposals.length === 0) {
      return res.status(404).json({ success: false, error: 'No proposals found for this RFP' });
    }

    // Prepare data for AI comparison
    const proposalsData = proposals.map(p => ({
      id: p.id,
      vendor: {
        id: p.vendor.id,
        name: p.vendor.name,
      },
      parsedData: p.parsedData,
      totalPrice: p.totalPrice,
      lineItems: p.lineItems,
      terms: p.terms,
    }));

    // Get AI comparison
    const comparison = await aiService.compareProposals(rfp, proposalsData);

    // Update AI scores in proposals
    for (const score of comparison.scores) {
      await prisma.proposal.updateMany({
        where: {
          rfpId,
          vendorId: score.vendorId,
        },
        data: {
          aiScore: score.totalScore,
        },
      });
    }

    res.json({ success: true, comparison });
  } catch (error) {
    console.error('Error comparing proposals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare proposals',
    });
  }
});

export default router;

