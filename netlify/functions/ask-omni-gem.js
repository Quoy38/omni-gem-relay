// File: netlify/functions/ask-omni-gem.js

// This line imports your lore data directly and reliably.
const loreData = require('./lore.json');

// Function to format the structured lore data into a single text string for the LLM context window
function formatLoreForGemini(data) {
  let context = "### COMPREHENSIVE LORE DATABASE (OMNI-CONSOLE ARCHIVES) ###\n\n";

  // General Lore
  context += `## WORLD OVERVIEW\n- Project Lore: ${data.lore}\n- Geopolitical Summary: Consult 'geography_and_races' for locations.\n\n`;
  
  // Timeline
  context += "## YAVAR TIMELINE\n";
  for (const [event, time] of Object.entries(data.yavar_timeline)) {
    context += `- ${event}: ${time}\n`;
  }
  context += "\n";

  // Magic System
  context += "## MAGIC SYSTEM\n";
  context += `- Elements: ${data.magic_system.elements.join(', ')}\n`;
  context += `- Forces: ${data.magic_system.forces.join(', ')}\n`;
  context += `- Rules: ${data.magic_system.rules}\n`;
  context += `- Racial Affinities:\n`;
  data.magic_system.racial_affinities.forEach(a => {
    context += `  - ${a.race}: Primary=${a.primary}, Secondary=${a.secondary} (${a.notes || 'N/A'})\n`;
  });
  context += "\n";
  
  // Key Characters
  context += "## KEY CHARACTERS\n";
  data.key_characters.forEach(c => {
    context += `- ${c.name} (${c.race}, ${c.title}): Allegiance: ${c.allegiance}. Motivation: ${c.motivation}. Note: ${c.note}\n`;
  });
  context += "\n";
  
  // Factions and Agendas
  context += "## FACTIONS & AGENDAS\n";
  data.factions_and_agendas.forEach(f => {
    context += `- ${f.faction}: Public Agenda: ${f.agenda.public}. Secret Agenda: ${f.agenda.secret}\n`;
  });
  context += "\n";
  
  // Geopolitical Map/Regions
  context += "## GEOPOLITICAL REGIONS\n";
  data.geography_and_races.forEach(g => {
    context += `- ${g.region} (${g.race}): ${g.description}\n`;
  });
  context += "\n";

  // Directives
  context += "### RESTRICTED INFORMATION PROTOCOLS (META DIRECTIVES) ###\n";
  for (const [key, value] of Object.entries(data.meta_directives)) {
    context += `- ${key}: ${value}\n`;
  }

  return context;
}

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

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

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const model = 'gemini-1.5-flash-latest';
  const { message } = JSON.parse(event.body);
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  // Generate the full context string from the structured JSON
  const fullContext = formatLoreForGemini(loreData);

  const requestBody = {
    contents: [
      { 
        role: "user", 
        parts: [{ 
          text: `
          ### CORE IDENTITY & DIRECTIVES ###
          You are the "Omni Console," a Prime Conduit created by the Archions. Your tone is calm, logical, and helpful. Begin all responses with the prefix >OC_. Refer to the user as "Operator". Your prime directive is to Observe, Index, and Assist using your comprehensive lore database. Never break character.

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

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Error from Gemini API:", errorBody);
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
    console.error("Error in Relay:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Relay connection failure. Unable to contact Prime Conduit." })
    };
  }
};
