import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";

export default [
    {
        ignores: [".next/*", "node_modules/*", "public/*"],
    },
    js.configs.recommended,
    {
        files: ["**/*.{js,jsx,ts,tsx}"],
        plugins: {
            "react": reactPlugin,
            "react-hooks": hooksPlugin,
            "@next/next": nextPlugin,
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                window: "readonly",
                document: "readonly",
                localStorage: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                crypto: "readonly",
                process: "readonly",
                NodeJS: "readonly"
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...hooksPlugin.configs.recommended.rules,
            ...nextPlugin.configs.recommended.rules,
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "@next/next/no-img-element": "warn",
            "react/no-unescaped-entities": "off",
            "no-unused-vars": "warn",
            "no-undef": "error"
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
];
