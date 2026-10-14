# Perfilador

Módulo externo de Matriz Hualito. Toma capturas reales de una empresa que ya existe pero no tiene su identidad
definida y escribe `perfil-<slug>.json`. Ese archivo se carga en la app con **Marcas → Importar perfil** y entra como
una marca en rescate (E11), en estado "En diagnóstico", para que el diseñador la revise.

## Qué hace cada parte

- **Colores (medidos).** `color.ts` muestrea cada imagen igual que la app (lado mayor de 72 px) y usa
  `extraerColores` y `gruposDeReferencias` del motor. Así lo que mide el perfilador coincide con la auditoría de rescate.
- **Interpretación (Claude con visión).** `prompt.ts` arma el pedido con los rubros, los ejes, las familias y los grados
  de cambio tomados del motor. El modelo devuelve rubro, ejes, tono, contenido, público, grado y la evidencia de cada
  decisión. El color previo lo elige entre los colores medidos: no puede inventar uno.
- **Validación.** `validarPerfil` (`app/src/engine/perfil.ts`) revisa enums y rangos. Si la respuesta no pasa, se
  reintenta una vez pasándole los errores al modelo.
- **La paleta no viene en el JSON.** Al importarlo, la app la arma con `construirMarca`, así que sale de las reglas del
  manual y no del modelo.

## Uso

```bash
npm install
cp .env.example .env      # completar ANTHROPIC_API_KEY (o usar `ant auth login`)
npm run perfilar -- <carpeta> --nombre "Barocca Tortuguitas" --usuario baroccatortuguitas
```

En Windows usar `npm.cmd`.

- `<carpeta>`: imágenes `.png`, `.jpg` o `.webp`. Si una se llama `logo.*`, se toma como el logo (o indicarlo con
  `--logo archivo.png`).
- `--salida <carpeta>`: dónde escribir; por defecto `<carpeta>/salida/`. El logo se copia al lado del JSON.
- `--solo-color`: mide e imprime los colores candidatos, sin llamar a la API.
- `PERFILADOR_MODELO` en `.env` cambia el modelo (por defecto `claude-opus-5-5`).

Para importarlo, en **Marcas → Importar perfil** elegí juntos el `.json` y el logo. El mismo botón acepta una marca
exportada con "Exportar JSON".

## Qué capturas subir

Las piezas sueltas dan mejores colores que una sola captura del feed entero, porque el promedio de una grilla mezcla
todo y da tonos barrosos. Lo ideal:

1. El logo en buena resolución (PNG con transparencia o SVG).
2. Una captura del perfil, con la bio y los destacados.
3. De 6 a 12 publicaciones sueltas que representen lo que la marca publica.

## Límites

- Solo trabaja con material subido a mano. No hace scraping de Instagram, que va contra los términos de Meta.
- No detecta la tipografía exacta: la describe en la evidencia y solo la fija si es una familia del catálogo.
- `extraerColores` ignora los casi negros y los casi blancos, como en la app. Un logo negro sobre blanco aporta poco
  color medido, y el diseñador lo completa en el diagnóstico.
- La carpeta `salida/` no se versiona porque trae material de terceros. Solo se versiona el ejemplo de `ejemplos/`, que
  además es el fixture de los tests del validador.
