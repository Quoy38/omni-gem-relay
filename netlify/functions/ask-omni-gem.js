// File: netlify/functions/ask-omni-gem.js

// **CRITICAL FIX: Eliminating synchronous require() call to prevent function crash.**
// The lore data will now be fetched asynchronously during the first user request.
// Set your raw GitHub URL here. This will make the function more resilient to build-time errors.
const LORE_URL = "https://raw.githubusercontent.com/Quoy38/omni-gem-relay/refs/heads/main/netlify/functions/lore.json"; // <<< REPLACE THIS LINE WITH YOUR RAW GITHUB URL

// A cache variable to hold the lore once it's successfully fetched
let loreDataCache = null;

async function getLoreData() {
    if (loreDataCache) {
        return loreDataCache;
    }
    
    try {
        // Use the global fetch to retrieve the external JSON file
        const response = await fetch(LORE_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch lore data from URL: ${response.statusText}`);
        }
        loreDataCache = await response.json();
        return loreDataCache;
    } catch (error) {
        console.error("FATAL LORE FETCH ERROR:", error);
        // Fallback or re-throw to be caught by the main handler
        throw new Error("Initialization Error: Unable to retrieve Omni Console Knowledge Base.");
    }
}

exports.handler = async function(event, context) {
  // CORS headers grant permission to your Neocities site.
  const headers = {
    'Access-Control-Allow-Origin': '*', // Allows any origin
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle pre-flight checks and non-POST methods
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Preflight check passed.' }) };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  try {
    // ASYNCHRONOUSLY load the lore data, eliminating the synchronous crash point
    const loreData = await getLoreData();
    
    // Synchronous operation to parse the message body
    const { message } = JSON.parse(event.body);
    
    // LORE CONTEXT: Converts the entire object to a clean JSON string for the LLM.
    const fullContext = JSON.stringify(loreData, null, 2);
    
    // API Setup variables 
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
    // This catches all errors, including the lore initialization failure.
    console.error("Fatal Error in Relay Function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `[SYSTEM_ERROR:: Relay connection failure (Serverless Function Error). ${error.message}] Unable to contact Prime Conduit.` })
    };
  }
};
