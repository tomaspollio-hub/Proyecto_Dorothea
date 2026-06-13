// Ejecutar con: pnpm seed:local
// Crea el usuario admin inicial para desarrollo

export const defaultAdmin = {
  email: 'admin@dorothea.com.ar',
  name: 'Administrador',
  role: 'admin' as const,
  // Contraseña: dorothea2024 (cambiar en producción)
  // Hash generado con PBKDF2-SHA256, 100k iteraciones
  passwordPlain: 'dorothea2024',
}
