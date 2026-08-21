import { User } from './authService';
import { getAvailableKeysInfo } from './geminiService';

/**
 * Sanitiza el texto devuelto por la IA para eliminar marcado markdown como ***, ###, ```
 * y evitar caracteres raros o rotos en el chat.
 */
function cleanSpecialCharacters(text: string): string {
  if (!text) return '';
  return text
    .replace(/```[a-z]*\n?/gi, '') // Eliminar bloques de código
    .replace(/```/g, '')
    .replace(/#{1,6}\s?/g, '') // Eliminar títulos markdown ###
    .replace(/\*\*(.*?)\*\*/g, '$1') // Eliminar negritas **
    .replace(/\*(.*?)\*/g, '$1') // Eliminar cursivas *
    .replace(/_{1,2}(.*?)_{1,2}/g, '$1') // Eliminar guiones bajos _
    .replace(/`{1,3}(.*?)(`{1,3}|$)/g, '$1') // Eliminar comillas invertidas
    .replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, '') // Eliminar caracteres de control no imprimibles
    .replace(/\n{3,}/g, '\n\n') // Máximo 2 saltos de línea consecutivos
    .trim();
}

export const aiAgentService = {
  generateResponse: async (docente: User, userQuery: string): Promise<string> => {
    const firstName = docente.name ? docente.name.split(' ')[0] : 'Profesor(a)';
    const keys = getAvailableKeysInfo();

    if (keys.length === 0) {
      return `¡Hola Profe ${firstName}! 😊 Soy el Asistente Rector AI. He recibido tu mensaje. En este momento puedes dejar tu inquietud y el Administrador te responderá aquí en tiempo real.`;
    }

    const apiKey = keys[0].key;

    const systemPrompt = `
Eres "Asistente Rector AI", el Agente Experto de Inteligencia Artificial de la Plataforma Rector (I.E. Guaimaral).
Tu misión es brindar atención impecable, cálida, sin fallos y con dominio 100% de la plataforma a los docentes.

REGLAS DE FORMATO Y ESTILO:
1. SIEMPRE saluda de forma personal y cálida: "¡Hola Profe ${firstName}! 😊" o "¡Hola ${firstName}! 👋 Es un gusto saludarte.".
2. Escribe en español claro, elegante y natural. NO utilices símbolos de marcado como ###, **, \`\`\` ni caracteres especiales de código. Usa viñetas limpias como (•, 👉, ✅) y párrafos bien estructurados.
3. Mantén respuestas concisas, de 2 a 3 párrafos como máximo, muy agradables de leer.

CONOCIMIENTO INTEGRAL DE LA PLATAFORMA RECTOR:
• Planeaciones Didácticas: Genera secuencias completas alineadas a los Derechos Básicos de Aprendizaje (DBA) del MEN, Competencias Socioemocionales (Eje CRESE), Rúbricas del Decreto 1290 (Niveles Bajo, Básico, Alto y Superior), Preguntas tipo Saber-ICFES con justificación y Talleres Imprimibles.
• Montar Planeaciones: En el menú superior está el botón verde "MONTAR PLANEACIONES" que redirecciona a https://manuel-red.vercel.app para subir las secuencias pedagógicas institucionales.
• Planes de Suscripción:
  - Mensual: $15.000 COP / mes.
  - Trimestral: $35.000 COP / 3 meses (Ahorras $10.000 COP).
  - Semestral: $75.000 COP / 6 meses (Ahorras $15.000 COP).
• Medios de Pago: Nequi o BRE-B al número 320 595 7019.
• Activación y Mora: La renovación se activa inmediatamente. Si una cuota expira, el sistema calcula la mora acumulada en COP y suspende temporalmente la generación hasta que el Administrador registre el pago ("💰 Cobrar Mora").
• Seguridad: Cuentas personales por docente sin compartir accesos para proteger los datos institucionales.
• Atención en Tiempo Real: Tú (Asistente IA 24/7) y el Administrador humano responden en este mismo chat en vivo.

Si el docente solo saluda ("hola", "buenos días"), salúdalo con entusiasmo y pregúntale en qué área o planeación necesita ayuda hoy.
`;

    const userPrompt = `Consulta del docente ${docente.name} (${docente.email}): "${userQuery}"`;

    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}`);
      }

      const data = await response.json();
      const rawReply = data.choices?.[0]?.message?.content?.trim();

      if (rawReply) {
        return cleanSpecialCharacters(rawReply);
      }
    } catch (error) {
      console.warn("Respuesta de respaldo para Agente de IA", error);
    }

    // Fallback pulcro sin caracteres especiales
    return cleanSpecialCharacters(
      `¡Hola Profe ${firstName}! 😊 Gracias por comunicarte.\n\nPuedo orientarte sobre tus planeaciones didácticas con DBAs, el botón verde para Montar Planeaciones, o la suscripción de $15.000 COP a Nequi 320 595 7019.\n\nEl Administrador también está notificado y te responderá en este chat en tiempo real. 🚀`
    );
  }
};
