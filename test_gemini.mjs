import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '.env') });

const provider = process.env.VITE_AI_PROVIDER || 'openai';
const baseUrl = process.env.VITE_AI_BASE_URL || 'https://api.groq.com/openai/v1';
const modelName = process.env.VITE_AI_MODEL || 'llama-3.3-70b-versatile';

const defaultLabels = ["Laura", "México", "Yarelis", "Groq-Alpha", "Groq-Beta", "Groq-Gamma", "Groq-Delta", "Groq-Epsilon", "Groq-Zeta", "Groq-Eta"];

const keys = [];
for (let i = 1; i <= 15; i++) {
  const k = process.env[`VITE_API_KEY_${i}`];
  if (k && k.trim().length > 5) {
    keys.push({ name: defaultLabels[i - 1] || `Canal ${i}`, key: k.trim() });
  }
}

if (keys.length === 0 && process.env.VITE_API_KEY) {
  keys.push({ name: "Llave Principal", key: process.env.VITE_API_KEY.trim() });
}

async function testKeys() {
  console.log(`🔍 Iniciando prueba profunda de Llaves API (${provider.toUpperCase()} - ${modelName})...`);
  console.log(`📡 Canales detectados: ${keys.length}`);
  console.log("--------------------------------------------------");
  
  for (const { name, key } of keys) {
    try {
      console.log(`[Canal ${name}] Probando (${key.substring(0, 10)}...)...`);

      if (provider === 'openai') {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [{ role: "user", content: "Responde únicamente con la palabra 'Conectado'." }],
            max_tokens: 10
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText.slice(0, 150)}`);
        }

        const data = await res.json();
        const ans = data.choices?.[0]?.message?.content?.trim() || "";
        console.log(`✅ Llave de ${name}: FUNCIONA PERFECTAMENTE. Respuesta IA: ${ans}`);

      } else {
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("Responde únicamente con la palabra 'Conectado'.");
        const text = result.response.text().trim();
        console.log(`✅ Llave de ${name}: FUNCIONA PERFECTAMENTE. Respuesta IA: ${text}`);
      }
    } catch (error) {
      console.log(`❌ Llave de ${name}: FALLÓ. Error: ${error.message}`);
    }
    console.log("--------------------------------------------------");
  }
}

testKeys();
