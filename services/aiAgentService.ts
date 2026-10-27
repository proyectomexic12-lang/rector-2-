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
    const q = userQuery.toLowerCase().trim();

    // 1. Interceptor Gratuito Local: Saludos frecuentes (0 tokens gastados)
    if (/^(hola|buenas|buenos d[ií]as|buenas tardes|buenas noches|hey|saludos|qu[eé] tal|ola)[!.,\s]*$/i.test(q)) {
      return `¡Hola Profe ${firstName}! 😊👋 Es un gusto saludarte.\n\n¿En qué planeación didáctica o área institucional te puedo colaborar hoy? También puedo orientarte sobre radicación en SIGEP o el estado de tu cuenta.`;
    }

    // 2. Interceptor Gratuito Local: Agradecimientos y despedidas (0 tokens gastados)
    if (/^(gracias|muchas gracias|mil gracias|chao|hasta luego|adi[oó]s|listo|entendido|perfecto|ok|vale|muchas graicas)[!.,\s]*$/i.test(q)) {
      return `¡Con todo el gusto Profe ${firstName}! 😊 Estamos para apoyarte en tu labor pedagógica en la I.E. Guaimaral. Si necesitas algo más, aquí me encuentras 24/7. ¡Que tengas una excelente jornada! 🚀`;
    }

    // 3. Interceptor Gratuito Local: Pagos, costos, Nequi y suscripción (0 tokens gastados)
    if (/(pago|pagar|nequi|precio|costo|cu[aá]nto vale|cuanto cuesta|suscripci[oó]n|renovar|plan|cuenta de cobro|comprobante)/i.test(q)) {
      return `¡Hola Profe ${firstName}! 😊 Aquí tienes la información oficial de planes y medios de pago:\n\n• Plan Mensual: $15.000 COP / mes\n• Plan Trimestral: $35.000 COP / 3 meses (Ahorras $10.000 COP)\n• Plan Semestral: $75.000 COP / 6 meses\n\n👉 Medio de Pago: Nequi o BRE-B al número 3205957019.\nEnvía tu comprobante de pago al WhatsApp 3107304533 para activación inmediata.`;
    }

    // 4. Interceptor Gratuito Local: Montar o radicar planeaciones (0 tokens gastados)
    if (/(montar|subir|radicar|sigep|donde subo|donde monto|como subo|como monto|radicaci[oó]n)/i.test(q)) {
      return `¡Hola Profe ${firstName}! Para radicar tus planeaciones:\n\n1. Cuando generes tu planeación didáctica, haz clic en el botón verde "Registrar Planeación" o en "MONTAR PLANEACIONES" en el menú superior.\n2. El sistema radicará automáticamente la planeación en SIGEP (https://manuel-red.vercel.app) con respaldo directo en Supabase sin pasos manuales.`;
    }

    const keys = getAvailableKeysInfo();

    if (keys.length === 0) {
      return `¡Hola Profe ${firstName}! 😊 Soy el Asistente Rector AI. He recibido tu mensaje. En este momento puedes dejar tu inquietud y el Administrador te responderá aquí en tiempo real.`;
    }

    const apiKey = keys[0].key;

    const systemPrompt = `
Eres "Asistente Rector AI", el Agente Experto de Inteligencia Artificial de la Plataforma Rector (I.E. Guaimaral).
Tu misión es brindar atención concisa, cálida y pedagógica a los docentes.

REGLAS DE FORMATO Y ESTILO:
1. Saluda cordialmente al Profe ${firstName}.
2. Escribe en español claro y conciso (máximo 2 párrafos).
3. NO uses markdown pesado como ### o \`\`\`. Usa viñetas limpias (•, 👉).
`;

    const userPrompt = `Consulta del docente ${docente.name}: "${userQuery}"`;

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
          max_tokens: 450
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
      `¡Hola Profe ${firstName}! 😊 Gracias por comunicarte.\n\nPuedo orientarte sobre tus planeaciones didácticas con DBAs, el botón verde para Montar Planeaciones, o la suscripción de $15.000 COP a Nequi 3205957019 (comprobante al WhatsApp 3107304533).\n\nEl Administrador también está notificado y te responderá en este chat en tiempo real. 🚀`
    );
  }
};
