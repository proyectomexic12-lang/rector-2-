# REGLAS Y DIRECTRICES DEL PROYECTO

## 1. EXCLUSIVIDAD INSTITUCIONAL
- Este aplicativo es **exclusiva y únicamente para la INSTITUCIÓN EDUCATIVA GUAIMARAL**.
- **PROHIBIDO TERMINANTEMENTE** subir, reactivar o desplegar características SaaS o multi-institución (otros colegios, selectores de entidad, multi-tenancy) sin una orden explícita y directa del usuario autorizándolo expresamente.
- Todo desarrollo debe priorizar la estabilidad, simplicidad y flujo normal de trabajo de los 24 docentes y directivos de la I.E. Guaimaral.

## 2. FLUJO DE AUTENTICACIÓN Y SESIÓN
- El login debe ser siempre directo (correo institucional y contraseña) para la I.E. Guaimaral.
- No alterar las claves de almacenamiento de sesión de los docentes (`guaimaral_auth_v2`, `guaimaral_user_v2`) para no cerrar sus sesiones activas.

## 3. RADICACIÓN Y ENVÍO DE PLANEACIONES
- Mantener siempre activa la doble vía de radicación (intento al servidor receptor SIGEP con respaldo automático directo e infalible a Supabase).
- Ningún docente debe quedar bloqueado por validaciones de áreas o grados no encontrados (soportar siempre multigrado e integral con carga de perfil).
