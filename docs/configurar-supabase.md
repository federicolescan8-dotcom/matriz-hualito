# Configurar Supabase

La app funciona sin base de datos (modo local: las marcas quedan en el navegador). Con Supabase las marcas se comparten
con el equipo, cada persona entra con su email y solo ve las marcas de su organización.

## 1. Crear el proyecto

1. Entrá a <https://supabase.com>, creá una cuenta y un proyecto nuevo (plan gratuito). Región sugerida: São Paulo.
2. Guardá la contraseña de la base que te pide; la app no la necesita.

## 2. Crear las tablas

1. En el proyecto: **SQL Editor → New query**.
2. Pegá el contenido completo de `supabase/schema.sql` y tocá **Run**.
3. Al final del archivo está el alta de la agencia y de tu email como miembro. Para sumar a otra persona del equipo,
   corré en el SQL Editor:

   ```sql
   insert into miembros (email, organizacion_id) values ('persona@ejemplo.com', 'hualito');
   ```

## 3. Configurar el ingreso por email

1. **Authentication → Sign In / Providers → Email**: dejalo habilitado.
2. **Authentication → Sign In / Providers**: desactivá **Allow new users to sign up**. Así solo entra quien des de alta.
3. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000`
   - Redirect URLs: agregá `http://localhost:3000/**` (y `http://localhost:3001/**` si a veces usás ese puerto).
4. **Authentication → Users → Add user → Send invitation** con tu email (y el de cada persona del equipo).

## 4. Conectar la app

1. **Project Settings → API**: copiá **Project URL** y la clave **anon public**.
   No uses la clave `service_role`: esa es secreta y la app no la necesita.
2. Abrí `app/.env.local` y completá:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

3. Reiniciá el servidor (Ctrl+C en la terminal y `npm.cmd run dev` desde `C:\Matriz Hualito\app`).

## 5. Primer ingreso

1. Abrí la app: te va a pedir el email y te manda un enlace. Abrilo desde el mismo navegador.
2. En **Marcas**, si tenías marcas guardadas en ese navegador, aparece **Subirlas a la base**.

## Notas

- `app/.env.local` está en `.gitignore`: las claves no se suben al repositorio.
- La clave `anon` es pública por diseño; lo que protege los datos son las reglas RLS del esquema.
- Por ahora los logos van dentro del registro de la marca. Cuando haya muchas marcas conviene moverlos a Supabase
  Storage.
