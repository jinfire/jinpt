const chatHistories = {}; // sessionId -> messages 배열

export default {
  async fetch(request, env, ctx) {
    const allowedOrigin = "https://jinfire.github.io";
    
    const getMessages = (sessionId, userMessage) => {
      if (!chatHistories[sessionId]) {
        chatHistories[sessionId] = [
          { role: "system", content: "You are a helpful assistant." }
        ];
      }
      chatHistories[sessionId].push({ role: "user", content: userMessage });
      return chatHistories[sessionId];
    };

    // CORS preflight 요청 처리
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const body = await request.json();
      const userMessage = body.message;
      const sessionId = body.sessionId;

      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Missing sessionId" }), { status: 400 });
      }

      if (!userMessage || typeof userMessage !== "string") {
        return new Response(JSON.stringify({ error: "Invalid input" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
        });
      }

      const messages = getMessages(sessionId, userMessage);

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "chatgpt-4o-latest",
          messages: messages,
          temperature: 1.0
        })
      });

      if (!openaiResponse.ok) {
        const errorDetail = await openaiResponse.text();
        return new Response(JSON.stringify({ error: "OpenAI API error", detail: errorDetail }), {
          status: openaiResponse.status,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
        });
      }

      const data = await openaiResponse.json();
      const reply = data.choices?.[0]?.message?.content || "No reply from OpenAI";
      chatHistories[sessionId].push({ role: "assistant", content: reply });

      return new Response(JSON.stringify({ reply }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: "Something went wrong", detail: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
      });
    }
  }
}
