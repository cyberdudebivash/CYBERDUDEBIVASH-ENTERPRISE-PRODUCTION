import { titanEslintConfig } from "./packages/config/eslint.base.mjs";

export default titanEslintConfig({ tsconfigRootDir: import.meta.dirname });
