export default {
  process(sourceText, sourcePath) {
    // Remove any exports = module.exports statements
    const transformedCode = sourceText
      .replace(/exports\s*=\s*module\.exports/g, '// ESM conversion')
      .replace(/module\.exports\s*=/g, 'export default');
    
    return {
      code: transformedCode,
    };
  },
};
