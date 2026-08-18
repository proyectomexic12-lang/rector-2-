// TEST: Verificar persistencia de sesión
// Abre la consola del navegador (F12) y pega este código:

// 1. Ver qué hay guardado actualmente
console.log("=== ESTADO DE SESIÓN ===");
console.log("AUTH:", localStorage.getItem('guaimaral_auth_v2'));
console.log("USER:", localStorage.getItem('guaimaral_user_v2'));

// 2. Verificar si isAuthenticated() funciona
// (Copia la función deobfuscate del authService.ts primero)

// 3. Si ves valores, la sesión SÍ se está guardando
// Si NO ves valores, el login no está guardando correctamente
