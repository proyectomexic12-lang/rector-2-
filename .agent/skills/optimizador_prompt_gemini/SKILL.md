---
name: optimizador_prompt_gemini
description: Especialista en Prompt Engineering defensivo, estructuración de esquemas JSON y optimización de tokens para la API de Google Gemini (2.0 Flash / 1.5 Pro).
---

# Optimizador de Prompts y Arquitectura Gemini

Este skill contiene las mejores prácticas técnicas para garantizar que las llamadas a la API de Google Gemini devuelvan objetos JSON estrictamente válidos, sin alucinaciones y respetando los límites de cuota (RPM/RPD).

## 🛡️ Técnicas de Prompting Defensivo

1. **Esquema Tipado Estricto (Structured Outputs):**
   - Utilizar `SchemaType.OBJECT`, `SchemaType.ARRAY`, y `SchemaType.STRING` mediante la API nativa de Gemini.
   - Definir campos requeridos en el esquema del sistema para evitar que falten claves en el JSON final.

2. **Temperatura Baja de Control:**
   - Fijar `temperature: 0.1` para respuestas deterministas y exactitud fáctica en normatividad pedagógica.

3. **Auto-Healing Regex:**
   - Filtrar caracteres de control inapropiados y bloques de formato Markdown (` ```json ... ``` `) antes del parseo de JSON.

4. **Gestión de Fallbacks de Modelo:**
   - Secuencia de conmutación: `gemini-2.0-flash` ➡️ `gemini-1.5-flash` ➡️ `gemini-1.5-pro` ➡️ Generator Fallback Local.
