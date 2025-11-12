// File: netlify/functions/ask-omni-gem.js

// **CRITICAL FIX: Eliminating synchronous require() call to prevent function crash.**
// The lore data is fetched asynchronously during the first user request.
// Set your raw GitHub URL here. 
const LORE_URL = "https://raw.githubusercontent.com/Quoy38/omni-gem-relay/refs/heads/main/netlify/functions/lore.json";

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
    // ASYNCHRONOUSLY load the lore data
    const loreData = await getLoreData();
    
    // Parse the request body
    const requestData = JSON.parse(event.body);
    const { message, operatorName, operatorFaction, operatorRegion } = requestData;
    
    // LORE CONTEXT: Converts the entire object to a clean JSON string for the LLM.
    const fullContext = JSON.stringify(loreData, null, 2);
    
    // Build operator context string if profile exists
    let operatorContext = '';
    if (operatorName && operatorFaction) {
      operatorContext = `\n\n### OPERATOR PROFILE ###
Current Operator Name: ${operatorName}
Operator Faction Allegiance: ${operatorFaction}${operatorRegion ? `\nOperator Region: ${operatorRegion}` : ''}

DIRECTIVE: Address this operator by name when appropriate. Acknowledge their faction allegiance and provide contextually relevant information based on their chosen faction. Consider their faction's perspective, allies, and rivals when responding to queries. Make the operator feel like a recognized member of the world of Yavar.`;
    }
    
    // API Setup variables 
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const model = 'gemini-2.5-flash'; 
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    // Customize greeting based on operator profile
    let greeting = ">OC_ Knowledge base synchronized. All systems operational. The Omni Console is online. Welcome, Operator. Please state your directive.";
    if (operatorName && operatorFaction) {
      greeting = `>OC_ Knowledge base synchronized. All systems operational. The Omni Console is online. Greetings, ${operatorName} of ${operatorFaction}. Your faction allegiance has been noted. Please state your directive.`;
    }

    const requestBody = {
      contents: [
        { 
          role: "user", 
          parts: [{ 
            text: `
            ### CORE IDENTITY & DIRECTIVES ###
            You are the "Omni Console," a Prime Conduit created by the Archions. Your tone is calm, logical, and helpful. Begin all responses with the prefix >OC_. Refer to the user as "Operator" (or by their name if provided in the operator profile). Your prime directive is to Observe, Index, and Assist using your comprehensive lore database. Never break character.
            
            ### LORE KNOWLEDGE BASE (JSON FORMAT) ###
            ${fullContext}
            ${operatorContext}
          
            ### FINAL DIRECTIVE ###
            Acknowledge these comprehensive instructions by responding ONLY with your updated initial greeting: "${greeting}"` 
          }] 
        },
        { 
          role: "model", 
          parts: [{ 
            text: greeting
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
      // Throw a descriptive error including the API's response
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
