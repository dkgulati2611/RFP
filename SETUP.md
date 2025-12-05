# Quick Setup Guide

## Prerequisites Checklist

- [ ] Node.js v18+ installed (`node --version`)
- [ ] PostgreSQL 14+ installed and running
- [ ] **Ollama** installed (free, local LLM)
  - Download from https://ollama.ai
  - After installation, run: `ollama pull llama3.2`
  - Ollama runs locally - completely free, no API keys needed!
- [ ] Email account with SMTP/IMAP access (Gmail recommended)

## Step-by-Step Setup

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb rfp_management

# Or using psql:
psql -U postgres
CREATE DATABASE rfp_management;
\q
```

### 2. Install Ollama (Free, Local LLM)

```bash
# Download and install Ollama from https://ollama.ai
# For macOS: brew install ollama
# For Linux: curl -fsSL https://ollama.com/install.sh | sh
# For Windows: Download installer from website

# After installation, pull a model (llama3.2 is recommended)
ollama pull llama3.2

# Verify installation
ollama list
```

**Note**: Ollama runs as a local service. It will start automatically, or you can run `ollama serve` manually.

### 3. Backend Setup

```bash
cd backend
npm install

# Copy environment file
cp env.example .env

# Edit .env with your settings:
# - DATABASE_URL (PostgreSQL connection string)
# - OLLAMA_BASE_URL (default: http://localhost:11434)
# - OLLAMA_MODEL (default: llama3.2)
# - Email credentials (SMTP and IMAP)

# Run database migrations
npx prisma migrate dev
npx prisma generate

# Seed sample vendors (optional)
npm run seed
```

### 4. Frontend Setup

```bash
cd ../frontend
npm install
```

### 5. Running the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Email Polling (optional, for receiving emails):**
```bash
cd backend
npm run email:poll
```

### 6. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/api/health

## Email Configuration

### Gmail Setup

1. Enable 2-Factor Authentication
2. Generate App Password:
   - Go to Google Account → Security → App passwords
   - Create app password for "Mail"
   - Use this password (not your regular password) in `.env`

### Example .env Configuration

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/rfp_management?schema=public"

# Ollama Configuration (Free, Local LLM)
# Make sure Ollama is running: ollama serve (usually runs automatically)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
# Other models: mistral, llama3, qwen2.5, phi3

# Email (Gmail example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM=your.email@gmail.com

IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your.email@gmail.com
IMAP_PASSWORD=your_app_password

EMAIL_POLL_INTERVAL=60000
EMAIL_REPLY_TO=your.email@gmail.com
```

## Testing the Application

1. **Create Vendors:**
   - Navigate to Vendors page
   - Add at least 2-3 vendors with valid email addresses

2. **Create an RFP:**
   - Go to RFPs page
   - Click "Create New RFP"
   - Enter natural language description, e.g.:
     ```
     I need to procure laptops and monitors for our new office. 
     Budget is $50,000 total. Need delivery within 30 days. 
     We need 20 laptops with 16GB RAM and 15 monitors 27-inch. 
     Payment terms should be net 30, and we need at least 1 year warranty.
     ```

3. **Send RFP:**
   - Open the created RFP
   - Select vendors from the sidebar
   - Click "Send RFP"
   - Check vendor email inboxes

4. **Receive Responses:**
   - Vendors reply to the RFP email
   - Email polling service processes responses automatically
   - Refresh RFP page to see parsed proposals

5. **Compare Proposals:**
   - When multiple proposals are received
   - Click "Show Comparison" to see AI-powered analysis

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format in `.env`
- Ensure database exists: `psql -l | grep rfp_management`

### Email Sending Issues
- Verify SMTP credentials
- For Gmail: Use App Password, not regular password
- Check firewall/network restrictions

### Email Receiving Issues
- Ensure email polling service is running
- Check IMAP credentials
- Verify email subject contains RFP ID format: "RFP: Title - 123"

### AI Parsing Issues
- Verify Ollama is running: `ollama list` (should show installed models)
- Check Ollama is accessible: `curl http://localhost:11434/api/tags`
- Ensure model is pulled: `ollama pull llama3.2` (or your chosen model)
- Check `OLLAMA_BASE_URL` and `OLLAMA_MODEL` in `.env`
- If connection fails, start Ollama: `ollama serve`
- Review console logs for error messages

## Development Tips

- Backend auto-reloads on file changes (using `tsx watch`)
- Frontend hot-reloads automatically (Vite)
- Check browser console and terminal for errors
- Use Prisma Studio to inspect database: `npx prisma studio`

