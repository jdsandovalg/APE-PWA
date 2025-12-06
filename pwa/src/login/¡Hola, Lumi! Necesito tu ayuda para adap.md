¡Hola, Grok! Necesito tu ayuda para adaptar una página de login para mi proyecto "Autoconsumo de Energía". La aplicación ya está conectada a la misma instancia de Supabase que otro proyecto en el que trabajamos, por lo que las funciones y tablas de usuarios ya existen. No hagas ningun  cambio hasta haber entendido lo requerido, cualquier duda que tengas planteamela y al finalizar presenta un plan paso a paso para que sea autorizado y ejecutado con mi aprobacion.

Estos son los requerimientos detallados:

Objetivo Principal:

Crear el archivo de la página de login en la ruta /src/login/page.tsx.
Lógica de Autenticación:

Estos componentes se usan ya en la pagina:

Antes: Lee la pagina de login y evalua los elementos que contiene para que sepas lo que tiene.

La autenticación se debe realizar llamando a la función RPC de Supabase login_user.
Esta función recibe dos parámetros: p_identifier (que puede ser el número de casa o el correo electrónico) y p_clave (la contraseña del usuario).
Interfaz de Usuario (UI):

El formulario ya existe, modifcar el título "Autoconsumo de Energía".
Existen ya dos campos de entrada: uno para "No. de Casa o Correo" y otro para "Clave de acceso".
El botón para "Iniciar Sesión" funciona corrrecatemente que muestre un estado de carga (loading) mientras se procesa la petición.
Flujo de Usuario Post-Login:

Si el login es exitoso, la función login_user devolverá los datos del usuario. Este objeto de usuario debe guardarse en localStorage bajo la clave 'usuario'.
Inmediatamente después, el usuario debe ser redirigido a la ruta de la pagina principal del proyecto.
Se debe mostrar una notificación de éxito con react-hot-toast (ej. "¡Bienvenido!").
Manejo de Errores:

Si la función RPC devuelve un error o si las credenciales son incorrectas, se debe mostrar una notificación de error clara al usuario usando react-hot-toast.
Simplificaciones (Importante):

A diferencia de la app val-app, esta página de login no necesita soporte multi-idioma. Todos los textos (placeholders, títulos, botones) deben estar directamente en español.
No es necesario mostrar la versión de la aplicación en el pie de página.
Dependencias a Considerar:

El proyecto ya tiene instalado react-hot-toast.
Se debe usar el createClient de @/utils/supabase/client para la conexión.
Por favor, dame el código completo para el archivo /src/app/login/page.tsx siguiendo estas especificaciones.