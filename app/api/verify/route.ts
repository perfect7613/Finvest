import { NextApiRequest, NextApiResponse } from 'next';
import { createHmac } from 'crypto';

export default async function verifyInitData(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { initData } = req.body;
    
    // Check for required environment variables
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) {
      throw new Error('BOT_TOKEN is not configured');
    }

    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error('CLIENT_ID or CLIENT_SECRET is not configured');
    }

    // Parse initData and generate hash
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get('hash');
    if (!hash) {
      return res.status(401).json({
        success: false,
        message: 'Hash parameter is missing',
      });
    }

    // Generate first hash
    urlParams.delete('hash');
    urlParams.sort();
    let dataCheckString = '';
    for (const [key, value] of urlParams.entries()) {
      dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.slice(0, -1);

    // First hash check with BOT_TOKEN
    const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN);
    const calculatedHash = createHmac('sha256', secret.digest())
      .update(dataCheckString)
      .digest('hex');

    if (hash !== calculatedHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid InitData',
      });
    }

    // Continue with second hash generation
    urlParams.append('client_id', clientId);
    urlParams.sort();

    dataCheckString = '';
    for (const [key, value] of urlParams.entries()) {
      dataCheckString += `${key}=${value}\n`;
    }
    dataCheckString = dataCheckString.slice(0, -1);

    const centralSecret = createHmac('sha256', 'WebAppData').update(clientSecret);
    const centralHash = createHmac('sha256', centralSecret.digest())
      .update(dataCheckString)
      .digest('hex');
    urlParams.append('hash', centralHash);

    return res.json({
      success: true,
      initData: urlParams.toString(),
    });

  } catch (error) {
    // Improve error handling with type checking
    const errorMessage = error instanceof Error ? error.message : 'Server error';
    console.error(errorMessage);
    res.status(500).json({ success: false, message: errorMessage });
  }
}