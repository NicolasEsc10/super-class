import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Permitir any durante desarrollo
      "@typescript-eslint/no-explicit-any": "warn",
      // Permitir variables no utilizadas durante desarrollo
      "@typescript-eslint/no-unused-vars": "warn",
      // Permitir dependencias faltantes en useEffect durante desarrollo
      "react-hooks/exhaustive-deps": "warn",
      // Permitir elementos <a> para navegación durante desarrollo
      "@next/next/no-html-link-for-pages": "warn",
    },
  },
];

export default eslintConfig;
