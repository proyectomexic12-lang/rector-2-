# REGLAS Y DIRECTRICES DEL PROYECTO

## 1. EXCLUSIVIDAD INSTITUCIONAL Y REGLA DE SAAS
- Este aplicativo en producción y en la rama principal (`main`) es **exclusiva y únicamente para la INSTITUCIÓN EDUCATIVA GUAIMARAL**.
- **DESARROLLO DE SAAS SOLO EN LOCAL:** Cualquier prueba o funcionalidad de SaaS multi-colegio debe mantenerse estrictamente en entorno local o en rama aislada.
- **PROHIBIDO SUBIR SAAS A GIT/PRODUCCIÓN:** Cuando se trabaje o suban cambios a la rama principal (`main`), jamás se debe subir nada de SaaS. Queda totalmente restringido a menos que el usuario dé la orden con la frase exacta: **"sube saas"**. Si el usuario no dice esa frase explícitamente, **NO se sube**.
- Todo desarrollo que se suba debe priorizar la estabilidad, simplicidad y flujo normal de trabajo de los 24 docentes y directivos de la I.E. Guaimaral.

## 2. FLUJO DE AUTENTICACIÓN Y SESIÓN
- El login debe ser siempre directo (correo institucional y contraseña) para la I.E. Guaimaral.
- No alterar las claves de almacenamiento de sesión de los docentes (`guaimaral_auth_v2`, `guaimaral_user_v2`) para no cerrar sus sesiones activas.

## 3. RADICACIÓN Y ENVÍO DE PLANEACIONES
- Mantener siempre activa la doble vía de radicación (intento al servidor receptor SIGEP con respaldo automático directo e infalible a Supabase).
- Ningún docente debe quedar bloqueado por validaciones de áreas o grados no encontrados (soportar siempre multigrado e integral con carga de perfil).
