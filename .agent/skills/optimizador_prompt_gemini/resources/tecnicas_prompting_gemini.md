# Guía de Optimización de Prompts y Manejo de Errores Gemini

## 🛠️ Buenas Prácticas en Gemini API

### 1. Inyección de Delimitadores
Usar etiquetas claras como `### INSTRUCCIONES PEDAGÓGICAS ###` para separar el contexto institucional de las entradas variables del usuario.

### 2. Manejo de Errores 429 (Too Many Requests)
- Implementar algoritmo de *Backoff Exponencial con Jitter*.
- Rotación automática de clave de API en el pool de 15 llaves.

### 3. Sanitización de JSON
```typescript
const cleanJson = (rawText: string) => {
  return rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
    .trim();
};
```
