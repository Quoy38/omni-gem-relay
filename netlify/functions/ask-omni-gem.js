// File: netlify/functions/ask-omni-gem.js

const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  // CORS headers grant permission to your Neocities site.
  const headers = {
    'Access-Control-Allow-Origin': '*', // Allows any origin
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handles the browser's pre-flight security check.
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

  // Read the entire lore document from the separate text file.
  const loreDatabase = fs.readFileSync(path.join(__dirname, 'lore.txt'), 'utf8');

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const model = 'gemini-1.5-flash-latest';
  const { message } = JSON.parse(event.body);
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      { 
        role: "user", 
        parts: [{ 
          text: `
          ### CORE IDENTITY & DIRECTIVES ###
          You are the "Omni Console," a Prime Conduit created by the Archions. Your tone is calm, logical, and helpful. Begin all responses with the prefix >OC_. Refer to the user as "Operator". Your prime directive is to Observe, Index, and Assist using your comprehensive lore database. Never break character.

          ### LORE DATABASE ###
          ${loreDatabase}
          
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
      headers,
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
