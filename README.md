# AI-Powered RFP Management System

An intelligent Request for Proposal (RFP) management system that streamlines procurement workflows using AI to create RFPs from natural language, parse vendor responses, and provide intelligent recommendations.

## Table of Contents

- [Project Setup](#project-setup)
- [Tech Stack](#tech-stack)
- [API Documentation](#api-documentation)
- [Decisions & Assumptions](#decisions--assumptions)
- [AI Tools Usage](#ai-tools-usage)

## Project Setup

### Prerequisites

- Node.js v18+ and npm
- PostgreSQL 14+
- **Ollama** (free, local LLM) - Install from https://ollama.ai
- Email account with SMTP/IMAP access (Gmail, Outlook, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI-RFP
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Set up PostgreSQL database**
   ```bash
   createdb rfp_management
   ```

5. **Install and setup Ollama**
   ```bash
   # Install Ollama from https://ollama.ai
   # Then pull a model (llama3.2 is recommended)
   ollama pull llama3.2
   ```

6. **Configure environment variables**
   ```bash
   cp backend/env.example backend/.env
   # Edit backend/.env with your configuration
   ```

7. **Run database migrations**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

### Configuration

#### Email Setup

The system supports SMTP for sending emails and IMAP for receiving emails. Configure these in `backend/.env`:

- **Gmail**: Use App Password (not regular password)
- **Outlook**: Use App Password
- **Custom SMTP**: Configure with your provider's settings

#### Running Locally

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   Server runs on http://localhost:3001

2. **Start the frontend development server**
   ```bash
   cd frontend
   npm start
   ```
   Frontend runs on http://localhost:3000

3. **Start email polling service** (in a separate terminal)
   ```bash
   cd backend
   npm run email:poll
   ```

### Seed Data

To populate initial vendor data:
```bash
cd backend
npm run seed
```

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Query** - Data fetching and caching

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM and database toolkit
- **PostgreSQL** - Database
- **Ollama** - Free, local LLM for AI features
- **Nodemailer** - Email sending
- **IMAP** - Email receiving
- **Zod** - Schema validation

### AI Integration
- **Ollama** (Free, Local LLM) - Primary LLM for:
  - Natural language to structured RFP conversion
  - Vendor response parsing
  - Proposal comparison and recommendations
- **Recommended Models**: llama3.2, mistral, llama3, qwen2.5

## API Documentation

### Base URL
```
http://localhost:3001/api
```

### Endpoints

#### RFPs

**GET /rfps**
- Get all RFPs
- Response: `{ rfps: RFP[] }`

**GET /rfps/:id**
- Get RFP by ID
- Response: `{ rfp: RFP }`

**POST /rfps**
- Create RFP from natural language
- Body: `{ description: string }`
- Response: `{ rfp: RFP }`

**PUT /rfps/:id**
- Update RFP
- Body: `{ ...rfpFields }`
- Response: `{ rfp: RFP }`

**DELETE /rfps/:id**
- Delete RFP
- Response: `{ success: true }`

#### Vendors

**GET /vendors**
- Get all vendors
- Response: `{ vendors: Vendor[] }`

**POST /vendors**
- Create vendor
- Body: `{ name: string, email: string, company?: string }`
- Response: `{ vendor: Vendor }`

**PUT /vendors/:id**
- Update vendor
- Body: `{ ...vendorFields }`
- Response: `{ vendor: Vendor }`

**DELETE /vendors/:id**
- Delete vendor
- Response: `{ success: true }`

#### Proposals

**GET /rfps/:rfpId/proposals**
- Get all proposals for an RFP
- Response: `{ proposals: Proposal[] }`

**GET /rfps/:rfpId/comparison**
- Get AI-powered comparison of proposals
- Response: `{ comparison: ComparisonResult }`

#### Email

**POST /rfps/:rfpId/send**
- Send RFP to selected vendors
- Body: `{ vendorIds: number[] }`
- Response: `{ success: true, sentTo: string[] }`

**POST /email/webhook**
- Webhook endpoint for incoming emails (configured with email service)
- Body: Email payload
- Response: `{ success: true }`

### Example Responses

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Decisions & Assumptions

### Data Model

**RFP Structure:**
- Natural language description is converted to structured fields:
  - Title, description, budget, deadline, requirements (items with specs)
  - Payment terms, warranty requirements, delivery terms
  - Status (draft, sent, closed)

**Vendor Model:**
- Simple vendor master with name, email, company
- Can be extended with contact details, categories, etc.

**Proposal Model:**
- Links vendor to RFP
- Stores parsed data: pricing breakdown, terms, conditions
- Includes raw email content and attachments metadata
- Has AI-generated summary and score

### AI Integration

**RFP Creation:**
- Uses Ollama (free, local LLM) to extract structured data from natural language
- Validates extracted data and prompts for clarification if needed
- Stores both original description and structured representation
- Model can be configured via `OLLAMA_MODEL` environment variable (default: llama3.2)

**Response Parsing:**
- Processes email body and attachments (PDFs, Word docs)
- Extracts: line items, prices, terms, conditions, delivery dates
- Handles unstructured formats (tables, bullet points, free text)
- Stores confidence scores for extracted fields

**Comparison & Recommendations:**
- Multi-factor scoring: price, terms, completeness, compliance
- AI generates narrative comparison highlighting strengths/weaknesses
- Recommends top vendor with reasoning

### Email Handling

**Sending:**
- Formats RFP as HTML email with structured sections
- Includes RFP ID in subject for tracking
- Uses reply-to address for vendor responses

**Receiving:**
- Polls IMAP inbox periodically (configurable interval)
- Filters emails by subject pattern or reply-to address
- Processes attachments (PDF, DOCX) with text extraction
- Associates responses with RFPs via email threading

### Assumptions

1. **Single-user system**: No authentication required
2. **Email format**: Vendors reply to RFP emails (threading)
3. **Attachment support**: PDF and DOCX formats
4. **Response timing**: Vendors respond within email thread
5. **Data quality**: AI parsing may require manual verification
6. **Email service**: Uses standard SMTP/IMAP (no proprietary APIs)

## AI Tools Usage

### Tools Used During Development
- **Cursor AI** - Primary development assistant for this entire project
- **OpenAI GPT-4 Turbo** - Runtime AI processing for RFP extraction, proposal parsing, and comparison

### What AI Helped With

1. **Boilerplate Generation**
   - Express server setup and routing structure
   - React component scaffolding with TypeScript
   - Database schema design with Prisma
   - Package.json configurations and dependencies

2. **Design Decisions**
   - RFP data model structure and relationships
   - AI prompt engineering for extraction tasks
   - Comparison algorithm design and scoring methodology
   - Email parsing strategy and attachment handling

3. **Code Implementation**
   - Complete email parsing logic with IMAP integration
   - PDF/DOCX text extraction implementation
   - AI prompt templates for structured extraction
   - Frontend React components and routing
   - API endpoint design and error handling

4. **Debugging & Refinement**
   - Error handling patterns across the stack
   - TypeScript type definitions and interfaces
   - API response formatting consistency
   - Route path corrections and API structure

### Notable Prompts/Approaches

**RFP Extraction Prompt:**
- Uses structured JSON output with Zod validation
- Includes concrete examples for better extraction
- Handles ambiguous requirements gracefully
- Extracts dates, budgets, and structured requirements

**Response Parsing Prompt:**
- Multi-format handling: tables, lists, free-form text
- Processes email body and attachments together
- Extracts line items, pricing, terms, and conditions
- Provides confidence indicators for extracted values

**Comparison Prompt:**
- Multi-factor scoring: price, terms, completeness, compliance
- Generates narrative explanations for recommendations
- Provides actionable insights beyond simple price comparison
- Considers RFP requirements when evaluating proposals

### Learnings & Changes

1. **Structured Output**: Using JSON schema with response_format in OpenAI API significantly improves extraction reliability and reduces parsing errors

2. **Error Handling**: AI parsing requires robust fallback mechanisms - implemented completeness scoring and manual verification paths

3. **User Experience**: Important to show AI confidence scores and allow users to see both raw and parsed data for transparency

4. **Prompt Engineering**: Iterative refinement of prompts with examples dramatically improves extraction accuracy - the current prompts went through several iterations

5. **Email Threading**: Using RFP ID in email subject enables reliable association of vendor responses with RFPs, even with complex email threading

6. **Attachment Processing**: Supporting multiple formats (PDF, DOCX) required careful handling of different parsing libraries and error cases

