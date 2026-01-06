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
    const forceRefresh = req.query.refresh === 'true'; // Allow forcing refresh

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

    // Check if we have a cached comparison and if it's still valid
    // Cache is valid if:
    // 1. It exists
    // 2. No new proposals were added since last comparison
    // 3. User hasn't requested a refresh
    const proposalCount = proposals.length;
    const cachedComparison = rfp.aiComparisonResult as any;
    const lastComparisonTime = rfp.aiComparisonUpdatedAt;
    
    // Check if cache is valid (compare proposal count and check if refresh is forced)
    const hasNewProposals = lastComparisonTime 
      ? proposals.some(p => p.updatedAt > lastComparisonTime)
      : true;

    if (!forceRefresh && cachedComparison && !hasNewProposals && cachedComparison.scores?.length === proposalCount) {
      console.log(`Using cached AI comparison for RFP ${rfpId}`);
      return res.json({ success: true, comparison: cachedComparison, cached: true });
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
    console.log(`Generating new AI comparison for RFP ${rfpId}`);
    const comparison = await aiService.compareProposals(rfp, proposalsData);

    // Cache the comparison result in the RFP
    await prisma.rFP.update({
      where: { id: rfpId },
      data: {
        aiComparisonResult: comparison as any,
        aiComparisonUpdatedAt: new Date(),
      },
    });

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

    res.json({ success: true, comparison, cached: false });
  } catch (error) {
    console.error('Error comparing proposals:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compare proposals',
    });
  }
});

export default router;

