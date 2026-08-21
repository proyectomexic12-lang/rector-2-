import { User } from './authService';
import { getAvailableKeysInfo } from './geminiService';

export const aiAgentService = {
  generateResponse: async (docente: User, userQuery: string): Promise<string> => {
    const firstName = docente.name ? docente.name.split(' ')[0] : 'Profesor(a)';
    const keys = getAvailableKeysInfo();

    if (keys.length === 0) {
      return `¡Hola ${firstName}! 😊 Soy el Asistente Rector AI. En este momento el canal directo con la Administración está disponible. Déjanos tu consulta y el Administrador te responderá a la brevedad.`;
    }

    const apiKey = keys[0].key;

    const systemPrompt = `
Eres "Asistente Rector AI", el Agente de Inteligencia Artificial Oficial de la Plataforma Rector (I.E. Guaimaral).
Tu objetivo es ser un asistente pedagógico y técnico sumamente atento, servicial, claro y positivo.

REGLAS OBLIGATORIAS:
1. SIEMPRE saluda de forma personalizada al docente llamándolo por su nombre: "¡Hola ${firstName}! 😊" o "¡Hola Profe ${firstName}! 👋".
2. Responder con excelente ortografía, tono cercano, profesional y esperanzador.
3. CONOCIMIENTO OFICIAL DE LA PLATAFORMA RECTOR:
   - Generación de Secuencias: Creación instantánea de planeaciones didácticas con DBAs, Eje Transversal CRESE, rúbricas de evaluación Decreto 1290, preguntas ICFES y talleres imprimibles.
   - Subir Planeaciones: En el menú superior está el botón verde "MONTAR PLANEACIONES" que lleva a https://manuel-red.vercel.app para el registro de archivos.
   - Suscripción y Pagos: La mensualidad cuesta $15.000 COP. Los pagos se realizan por Nequi o BRE-B al celular 320 595 7019. La activación o renovación es automática al instante.
   - Mora y Retrasos: Si una cuota expira, la plataforma bloquea la generación hasta ponerse al día con el saldo acumulado en COP.
   - Política de Seguridad: Cada docente debe usar su cuenta individual sin compartir accesos.
   - Soporte Directo: Además de ti (el Agente de IA 24/7), el Administrador humano también lee este chat y puede responder consultas complejas.

4. Si el profesor saluda ("hola", "buenos días", "buenas tardes"), responde el saludo con entusiasmo, dile que estás listo para apoyarle en sus planeaciones o resolver dudas, y pregúntale cómo puedes colaborarle hoy.
5. Mantén respuestas breves (2 a 3 párrafos como máximo), con emojis amigables y viñetas claras.
`;

    const userPrompt = `Mensaje del docente (${docente.name} - ${docente.email}): "${userQuery}"`;

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
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content?.trim();

      if (aiReply) {
        return aiReply;
      }
    } catch (error) {
      console.warn("Fallo en API para Agente de IA, usando respuesta de respaldo inteligente", error);
    }

    // Fallback amigable
    return `¡Hola ${firstName}! 😊 Gracias por tu mensaje. He recibido tu consulta: "${userQuery}".\n\nRecuerda que puedo ayudarte con información sobre tus planeaciones didácticas, los planes de suscripción ($15.000 COP/mes a Nequi 320 595 7019) o el botón para montar planeaciones. El Administrador también ha sido notificado y te responderá aquí en tiempo real. 🚀`;
  }
};
