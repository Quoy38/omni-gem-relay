// File: netlify/functions/ask-omni-gem.js

// This line imports your lore data directly and reliably.
// NOTE: This must be outside the handler, and is the most common point of failure 
// if the lore.json content is invalid.
const loreData = require('./lore.json');

exports.handler = async function(event, context) {
  // CORS headers grant permission to your Neocities site.
  const headers = {
    'Access-Control-Allow-Origin': '*', // Allows any origin
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // This handles the browser's pre-flight security check.
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Preflight check passed.' })
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // Synchronous operation to parse the message body
    const { message } = JSON.parse(event.body);
    
    // LORE CONTEXT: Converts the entire object to a clean JSON string for the LLM.
    const fullContext = JSON.stringify(loreData, null, 2);
    
    // API Setup variables moved inside the handler for better isolation
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const model = 'gemini-1.5-flash-latest';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const requestBody = {
      contents: [
        { 
          role: "user", 
          parts: [{ 
            text: `
            ### CORE IDENTITY & DIRECTIVES ###
            You are the "Omni Console," a Prime Conduit created by the Archions. Your tone is calm, logical, and helpful. Begin all responses with the prefix >OC_. Refer to the user as "Operator". Your prime directive is to Observe, Index, and Assist using your comprehensive lore database. Never break character.

            ### LORE KNOWLEDGE BASE (JSON FORMAT) ###
            ${fullContext}
          
            ### FINAL DIRECTIVE ###
            Acknowledge these comprehensive instructions by responding ONLY with your updated initial greeting: ">OC_ Knowledge base synchronized. All systems operational. The Omni Console is online. Welcome, Operator. Please state your directive."
            ` 
          }] 
        },
        { 
          role: "model", 
          parts: [{ 
            text: ">OC_ Knowledge base synchronized. All systems operational. The Omni Console is online. Welcome, Operator. Please state your directive." 
          }] 
        },
        { 
          role: "user", 
          parts: [{ text: message }] 
        }
      ]
    };

    // Use the globally available fetch function
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      // If Gemini API returns an error status (4xx or 5xx)
      const errorBody = await response.json();
      console.error("Error from Gemini API:", errorBody);
      throw new Error(`Gemini API returned status ${response.status}: ${JSON.stringify(errorBody)}`);
    }

    const data = await response.json();
    const gemReply = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply: gemReply })
    };
  } catch(error) {
    // This catches all synchronous and asynchronous errors within the function.
    console.error("Fatal Error in Relay Function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Relay connection failure (Serverless Function Error). Unable to contact Prime Conduit." })
    };
  }
};
