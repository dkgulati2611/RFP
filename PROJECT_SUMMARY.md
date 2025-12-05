# Project Summary

## Overview

This is a complete AI-powered RFP (Request for Proposal) management system that streamlines the procurement workflow from creation to vendor comparison. The system uses OpenAI GPT-4 to extract structured data from natural language, parse vendor responses, and provide intelligent recommendations.

## Architecture

### Backend (`/backend`)
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4 Turbo API
- **Email**: Nodemailer (SMTP) and IMAP for receiving
- **File Parsing**: pdf-parse, mammoth (for PDF and DOCX)

### Frontend (`/frontend`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router

## Key Features Implemented

### 1. RFP Creation from Natural Language ✅
- Users describe procurement needs in plain English
- AI extracts structured data (title, budget, deadline, requirements, terms)
- Stores both original description and structured representation

### 2. Vendor Management ✅
- CRUD operations for vendors
- Store vendor contact information
- Select vendors for RFP distribution

### 3. Email Sending ✅
- Send RFPs to selected vendors via SMTP
- HTML-formatted emails with structured RFP details
- RFP ID embedded in subject for tracking
- Reply-to address configured for responses

### 4. Email Receiving & Parsing ✅
- IMAP polling service for incoming emails
- Automatic detection of vendor responses
- Extracts text from PDF and DOCX attachments
- AI parses unstructured responses into structured proposal data
- Calculates completeness scores

### 5. Proposal Comparison & Recommendations ✅
- Multi-factor scoring (price, terms, completeness, compliance)
- AI-generated comparison summaries
- Vendor recommendations with reasoning
- Visual score displays

## Database Schema

### Tables
1. **vendors** - Vendor master data
2. **rfps** - RFP records with structured requirements
3. **proposals** - Vendor proposals linked to RFPs

### Key Relationships
- One RFP → Many Proposals
- One Vendor → Many Proposals
- Proposal links RFP and Vendor (unique constraint)

## API Endpoints

### RFPs
- `GET /api/rfps` - List all RFPs
- `GET /api/rfps/:id` - Get RFP details
- `POST /api/rfps` - Create RFP from natural language
- `PUT /api/rfps/:id` - Update RFP
- `DELETE /api/rfps/:id` - Delete RFP

### Vendors
- `GET /api/vendors` - List all vendors
- `POST /api/vendors` - Create vendor
- `PUT /api/vendors/:id` - Update vendor
- `DELETE /api/vendors/:id` - Delete vendor

### Proposals & Comparison
- `GET /api/rfps/:rfpId/comparison` - Get AI comparison

### Email
- `POST /api/email/rfps/:rfpId/send` - Send RFP to vendors
- `GET /api/email/verify` - Verify email connection

## AI Integration Points

1. **RFP Extraction** (`aiService.extractRFP`)
   - Input: Natural language description
   - Output: Structured RFP data (JSON)
   - Model: GPT-4 Turbo with JSON response format

2. **Proposal Parsing** (`aiService.parseProposalResponse`)
   - Input: Email body + attachments + RFP requirements
   - Output: Structured proposal data
   - Handles: Tables, lists, free-form text, multiple formats

3. **Comparison** (`aiService.compareProposals`)
   - Input: RFP + Multiple proposals
   - Output: Scores, recommendations, detailed comparison
   - Considers: Price, terms, completeness, compliance

## File Structure

```
AI-RFP/
├── backend/
│   ├── src/
│   │   ├── index.ts              # Express server entry
│   │   ├── routes/               # API route handlers
│   │   ├── services/             # Business logic
│   │   │   ├── aiService.ts      # OpenAI integration
│   │   │   ├── emailService.ts   # Email sending
│   │   │   └── emailParserService.ts # Email receiving/parsing
│   │   └── scripts/              # Utility scripts
│   ├── prisma/
│   │   └── schema.prisma         # Database schema
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/                # React page components
│   │   ├── api/                  # API client functions
│   │   └── App.tsx               # Main app component
│   └── package.json
├── README.md                      # Main documentation
├── SETUP.md                       # Setup instructions
└── .gitignore
```

## Environment Variables Required

See `backend/env.example` for complete list. Key variables:
- `DATABASE_URL` - PostgreSQL connection string
- `SMTP_*` - Email sending configuration
- `IMAP_*` - Email receiving configuration

## Running the Application

1. **Setup**: Follow `SETUP.md` for detailed instructions
2. **Backend**: `cd backend && npm run dev`
3. **Frontend**: `cd frontend && npm run dev`
4. **Email Polling**: `cd backend && npm run email:poll` (separate terminal)

## Testing Workflow

1. Add vendors via Vendors page
2. Create RFP using natural language
3. Send RFP to selected vendors
4. Vendors reply via email (or simulate)
5. Email polling processes responses
6. View parsed proposals on RFP detail page
7. Compare proposals with AI recommendations

## Design Decisions

1. **Single-user system**: No authentication (as per requirements)
2. **Email threading**: RFP ID in subject enables response association
3. **Structured storage**: Both raw and parsed data stored for transparency
4. **AI confidence**: Completeness scores help users assess proposal quality
5. **Multi-format support**: Handles various vendor response formats

## Future Enhancements (Out of Scope)

- User authentication and multi-tenancy
- Real-time email notifications
- Email tracking (opens, clicks)
- RFP versioning and approvals
- Advanced filtering and search
- Export functionality (PDF, Excel)

## Notes

- Email polling runs as a separate process (can be run as a service)
- AI parsing may require manual verification for complex responses
- Gmail requires App Password (not regular password)
- Database migrations handled by Prisma
- All code is TypeScript for type safety

