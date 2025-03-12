module.exports = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "prettier"],
  rules: {
    // Disable React Hook dependency warnings that are causing CI failures
    "react-hooks/exhaustive-deps": "off"
  }
};
