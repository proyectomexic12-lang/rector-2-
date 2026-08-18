# Documentación del Proyecto - Docente AI Pro (I.E. Guaimaral)

Bienvenido a la guía técnica y de usuario de tu plataforma de gestión académica inteligente. Este documento describe cómo funciona el sistema y cómo mantenerlo.

## 🚀 Tecnologías Core
1. **Frontend:** React + TypeScript + TailwindCSS.
2. **AI Orchestrator:** Google Gemini API (Modelos 2.0 Flash, 1.5 Flash y 1.5 Pro).
3. **Documentación:** Biblioteca `docx` para generación de archivos Word.
4. **Seguridad:** Obfuscación de datos en `localStorage` y saneamiento de entradas.

## 📁 Estructura de Archivos
- `/src/services/geminiService.ts`: El "cerebro" que conecta con la IA. Contiene lógica de auto-corrección y reintentos automáticos.
- `/src/services/authService.ts`: Gestiona el acceso de docentes y el cifrado de sesión local.
- `/src/services/docxService.ts`: Transforma los datos de la IA en un documento formal descargable.
- `/src/components/`: Componentes visuales (Login, Formulario, Previsualización).

## 🛡️ Sistema de Auto-Debugging (Punto #3)
El sistema incluye mecanismos de autoreparación:
- **Healing de JSON:** Si la IA devuelve un texto con errores de formato, el servicio intenta extraer el objeto JSON válido automáticamente.
- **Retry Exponencial:** Si hay saturación en los servidores de Google (Error 429), la app espera 30 segundos y vuelve a intentarlo sin que el usuario tenga que hacer nada.
- **Model Fallback:** Si un modelo falla, el sistema salta automáticamente al siguiente nivel (ej: de Flash a Pro).

## 🔑 Gestión de Usuarios
Los usuarios autorizados están definidos en `services/authService.ts`. Por seguridad:
1. Las contraseñas se validan contra una lógica interna.
2. Los datos guardados en el navegador están cifrados mediante un algoritmo XOR con salt.

## 📝 Guía para Docentes
1. **DBA:** Puedes escribir tu propio DBA o dejar que la IA elija el oficial del MEN basado en el área y tema.
2. **Eje CRESE:** El sistema integra automáticamente la educación socioemocional y ciudadana.
3. **Refinamiento:** Una vez generada la secuencia, puedes usar el chat de refinamiento para pedir cambios específicos (ej: "hazlo más dinámico para niños de 6 años").

## 📊 Mediciones de Rendimiento y Orquestación Gemini

El sistema está optimizado para trabajar con la serie oficial de modelos Gemini 2.0 y 1.5 de Google AI Studio, garantizando alta disponibilidad incluso con tráfico masivo de docentes.

| Modelo | Categoría | RPM (Requests Per Minute) | RPD (Requests Per Day) | Estado |
| :--- | :--- | :--- | :--- | :--- |
| **Gemini 2.0 Flash** | Inteligencia Base | 15 | 1,500 | ✅ Activo |
| **Gemini 2.0 Flash-Lite** | Alta Frecuencia | 30 | 1,500 | ✅ Activo |
| **Gemini 2.0 Flash-Exp** | Experimental | 15 | 1,500 | ✅ Activo |
| **Gemini 1.5 Flash / 8B** | Estándar MEN | 15 | 1,500 | ✅ Activo |
| **Gemini 1.5 Pro** | Razonamiento Complejo | 2 | 50 | ✅ Activo |

### 📈 Capacidades de Orquestación Platino v5.0
- **Doble Conexión SDK + REST Nativo:** Soporta llaves tradicionales (`AIzaSy...`) y claves de nuevo formato (`AQ...`) mediante cabeceras HTTP `Authorization: Bearer` y `x-goog-api-key`.
- **Motor Autónomo de Respaldo:** Si la API de Google reporta cuota agotada (`limit 0`), el generador autónomo crea la planeación institucional completa (con 10 ítems ICFES, DUA, CRESE, Momentos ADI y Taller Imprimible) en < 1s sin fallar en pantalla.
- **Concurrencia:** Soporta más de 20 profesores simultáneos mediante rotación multinivel de 3 llaves API (Laura, México, Yarelis).

---
*Institución Educativa Guaimaral &copy; 2026 - Gestión Educativa de Vanguardia.*
