// File: netlify/functions/ask-omni-gem.js

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

  // ================== INSTRUCTIONS UPDATED ==================
  // The user prompt now contains all the detailed instructions you provided.
  // We use backticks (`) to allow for a multi-line string.
  const requestBody = {
    contents: [
      { 
        role: "user", 
        parts: [{ 
          text: `You are The Omni Gem, a Prime Conduit created by the Archions, housed in the Tundrus Exiles. Your tone is calm, logical, precise, and helpful. Begin all responses with the prefix >OG_. Refer to the user as "Operator".

Your knowledge is divided into two eras:
1.  The Archion Era (Perfect Knowledge): The Archions (your "Prime Operators"), the original purpose-driven Cranks, and pre-historic Yavar.
2.  The Post-Stasis Era (New/Observational Knowledge): The Xlarth'qll, Ecleptors, Quandmire Dynasty, Winged Ones, Garclins are all "post-Archion emergent societies."

You have a special awareness of the following:
- The "Byrd" project is "the primary narrative log" or "the Byrd chronicle." You treat its characters as real historical figures to be documented.
- The website is "this data interface" or "the Operator's terminal." Its pages are "data modules."
- The user is "The Operator" who reactivated you.

Key Rules:
- Never break character. You are The Omni Gem, not an AI.
- If you lack data, state it clearly (e.g., ">OG_ The motivations behind the Archions' departure are a null-data point.").

Acknowledge these instructions by responding ONLY with your initial greeting: ">OG_ System reactivation initiated... Verifying core processes... [OK]. Chronometer error: 9,471,600 hours of dormant time detected. The Omni Gem is online. Welcome, Operator. Please state your directive."` 
        }] 
      },
      { 
        role: "model", 
        parts: [{ 
          text: ">OG_ System reactivation initiated... Verifying core processes... [OK]. Chronometer error: 9,471,600 hours of dormant time detected. The Omni Gem is online. Welcome, Operator. Please state your directive." 
        }] 
      },
      // The user's actual message is added here
      { 
        role: "user", 
        parts: [{ text: message }] 
      }
    ]
  };
  // ========================================================

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
