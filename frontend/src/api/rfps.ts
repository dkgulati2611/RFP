import client from './client';

export interface RFP {
  id: number;
  title: string;
  description: string;
  budget: number | null;
  deadline: string | null;
  status: string;
  requirements: any;
  paymentTerms: string | null;
  warrantyReq: string | null;
  deliveryTerms: string | null;
  createdAt: string;
  updatedAt: string;
  proposals?: Proposal[];
}

export interface Proposal {
  id: number;
  rfpId: number;
  vendorId: number;
  vendor?: Vendor;
  totalPrice: number | null;
  currency: string | null;
  deliveryDate: string | null;
  paymentTerms: string | null;
  warranty: string | null;
  lineItems: any;
  terms: any;
  aiSummary: string | null;
  aiScore: number | null;
  completeness: number | null;
  createdAt: string;
}

export interface Vendor {
  id: number;
  name: string;
  email: string;
  company: string | null;
}

export interface ComparisonResult {
  scores: Array<{
    vendorId: number;
    vendorName: string;
    totalScore: number;
    priceScore: number;
    termsScore: number;
    completenessScore: number;
    complianceScore: number;
  }>;
  recommendation: {
    vendorId: number;
    vendorName: string;
    reasoning: string;
  };
  summary: string;
  detailedComparison: string;
}

export const rfpsApi = {
  getAll: async (): Promise<RFP[]> => {
    const response = await client.get('/rfps');
    return response.data.rfps;
  },

  getById: async (id: number): Promise<RFP> => {
    const response = await client.get(`/rfps/${id}`);
    return response.data.rfp;
  },

  create: async (description: string): Promise<RFP> => {
    const response = await client.post('/rfps', { description });
    return response.data.rfp;
  },

  update: async (id: number, data: Partial<RFP>): Promise<RFP> => {
    const response = await client.put(`/rfps/${id}`, data);
    return response.data.rfp;
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/rfps/${id}`);
  },

  sendToVendors: async (rfpId: number, vendorIds: number[]): Promise<string[]> => {
    const response = await client.post(`/email/rfps/${rfpId}/send`, { vendorIds });
    return response.data.sentTo;
  },

  getComparison: async (rfpId: number): Promise<ComparisonResult> => {
    const response = await client.get(`/rfps/${rfpId}/comparison`);
    return response.data.comparison;
  },
};

