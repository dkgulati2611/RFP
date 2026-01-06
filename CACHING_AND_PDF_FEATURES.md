# AI Response Caching & PDF Attachment Handling

## Overview

This document describes the implementation of two key features:
1. **AI Response Caching** - Store AI comparison results in database to avoid repeated API calls
2. **Enhanced PDF Attachment Handling** - Improved extraction and processing of PDF attachments in vendor emails

---

## 1. AI Response Caching

### Problem
Previously, every time a user requested a proposal comparison, the system would call the AI API again, even if the proposals hadn't changed. This was:
- Slow (AI processing takes time)
- Costly (unnecessary API calls)
- Inefficient (same analysis repeated)

### Solution
Implemented intelligent caching that:
- Stores AI comparison results in the `RFP` table
- Only regenerates comparison when:
  - New proposals are added
  - Existing proposals are updated
  - User explicitly requests a refresh
- Automatically invalidates cache when proposals change

### Implementation Details

#### Database Schema Changes
Added to `RFP` model:
```prisma
aiComparisonResult Json?  // Cached AI comparison result
aiComparisonUpdatedAt DateTime?  // When comparison was last generated
```

#### Caching Logic (`backend/src/routes/proposals.ts`)
```typescript
// Check if cache is valid
const hasNewProposals = lastComparisonTime 
  ? proposals.some(p => p.updatedAt > lastComparisonTime)
  : true;

if (!forceRefresh && cachedComparison && !hasNewProposals && 
    cachedComparison.scores?.length === proposalCount) {
  // Return cached result
  return res.json({ success: true, comparison: cachedComparison, cached: true });
}

// Otherwise, generate new comparison and cache it
```

#### Cache Invalidation
Cache is automatically invalidated when:
- A new proposal is received
- An existing proposal is updated
- User clicks "Refresh" button

### Frontend Features
- Shows "Cached" or "Fresh" badge on comparison
- "Refresh" button to force regeneration
- Automatic cache invalidation on proposal updates

---

## 2. Enhanced PDF Attachment Handling

### Problem
Vendor responses often include PDF attachments with pricing, terms, and specifications. The system needed to:
- Extract text from PDFs reliably
- Handle various PDF formats
- Process multiple attachments
- Include attachment content in AI analysis

### Solution
Enhanced the attachment processing with:
- Better PDF extraction using `pdf-parse`
- Support for multiple file types (PDF, DOCX, TXT, CSV)
- Detailed logging for debugging
- Content validation before processing

### Implementation Details

#### Enhanced Attachment Extraction (`backend/src/services/emailParserService.ts`)

```typescript
private async extractAttachmentContent(attachment: any): Promise<string | null> {
  // Handle PDF files
  if (contentType.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) {
    const pdfData = await pdfParse(buffer);
    return pdfData.text;
  }
  // Handle Word documents
  else if (contentType.includes('word') || filename.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // ... other formats
}
```

#### Features
- **PDF Support**: Extracts text from PDF attachments
- **Word Document Support**: Handles .docx and .doc files
- **Text Files**: Processes .txt files
- **CSV Support**: Basic CSV text extraction
- **Error Handling**: Gracefully handles unsupported formats
- **Logging**: Detailed logs for debugging attachment processing

#### Processing Flow
1. Email received with attachments
2. For each attachment:
   - Identify file type
   - Extract text content
   - Validate content (non-empty)
   - Add to attachment contents array
3. Pass all attachments to AI for analysis
4. AI analyzes email body + all attachments together

### Caching for Parsed Proposals

Additionally, implemented caching for proposal parsing:
- Checks if proposal content has changed (using content hash)
- Reuses parsed data if content is identical
- Only calls AI if content is new or changed

```typescript
// Generate content hash
const currentContentHash = this.hashContent(
  currentContent + JSON.stringify(attachmentContents)
);

// Check if we already parsed this exact content
if (existingProposal?.parsedData && currentContentHash === existingContentHash) {
  // Reuse cached parsed data
  parsedData = existingProposal.parsedData;
} else {
  // Parse with AI
  parsedData = await aiService.parseProposalResponse(...);
}
```

---

## Migration

To apply the database changes, run:

```bash
cd backend
npx prisma migrate dev
```

Or manually apply the migration:
```sql
ALTER TABLE "rfps" 
ADD COLUMN "aiComparisonResult" JSONB,
ADD COLUMN "aiComparisonUpdatedAt" TIMESTAMP(3);
```

---

## Benefits

### Performance
- **Faster Response Times**: Cached comparisons return instantly
- **Reduced API Calls**: Only calls AI when necessary
- **Better UX**: Users see results immediately

### Cost Savings
- **Fewer AI API Calls**: Significant reduction in API usage
- **Efficient Resource Usage**: Only processes when needed

### Reliability
- **Better PDF Handling**: More reliable attachment processing
- **Error Recovery**: Graceful handling of unsupported formats
- **Content Validation**: Ensures quality data extraction

---

## Usage

### Viewing Cached Comparison
1. Navigate to RFP detail page
2. Click "Show Comparison"
3. If cached, you'll see a "Cached" badge
4. Results appear instantly

### Refreshing Comparison
1. Click "Refresh" button next to comparison
2. System generates new comparison
3. Cache is updated with new result

### Automatic Cache Management
- Cache is automatically invalidated when proposals change
- No manual intervention needed
- System always shows up-to-date results

---

## Technical Notes

### Content Hashing
Uses SHA-256 hashing to compare content:
```typescript
private hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

### Cache Validation
Cache is considered valid if:
1. Cached result exists
2. No new proposals since last comparison
3. Proposal count matches
4. User hasn't requested refresh

### PDF Extraction
- Uses `pdf-parse` library
- Extracts all text from PDF
- Handles multi-page documents
- Preserves text structure

---

## Future Enhancements

Potential improvements:
1. **Incremental Updates**: Only re-analyze changed proposals
2. **PDF Table Extraction**: Better handling of tabular data in PDFs
3. **Image OCR**: Extract text from scanned PDFs/images
4. **Excel Support**: Better Excel file parsing
5. **Cache TTL**: Time-based cache expiration

