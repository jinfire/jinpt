export default {
  async fetch(request, env, ctx) {
    const allowedOrigin = "https://jinfire.github.io/jinpt/frontend/jinpt.html";

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

      if (!userMessage || typeof userMessage !== "string") {
        return new Response(JSON.stringify({ error: "Invalid input" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": allowedOrigin }
        });
      }

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: userMessage }
          ],
          temperature: 0.7
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
