# III. Trinkete Txapelketa

Web en euskera para GitHub Pages y backend en Firebase (Firestore + Cloud Functions).

## Estado de esta entrega

**Versión de prueba, no abrir inscripciones reales todavía.** La web muestra un aviso hasta completar `firebase-config.js`. El backend tiene numeración transaccional y panel privado para confirmar Bizum.

**Pendiente antes de publicar:** configurar Firebase, desplegar Functions y reglas, configurar App Check / controles antiabuso, implementar envío de correos (no incluido), automatizar expiración/promoción (actualmente se hace con botón de administrador), validar política de privacidad con responsable real y realizar pruebas completas. Los usuarios no reciben emails automáticos en esta versión. La promoción manual se hace desde el panel, y no se notifica automáticamente.

## Paso 1. GitHub

1. Crear repositorio público `trinkete-txapelketa` en `jimipage19`.
2. Subir los archivos y carpetas de este ZIP a la raíz del repositorio (no subir el ZIP como único archivo).
3. Settings > Pages > Build and deployment: Deploy from a branch > `main` > `/ (root)` > Save.
4. Esperar a que aparezca `https://jimipage19.github.io/trinkete-txapelketa/`.

## Paso 2. Firebase (cuando se indique)

1. Crear proyecto Firebase; registrar aplicación web y habilitar Authentication > Google, Firestore.
2. Copiar la configuración web a `firebase-config.js`.
3. Instalar Node.js y Firebase CLI; ejecutar `firebase login`, `firebase use --add`, `npm install --prefix functions`, `firebase deploy --only firestore:rules,functions` desde la carpeta raíz.
4. Añadir el dominio GitHub Pages a Authentication > Settings > Authorized domains.
5. Probar con inscripciones ficticias y confirmar el acceso de Iban con su Google.

**Aviso de coste:** el despliegue de Cloud Functions requiere normalmente activar el plan Blaze (facturación) en Firebase. El uso bajo puede entrar en cuotas sin coste, pero no se garantiza coste cero. Configurar presupuestos y alertas.

## Datos y reglas

- Torneo: 12-12-2026.
- 24 plazas; 20 € por pareja.
- Bizum: 638051253, concepto `TRINKETE-XXX`.
- Primeras 24: hasta 30-11-2026 23:59:59 (CET).
- Resto: espera correlativa; si se libera plaza se ofrecen 48 horas.
- Administrador autorizado: vazqueziturriondoiban@gmail.com.

## Seguridad y límites

Firestore no admite lecturas/escrituras directas de clientes; solo las Functions usan Admin SDK. No guardar credenciales ni claves privadas en GitHub. La configuración web Firebase es pública por diseño. El backend debe protegerse contra abuso antes de abrir el formulario. `confirmPayment` exige email de Google verificado. En esta versión las inscripciones pueden duplicarse si alguien envía dos veces el formulario; agregar protección anti-duplicados antes de abrir. La transacción garantiza que no se repita el número.
