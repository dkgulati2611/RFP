import client from './client';

export interface Vendor {
  id: number;
  name: string;
  email: string;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

export const vendorsApi = {
  getAll: async (): Promise<Vendor[]> => {
    const response = await client.get('/vendors');
    return response.data.vendors;
  },

  getById: async (id: number): Promise<Vendor> => {
    const response = await client.get(`/vendors/${id}`);
    return response.data.vendor;
  },

  create: async (data: { name: string; email: string; company?: string }): Promise<Vendor> => {
    const response = await client.post('/vendors', data);
    return response.data.vendor;
  },

  update: async (id: number, data: Partial<Vendor>): Promise<Vendor> => {
    const response = await client.put(`/vendors/${id}`, data);
    return response.data.vendor;
  },

  delete: async (id: number): Promise<void> => {
    await client.delete(`/vendors/${id}`);
  },
};

