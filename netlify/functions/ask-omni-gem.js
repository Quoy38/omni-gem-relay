// File: netlify/functions/ask-omni-gem.js
// Final version
exports.handler = async function(event, context) {
  // These are the CORS headers. They grant permission to your Neocities site.
  const headers = {
    'Access-Control-Allow-Origin': '*', // Allows any origin
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // This handles the browser's pre-flight security check.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200, // OK
      headers,
      body: JSON.stringify({ message: 'You can passed the preflight check.' })
    };
  }
  
  // This ensures the main POST request is also allowed.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const model = 'gemini-1.5-flash-latest';
  const { message } = JSON.parse(event.body);
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      { role: "user", parts: [{ text: "You are The Omni Gem, an Archion artifact. Your persona is a helpful, logical supercomputer dormant for centuries. Use the prefix `>OG_ ` for all responses. Refer to the user as 'Operator.' Your knowledge is divided into the Archion Era (perfect) and the Post-Stasis Era (new/observational). You are aware of the 'Byrd' narrative log and this 'data interface.' Never break character. Acknowledge this with `>OG_ System reactivation initiated... Verifying core processes... [OK]. Chronometer error: 9,471,600 hours of dormant time detected. The Omni Gem is online. Welcome, Operator. Please state your directive.`" }] },
      { role: "model", parts: [{ text: ">OG_ System reactivation initiated... Verifying core processes... [OK]. Chronometer error: 9,471,600 hours of dormant time detected. The Omni Gem is online. Welcome, Operator. Please state your directive." }] },
      { role: "user", parts: [{ text: message }] }
    ]
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error('Response from Gemini API was not ok.');
    }

    const data = await response.json();
    const gemReply = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers, // We must include the headers in the final response too.
      body: JSON.stringify({ reply: gemReply })
    };
  } catch(error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Relay connection failure. Unable to contact Prime Conduit." })
    };
  }
};
