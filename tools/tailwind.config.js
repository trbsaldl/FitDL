// Configuración de Tailwind (colores de FitDL: marrón y beige)
module.exports = {
  "content": [
    "./index.html",
    "./*.html",
    "./js/**/*.js"
  ],
  "theme": {
    "extend": {
      "colors": {
        "neutral": {
          "50": "#faf7f3",
          "100": "#f2ede6",
          "200": "#e4dcd2",
          "300": "#cfc5b8",
          "400": "#aea396",
          "500": "#9c9084",
          "600": "#6d6359",
          "700": "#463f38",
          "800": "#2a2521",
          "900": "#1a1714",
          "950": "#110f0d"
        },
        "mint": {
          "50": "#1f1a14",
          "100": "#2a2219",
          "200": "#3d3124",
          "300": "#eadcc6",
          "400": "#dcc19c",
          "500": "#c49a6c",
          "600": "#9a6b40",
          "700": "#7a5230",
          "800": "#5c3d24",
          "900": "#2b1d12"
        },
        "roseAccent": {
          "50": "#211a14",
          "100": "#2e241b",
          "200": "#4a3a2c",
          "300": "#6e5741",
          "400": "#cfae8b",
          "500": "#a0714b",
          "600": "#c08a5d",
          "700": "#e0c6a6",
          "800": "#eddcc6"
        },
        // 3.17 · paleta mixta (C): el verde SOLO significa «vas bien» (objetivo cumplido, día entrenado, hecho)
        "ok": {
          "300": "#9fe0bb",
          "400": "#6fcf97",
          "500": "#4fbf80",
          "900": "#0f2a1b"
        },
        "slateDark": {
          "800": "#262626",
          "850": "#1c1a17",
          "900": "#141210",
          "950": "#0a0a0a"
        }
      },
      "fontFamily": {
        "sans": [
          "Plus Jakarta Sans",
          "Inter",
          "sans-serif"
        ],
        "display": [
          "Newsreader",
          "Georgia",
          "serif"
        ],
        "mono": [
          "JetBrains Mono",
          "monospace"
        ]
      }
    }
  },
  "future": {
    "hoverOnlyWhenSupported": true
  }
};
