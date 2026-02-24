import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";
import globals from "globals";

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
                ...globals.browser,
                ...globals.node,
                NodeJS: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                Buffer: "readonly"
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...hooksPlugin.configs.recommended.rules,
            // Only include the Next.js rules we care about, as warnings
            // Avoid spreading recommended which includes React Compiler rules as errors
            "@next/next/no-html-link-for-pages": "warn",
            "@next/next/no-img-element": "warn",
            "@next/next/no-sync-scripts": "warn",
            "@next/next/no-head-element": "warn",
            "react/react-in-jsx-scope": "off",
            "react/prop-types": "off",
            "react/no-unescaped-entities": "off",
            // Three.js / R3F uses custom JSX props not in the HTML spec
            "react/no-unknown-property": "off",
            // Inline comments in JSX are a common linting false-positive
            "react/jsx-no-comment-textnodes": "warn",
            // Empty catch blocks are sometimes intentional
            "no-empty": "warn",
            "no-unused-vars": ["warn", {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_"
            }],
            // Downgrade to warn: globals config handles browser/node envs
            "no-undef": "warn",
            // Disable experimental React Compiler rules from hooks-plugin v5+
            // These fire false positives on valid R3F and game hook patterns
            "react-hooks/purity": "off",
            "react-hooks/refs": "off",
            "react-hooks/set-state-in-effect": "off"
        },
        settings: {
            react: {
                version: "detect",
            },
        },
    },
];
