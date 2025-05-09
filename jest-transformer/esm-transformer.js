export default {
  process(sourceText, sourcePath) {
    return {
      code: sourceText
        .replace(/export default/g, 'module.exports =')
        .replace(/export /g, '')
        .replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require("$2")')
        .replace(/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"]([^'"]+)['"]/g, (_, imports, path) => {
          const importStatements = imports
            .split(',')
            .map(i => i.trim())
            .map(i => `const ${i} = require("${path}").${i};`)
            .join('\n');
          return importStatements;
        }),
    };
  },
};
