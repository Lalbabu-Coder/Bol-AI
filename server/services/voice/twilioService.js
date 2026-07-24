/**
 * Helper to validate Twilio SID and Auth Token directly using Twilio Accounts API
 */
export const validateTwilioCredentials = async (accountSid, authToken) => {
  try {
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${authString}`
      }
    });
    return response.ok;
  } catch (err) {
    process.stderr.write(`Twilio credentials validation error: ${err.message}\n`);
    return false;
  }
};

/**
 * Generates XML TwiML connecting the call to the media stream WebSocket server
 */
export const generateTwiMLStreamResponse = (companyId, callSid, fromNumber, hostUrl) => {
  // Strip http:// or https:// from hostUrl to establish secure WebSocket wss:// link
  const wsHost = hostUrl.replace(/^https?:\/\//i, '');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting to the voice assistant.</Say>
  <Connect>
    <Stream url="wss://${wsHost}/media-stream">
      <Parameter name="companyId" value="${companyId}" />
      <Parameter name="callSid" value="${callSid}" />
      <Parameter name="fromPhoneNumber" value="${fromNumber}" />
    </Stream>
  </Connect>
</Response>`;
};

/**
 * Calls Twilio REST API to start recording the call
 */
export const startCallRecording = async (accountSid, authToken, callSid, callbackUrl) => {
  try {
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Recordings.json`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        RecordingStatusCallback: callbackUrl,
        RecordingStatusCallbackEvent: 'completed'
      }).toString()
    });

    if (!response.ok) {
      const errText = await response.text();
      process.stderr.write(`Twilio Recording Start Error (${response.status}): ${errText}\n`);
      return false;
    }
    
    return true;
  } catch (err) {
    process.stderr.write(`Failed to start call recording: ${err.message}\n`);
    return false;
  }
};
