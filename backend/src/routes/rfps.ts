import express from 'express';
import { PrismaClient } from '@prisma/client';
import { aiService } from '../services/aiService';

const router = express.Router();
const prisma = new PrismaClient();

// Get all RFPs
router.get('/', async (req, res) => {
  try {
    const rfps = await prisma.rFP.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        proposals: {
          include: {
            vendor: true,
          },
        },
      },
    });
    res.json({ success: true, rfps });
  } catch (error) {
    console.error('Error fetching RFPs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch RFPs' });
  }
});

// Get RFP by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rfp = await prisma.rFP.findUnique({
      where: { id },
      include: {
        proposals: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!rfp) {
      return res.status(404).json({ success: false, error: 'RFP not found' });
    }

    res.json({ success: true, rfp });
  } catch (error) {
    console.error('Error fetching RFP:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch RFP' });
  }
});

// Create RFP from natural language
router.post('/', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ success: false, error: 'Description is required' });
    }

    // Use AI to extract structured RFP data
    const extracted = await aiService.extractRFP(description);

    // Convert deadline string to Date if provided
    const deadline = extracted.deadline ? new Date(extracted.deadline) : null;

    // Create RFP in database
    const rfp = await prisma.rFP.create({
      data: {
        title: extracted.title,
        description: extracted.description,
        budget: extracted.budget || null,
        deadline: deadline,
        requirements: extracted.requirements as any,
        paymentTerms: extracted.paymentTerms || null,
        warrantyReq: extracted.warrantyReq || null,
        deliveryTerms: extracted.deliveryTerms || null,
        status: 'draft',
      },
    });

    res.json({ success: true, rfp });
  } catch (error) {
    console.error('Error creating RFP:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create RFP',
    });
  }
});

// Update RFP
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      title,
      description,
      budget,
      deadline,
      requirements,
      paymentTerms,
      warrantyReq,
      deliveryTerms,
      status,
    } = req.body;

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (budget !== undefined) updateData.budget = budget;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (paymentTerms !== undefined) updateData.paymentTerms = paymentTerms;
    if (warrantyReq !== undefined) updateData.warrantyReq = warrantyReq;
    if (deliveryTerms !== undefined) updateData.deliveryTerms = deliveryTerms;
    if (status !== undefined) updateData.status = status;

    const rfp = await prisma.rFP.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, rfp });
  } catch (error) {
    console.error('Error updating RFP:', error);
    res.status(500).json({ success: false, error: 'Failed to update RFP' });
  }
});

// Delete RFP
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.rFP.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting RFP:', error);
    res.status(500).json({ success: false, error: 'Failed to delete RFP' });
  }
});

export default router;

