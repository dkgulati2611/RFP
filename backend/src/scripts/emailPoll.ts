import dotenv from 'dotenv';
import { EmailParserService } from '../services/emailParserService';

dotenv.config();

const emailParser = new EmailParserService();
const pollInterval = parseInt(process.env.EMAIL_POLL_INTERVAL || '60000'); // Default 60 seconds

console.log('Starting email polling service...');
console.log(`Poll interval: ${pollInterval / 1000} seconds`);

async function poll() {
  try {
    await emailParser.pollInbox();
  } catch (error) {
    console.error('Error polling inbox:', error);
  }
}

// Poll immediately, then set interval
poll();
setInterval(poll, pollInterval);

