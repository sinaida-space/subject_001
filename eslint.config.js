import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

// The typography rules for this site require literal U+00A0 non-breaking spaces
// in JSX text (after short prepositions, between number and unit, to kill
// widows). The core no-irregular-whitespace rule flags every one of them and has
// no allowlist, so the rule is swapped for a local copy that skips U+00A0 and
// still reports every other irregular space: zero-width, ideographic, hair,
// BOM, the U+2028/U+2029 line terminators.
const IRREGULAR_WHITESPACE = new RegExp(
  "[" +
    "\\u000B\\u000C" + // vertical tab, form feed
    "\\u0085" + // next line
    "\\u1680\\u180E" + // ogham space mark, mongolian vowel separator
    "\\u2000-\\u200B" + // en/em quads through zero-width space
    "\\u2028\\u2029" + // line separator, paragraph separator
    "\\u202F\\u205F" + // narrow nbsp, medium mathematical space
    "\\u3000" + // ideographic space
    "\\uFEFF" + // zero-width no-break space (BOM)
    "]",
  "gu",
);

const typographyAwareWhitespace = {
  rules: {
    "no-irregular-whitespace-except-nbsp": {
      meta: {
        type: "problem",
        docs: { description: "Disallow irregular whitespace other than U+00A0" },
        schema: [],
        messages: { irregular: "Irregular whitespace not allowed" },
      },
      create(context) {
        return {
          Program() {
            const source = context.sourceCode;
            const text = source.getText();
            IRREGULAR_WHITESPACE.lastIndex = 0;
            let match;
            while ((match = IRREGULAR_WHITESPACE.exec(text)) !== null) {
              context.report({
                loc: {
                  start: source.getLocFromIndex(match.index),
                  end: source.getLocFromIndex(match.index + match[0].length),
                },
                messageId: "irregular",
              });
            }
          },
        };
      },
    },
  },
};

export default tseslint.config(
  // .claude/worktrees holds throwaway agent worktrees checked out *inside* the
  // repo. Without this, eslint walks whatever old revision is sitting there and
  // reports its files as errors in the current source, which made every lint run
  // unreadable and hid real failures.
  { ignores: ["dist", ".claude/worktrees", "**/node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      typography: typographyAwareWhitespace,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-irregular-whitespace": "off",
      "typography/no-irregular-whitespace-except-nbsp": "error",
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
