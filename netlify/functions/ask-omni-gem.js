// File: netlify/functions/ask-omni-gem.js - DIAGNOSTIC ECHO TEST

exports.handler = async function(event, context) {
  // CORS headers are still needed for the browser to allow the connection.
  const headers = {
    'Access-Control-Allow-Origin': '*',
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

  // This function does NOT contact Google. It just gets the user's message...
  const { message } = JSON.parse(event.body);
  const echoResponse = `>OC_ ECHO_TEST_SUCCESSFUL. I received the message: "${message}"`;

  // ...and sends a success message back.
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ reply: echoResponse })
  };
};
