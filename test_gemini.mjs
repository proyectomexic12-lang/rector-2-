import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, ".env");

// Parser nativo de .env sin librerías externas (Zero Dependencies)
const envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  content.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.substring(0, idx).trim();
      const value = trimmed.substring(idx + 1).trim();
      envVars[key] = value;
    }
  });
}

const provider = envVars.VITE_AI_PROVIDER || "openai";
const baseUrl = envVars.VITE_AI_BASE_URL || "https://api.groq.com/openai/v1";
const defaultModel = envVars.VITE_AI_MODEL || "llama-3.3-70b-versatile";

const defaultLabels = [
  "Laura", "México", "Yarelis",
  "Groq-Alpha", "Groq-Beta", "Groq-Gamma", "Groq-Delta",
  "Groq-Epsilon", "Groq-Zeta", "Groq-Eta"
];

const keys = [];
for (let i = 1; i <= 15; i++) {
  const k = envVars[`VITE_API_KEY_${i}`];
  if (k && k.trim().length > 5) {
    keys.push({
      name: defaultLabels[i - 1] || `Canal ${i}`,
      key: k.trim(),
      envVar: `VITE_API_KEY_${i}`
    });
  }
}

if (keys.length === 0 && envVars.VITE_API_KEY) {
  keys.push({
    name: "Llave Principal",
    key: envVars.VITE_API_KEY.trim(),
    envVar: "VITE_API_KEY"
  });
}

async function testSingleKey(name, key, envVar) {
  const isGoogleKey = key.startsWith("AIza");
  const isGroqKey = key.startsWith("gsk_");
  const maskedKey = `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;

  console.log(`\n🔍 Probar [${name}] (${envVar}): ${maskedKey}`);

  if (isGoogleKey) {
    console.log(`   Tipo: Google AI Studio Key`);
    const start = Date.now();
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Ping" }] }] })
      });
      const ms = Date.now() - start;
      if (!res.ok) {
        const errText = await res.text();
        console.log(`   ❌ ESTADO: FALLÓ (HTTP ${res.status}) [${ms}ms]`);
        console.log(`   Detalle: ${errText.slice(0, 200)}`);
        return false;
      }
      const data = await res.json();
      const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "OK";
      console.log(`   ✅ ESTADO: OPERATIVA Y VÁLIDA (Google Gemini 2.0) [${ms}ms]`);
      console.log(`   Respuesta IA: "${txt.slice(0, 60)}"`);
      return true;
    } catch (e) {
      console.log(`   ❌ ESTADO: ERROR DE RED - ${e.message}`);
      return false;
    }
  } else {
    console.log(`   Tipo: Groq Cloud API Key (${defaultModel})`);
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
          model: defaultModel,
          messages: [{ role: "user", content: "Ping" }],
          max_tokens: 10
        })
      });
      const ms = Date.now() - start;
      if (!res.ok) {
        const errText = await res.text();
        console.log(`   ❌ ESTADO: FALLÓ (HTTP ${res.status}) [${ms}ms]`);
        if (res.status === 404) {
          console.log(`   💡 Causa: La llave no tiene acceso a Groq o la llave ha expirado/fue borrada.`);
        } else if (res.status === 401) {
          console.log(`   💡 Causa: Llave no autorizada/revocada en console.groq.com.`);
        } else {
          console.log(`   Detalle: ${errText.slice(0, 200)}`);
        }
        return false;
      }
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content?.trim() || "OK";
      console.log(`   ✅ ESTADO: OPERATIVA Y VÁLIDA (Groq Cloud) [${ms}ms]`);
      console.log(`   Respuesta IA: "${txt.slice(0, 60)}"`);
      return true;
    } catch (e) {
      console.log(`   ❌ ESTADO: ERROR DE RED - ${e.message}`);
      return false;
    }
  }
}

async function runAudit() {
  console.log("==================================================");
  console.log("🛠️ AUDITORÍA Y VERIFICACIÓN NATIVA DE LLAVES API");
  console.log("==================================================");
  console.log(`📌 Proveedor actual en .env: ${provider.toUpperCase()}`);
  console.log(`📌 Modelo configurado: ${defaultModel}`);
  console.log(`📡 Canales detectados: ${keys.length}`);

  if (keys.length === 0) {
    console.log("⚠️ No se encontraron llaves configuradas en .env.");
    return;
  }

  let validCount = 0;
  for (const k of keys) {
    const ok = await testSingleKey(k.name, k.key, k.envVar);
    if (ok) validCount++;
  }

  console.log("\n==================================================");
  console.log(`📊 RESUMEN FINAL: ${validCount} de ${keys.length} llaves funcionan correctamente.`);
  if (validCount === 0) {
    console.log("⚠️ TODAS LAS LLAVES EN .ENV FALLARON O ESTÁN CADUCADAS.");
    console.log("👉 RECOMENDACIÓN PARA ARREGLARLO:");
    console.log("   Opción A: Crea una llave gratis de Google en https://aistudio.google.com/app/apikey");
    console.log("             En tu .env pon: VITE_AI_PROVIDER=google");
    console.log("             Y coloca tu llave: VITE_API_KEY_1=AIzaSy...");
    console.log("   Opción B: O crea una nueva llave gratis de Groq en https://console.groq.com/keys");
    console.log("             Y actualiza VITE_API_KEY_1=gsk_...");
  } else {
    console.log("🎉 ¡El sistema tiene canales activos y funcionando correctamente!");
  }
  console.log("==================================================\n");
}

runAudit();
