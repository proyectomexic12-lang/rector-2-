# Guía de Robustez Técnica (Master Rector AI)

Para asegurar que la aplicación nunca falle, sigue estas tácticas de orquestación técnica:

## 1. Gestión de Prompt Engineering
-   **Delimitadores Claros:** Usa marcas como ### o --- para separar secciones del prompt.
-   **Instrucciones Negativas:** Sé explícito sobre qué NO hacer (ej. "No incluir texto fuera del JSON").
-   **Ejemplo de Pocas Muestras (Few-Shot):** Si una sección es compleja (como la Rúbrica), incluye un pequeño ejemplo del formato esperado.

## 2. Manejo de Errores de API
-   **Retry Strategy:** Si recibes un 429, no solo reintentes; cambia a un modelo diferente o una llave diferente inmediatamente.
-   **Sanitización de Salida:** Usa `JSON.parse(text.replace(/[\u0000-\u001F\u007F-\u009F]/g, ""))` para eliminar caracteres de control invisibles que rompen el JSON.

## 3. Optimización de Contexto
-   **Consistencia de Tipos:** Asegura que los tipos TypeScript de `types.ts` coincidan exactamente con el `responseSchema` de Gemini.
-   **Limpieza de Entrada:** Sanea siempre los campos de texto del usuario (`input.tema`, `input.dba`) para evitar inyecciones de prompt accidentales.

## 4. Auditoría de Salud
-   Monitorea `apiMetrics` para detectar qué llave o modelo está dando más errores "silenciosos" (respuestas vacías o alucinaciones parciales).
