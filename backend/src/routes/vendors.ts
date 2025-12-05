import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all vendors
router.get('/', async (req, res) => {
  try {
    const vendors = await prisma.vendor.findMany({
      orderBy: { name: 'asc' },
      include: {
        proposals: {
          include: {
            rfp: true,
          },
        },
      },
    });
    res.json({ success: true, vendors });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vendors' });
  }
});

// Get vendor by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        proposals: {
          include: {
            rfp: true,
          },
        },
      },
    });

    if (!vendor) {
      return res.status(404).json({ success: false, error: 'Vendor not found' });
    }

    res.json({ success: true, vendor });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch vendor' });
  }
});

// Create vendor
router.post('/', async (req, res) => {
  try {
    const { name, email, company } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, error: 'Name and email are required' });
    }

    const vendor = await prisma.vendor.create({
      data: {
        name,
        email,
        company: company || null,
      },
    });

    res.json({ success: true, vendor });
  } catch (error: any) {
    console.error('Error creating vendor:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Vendor with this email already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to create vendor' });
  }
});

// Update vendor
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, company } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (company !== undefined) updateData.company = company;

    const vendor = await prisma.vendor.update({
      where: { id },
      data: updateData,
    });

    res.json({ success: true, vendor });
  } catch (error: any) {
    console.error('Error updating vendor:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'Vendor with this email already exists' });
    }
    res.status(500).json({ success: false, error: 'Failed to update vendor' });
  }
});

// Delete vendor
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.vendor.delete({
      where: { id },
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({ success: false, error: 'Failed to delete vendor' });
  }
});

export default router;

