import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Ollama API configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

// Schema for RFP extraction
const RFPExtractionSchema = z.object({
  title: z.string(),
  description: z.string(),
  budget: z.number().nullable().optional(),
  deadline: z.string().nullable().optional(),
  requirements: z.array(z.object({
    item: z.string(),
    quantity: z.number().optional(),
    specifications: z.record(z.any()).optional(),
  })),
  paymentTerms: z.string().nullable().optional(),
  warrantyReq: z.string().nullable().optional(),
  deliveryTerms: z.string().nullable().optional(),
});

export type RFPExtraction = z.infer<typeof RFPExtractionSchema>;

// Schema for proposal extraction
const ProposalExtractionSchema = z.object({
  totalPrice: z.number().nullable().optional(),
  currency: z.string().optional(),
  deliveryDate: z.string().nullable().optional(),
  paymentTerms: z.string().nullable().optional(),
  warranty: z.string().nullable().optional(),
  lineItems: z.array(z.object({
    item: z.string(),
    quantity: z.number().optional(),
    unitPrice: z.number().optional(),
    totalPrice: z.number().optional(),
    specifications: z.record(z.any()).optional(),
  })).optional(),
  terms: z.record(z.any()).optional(),
  summary: z.string().optional(),
});

export type ProposalExtraction = z.infer<typeof ProposalExtractionSchema>;

// Schema for comparison result
const ComparisonResultSchema = z.object({
  scores: z.array(z.object({
    vendorId: z.number(),
    vendorName: z.string(),
    totalScore: z.number(),
    priceScore: z.number(),
    termsScore: z.number(),
    completenessScore: z.number(),
    complianceScore: z.number(),
  })),
  recommendation: z.object({
    vendorId: z.number(),
    vendorName: z.string(),
    reasoning: z.string(),
  }),
  summary: z.string(),
  detailedComparison: z.string(),
});

export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

export class AIService {
  /**
   * Calculate deadline date by adding days to current date
   */
  private calculateDeadline(baseDate: string, days: number): string {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Extract number of days from text (e.g., "within 30 days" -> 30)
   */
  private extractDays(text: string): number | null {
    const patterns = [
      /within\s+(\d+)\s+days?/i,
      /in\s+(\d+)\s+days?/i,
      /(\d+)\s+days?\s+(?:from|after)/i,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    return null;
  }

  /**
   * Call Ollama API for chat completion
   */
  private async callOllama(prompt: string, systemPrompt: string): Promise<string> {
    try {
      const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: false,
          format: 'json', // Request JSON format
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as any;
      return data.message?.content || data.response || '';
    } catch (error: any) {
      console.error('Ollama API call failed:', error);
      if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
        throw new Error(
          'Cannot connect to Ollama. Make sure Ollama is running on ' + OLLAMA_BASE_URL + '. ' +
          'Install from https://ollama.ai and run: ollama pull ' + OLLAMA_MODEL
        );
      }
      throw error;
    }
  }

  /**
   * Extract JSON from response (handles cases where JSON is wrapped in markdown code blocks)
   */
  private extractJSON(content: string): any {
    // Try to parse directly
    try {
      return JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1]);
        } catch {
          // Fall through to error
        }
      }
      // Try to find JSON object in the text
      const jsonObjectMatch = content.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        try {
          return JSON.parse(jsonObjectMatch[0]);
        } catch {
          // Fall through to error
        }
      }
      throw new Error('Could not extract valid JSON from response');
    }
  }

  /**
   * Extract structured RFP data from natural language description
   */
  async extractRFP(description: string): Promise<RFPExtraction> {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const exampleDeadline = this.calculateDeadline(currentDate, 30);
    
    const prompt = `You are an expert procurement analyst. Your task is to carefully analyze the procurement request and extract structured information.

THINK STEP BY STEP:
1. Read the entire request carefully
2. Identify all mentioned items, quantities, and specifications
3. Extract budget information (convert to number, remove currency symbols)
4. For deadline: If user says "within X days" or "in X days", calculate: current date + X days
5. Extract payment terms, warranty, and delivery requirements
6. Structure everything into the required JSON format

IMPORTANT DEADLINE CALCULATION:
- Current date is: ${currentDate}
- If user says "within 30 days" → deadline = ${exampleDeadline} (current date + 30 days)
- If user says "in 45 days" → calculate: ${currentDate} + 45 days
- If user provides a specific date → use that exact date
- If no deadline mentioned → use null

User Request:
${description}

Extract the following information with precision:
- title: A clear, concise title summarizing the procurement
- description: The full description/requirements from the request
- budget: Total budget amount as a NUMBER (remove $, commas, currency symbols). If not specified, use null
- deadline: Calculate the actual deadline date in ISO format (YYYY-MM-DD):
  * If "within X days" or "in X days" is mentioned, add X days to current date (${currentDate})
  * If a specific date is given, use that date
  * If no deadline mentioned, use null
- requirements: Array of items/services with:
  * item: Name of the item/service
  * quantity: Number (if mentioned)
  * specifications: Object with key-value pairs of specs (e.g., {"RAM": "16GB", "size": "27-inch"})
- paymentTerms: Payment terms exactly as mentioned (e.g., "net 30", "50% upfront")
- warrantyReq: Warranty requirements as stated
- deliveryTerms: Delivery timeline/requirements as mentioned

Return ONLY valid JSON (no markdown, no explanations, just the JSON object):
{
  "title": "string",
  "description": "string",
  "budget": number | null,
  "deadline": "YYYY-MM-DD" | null,
  "requirements": [
    {
      "item": "string",
      "quantity": number (optional),
      "specifications": {} (optional)
    }
  ],
  "paymentTerms": "string" | null,
  "warrantyReq": "string" | null,
  "deliveryTerms": "string" | null
}

Example:
Input: "I need to procure laptops and monitors for our new office. Budget is $50,000 total. Need delivery within 30 days. We need 20 laptops with 16GB RAM and 15 monitors 27-inch. Payment terms should be net 30, and we need at least 1 year warranty."

Thinking:
- Current date: ${currentDate}
- "within 30 days" means deadline = ${exampleDeadline} (${currentDate} + 30 days)
- Budget: $50,000 → 50000
- Items: 20 laptops (RAM: 16GB), 15 monitors (size: 27-inch)
- Payment: net 30
- Warranty: at least 1 year
- Delivery: within 30 days

Output:
{
  "title": "Office Equipment Procurement - Laptops and Monitors",
  "description": "Procure laptops and monitors for new office setup",
  "budget": 50000,
  "deadline": "${exampleDeadline}",
  "requirements": [
    {
      "item": "Laptops",
      "quantity": 20,
      "specifications": {"RAM": "16GB"}
    },
    {
      "item": "Monitors",
      "quantity": 15,
      "specifications": {"size": "27-inch"}
    }
  ],
  "paymentTerms": "net 30",
  "warrantyReq": "at least 1 year",
  "deliveryTerms": "within 30 days"
}`;

    try {
      const content = await this.callOllama(
        prompt,
        'You are a precise data extraction assistant. Think step by step, then return ONLY valid JSON. Do not include any explanations, markdown formatting, or additional text outside the JSON object.'
      );

      const parsed = this.extractJSON(content);
      const extracted = RFPExtractionSchema.parse(parsed);
      
      // Post-process deadline: if it's a relative date in deliveryTerms, calculate it
      if (!extracted.deadline && extracted.deliveryTerms) {
        const days = this.extractDays(extracted.deliveryTerms);
        if (days !== null) {
          const currentDate = new Date().toISOString().split('T')[0];
          extracted.deadline = this.calculateDeadline(currentDate, days);
        }
      }
      
      // Also ensure deadline is calculated if deliveryTerms has relative days
      if (extracted.deadline && extracted.deliveryTerms) {
        const days = this.extractDays(extracted.deliveryTerms);
        if (days !== null) {
          // Verify the deadline matches the calculated one, if not, recalculate
          const currentDate = new Date().toISOString().split('T')[0];
          const calculatedDeadline = this.calculateDeadline(currentDate, days);
          // If AI provided a deadline but it doesn't match relative days, trust the calculation
          if (extracted.deadline !== calculatedDeadline) {
            extracted.deadline = calculatedDeadline;
          }
        }
      }
      
      return extracted;
    } catch (error: any) {
      console.error('Error extracting RFP:', error);
      throw new Error(`Failed to extract RFP: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse vendor response email and extract proposal data
   */
  async parseProposalResponse(
    emailBody: string,
    attachments?: Array<{ filename: string; content: string }>,
    rfpRequirements?: any
  ): Promise<ProposalExtraction> {
    let contentToAnalyze = `Email Body:\n${emailBody}\n\n`;

    if (attachments && attachments.length > 0) {
      contentToAnalyze += `Attachments:\n`;
      attachments.forEach((att, idx) => {
        contentToAnalyze += `\n--- Attachment ${idx + 1}: ${att.filename} ---\n${att.content}\n`;
      });
    }

    const prompt = `You are an expert at extracting proposal information from vendor responses.

THINK STEP BY STEP:
1. Read through the entire vendor response carefully
2. Identify pricing information (look for totals, line items, unit prices)
3. Extract delivery timeline and convert to ISO date format if relative
4. Identify payment terms, warranty, and other conditions
5. Match line items to RFP requirements if provided
6. Structure all extracted data into the required JSON format

Analyze the following vendor response (email and attachments) and extract all relevant proposal details.

${contentToAnalyze}

${rfpRequirements ? `\nOriginal RFP Requirements:\n${JSON.stringify(rfpRequirements, null, 2)}\n` : ''}

Extract the following information with precision:
- totalPrice: Total quoted price as a NUMBER (remove $, commas, currency symbols). If not found, use null
- currency: Currency code (e.g., "USD", "EUR"). Default to "USD" if not specified
- deliveryDate: Proposed delivery date in ISO format (YYYY-MM-DD):
  * If relative date (e.g., "in 30 days", "within 2 weeks"), calculate from today
  * If specific date mentioned, use that date
  * If not mentioned, use null
- paymentTerms: Payment terms exactly as mentioned (e.g., "net 30", "50% upfront")
- warranty: Warranty information as stated
- lineItems: Array of individual items with prices (if available):
  * Extract item name, quantity, unit price, total price
  * Include specifications if mentioned
- terms: Any additional terms and conditions as an object
- summary: Brief summary of the proposal (2-3 sentences)

Handle various formats:
- Tables: Extract structured data row by row
- Bullet points: Parse each point as a line item or requirement
- Free-form text: Identify key information (prices, dates, terms)
- Multiple currencies: Normalize to one currency (prefer USD)

Return ONLY valid JSON matching this structure:
{
  "totalPrice": number | null,
  "currency": "string" | null,
  "deliveryDate": "YYYY-MM-DD" | null,
  "paymentTerms": "string" | null,
  "warranty": "string" | null,
  "lineItems": [
    {
      "item": "string",
      "quantity": number (optional),
      "unitPrice": number (optional),
      "totalPrice": number (optional),
      "specifications": {} (optional)
    }
  ] | null,
  "terms": {} | null,
  "summary": "string" | null
}`;

    try {
      const content = await this.callOllama(
        prompt,
        'You are a helpful assistant that extracts structured proposal data from vendor responses. Always return valid JSON only, no additional text.'
      );

      const parsed = this.extractJSON(content);
      return ProposalExtractionSchema.parse(parsed);
    } catch (error: any) {
      console.error('Error parsing proposal:', error);
      throw new Error(`Failed to parse proposal: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compare proposals and generate recommendations
   */
  async compareProposals(
    rfp: any,
    proposals: Array<{
      id: number;
      vendor: { id: number; name: string };
      parsedData: any;
      totalPrice: number | null;
      lineItems: any;
      terms: any;
    }>
  ): Promise<ComparisonResult> {
    const proposalsData = proposals.map(p => ({
      vendorId: p.vendor.id,
      vendorName: p.vendor.name,
      proposalId: p.id,
      data: p.parsedData,
      totalPrice: p.totalPrice,
      lineItems: p.lineItems,
      terms: p.terms,
    }));

    const prompt = `You are an expert procurement analyst. Compare the following vendor proposals for an RFP and provide scores and recommendations.

THINK STEP BY STEP:
1. Analyze each proposal against the RFP requirements
2. Compare prices and normalize scores (lower price = higher score)
3. Evaluate payment terms, delivery terms, and warranty
4. Assess how completely each proposal addresses RFP requirements
5. Check compliance with specified terms (warranty, delivery timeline, etc.)
6. Calculate weighted scores for each dimension
7. Determine the best vendor based on overall score and reasoning
8. Provide detailed comparison highlighting strengths and weaknesses

RFP Details:
${JSON.stringify(rfp, null, 2)}

Proposals:
${JSON.stringify(proposalsData, null, 2)}

Evaluate each proposal on multiple dimensions (0-100 scale):
1. Price Score: Lower price = higher score (normalize across all proposals)
   - Find the lowest price, give it 100 points
   - Scale other prices proportionally
2. Terms Score: Favorable payment/delivery terms = higher score
   - Better payment terms (longer net terms) = higher score
   - Faster delivery = higher score (if within RFP deadline)
3. Completeness Score: How well the proposal addresses all RFP requirements
   - All required items present = higher score
   - Specifications match = higher score
4. Compliance Score: Adherence to specified terms (warranty, delivery, etc.)
   - Meets warranty requirements = higher score
   - Meets delivery timeline = higher score
   - Follows payment terms = higher score

Calculate a weighted total score (suggested weights: Price 40%, Terms 20%, Completeness 25%, Compliance 15%).

Provide:
- Individual scores for each vendor (all dimensions + total)
- A recommendation for the best vendor with clear reasoning
- A summary comparison (2-3 sentences)
- Detailed analysis highlighting strengths and weaknesses of each proposal

Return ONLY valid JSON (no markdown, no explanations, just the JSON object) matching this structure:
{
  "scores": [
    {
      "vendorId": number,
      "vendorName": "string",
      "totalScore": number (0-100),
      "priceScore": number (0-100),
      "termsScore": number (0-100),
      "completenessScore": number (0-100),
      "complianceScore": number (0-100)
    }
  ],
  "recommendation": {
    "vendorId": number,
    "vendorName": "string",
    "reasoning": "string"
  },
  "summary": "string",
  "detailedComparison": "string"
}`;

    try {
      const content = await this.callOllama(
        prompt,
        'You are a precise procurement analyst. Think step by step to evaluate and compare proposals accurately. Return ONLY valid JSON, no markdown formatting, no explanations, just the JSON object.'
      );

      const parsed = this.extractJSON(content);
      return ComparisonResultSchema.parse(parsed);
    } catch (error: any) {
      console.error('Error comparing proposals:', error);
      throw new Error(`Failed to compare proposals: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const aiService = new AIService();
