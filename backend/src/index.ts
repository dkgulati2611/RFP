import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rfpRoutes from './routes/rfps';
import vendorRoutes from './routes/vendors';
import proposalRoutes from './routes/proposals';
import emailRoutes from './routes/email';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/rfps', rfpRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/rfps', proposalRoutes); // Proposals routes are nested under RFPs
app.use('/api/email', emailRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

