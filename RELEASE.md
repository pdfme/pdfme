npm version x.x.x --workspaces  
git add .  
git commit -m "Update version to x.x.x"  
npm run build  
npm publish --workspaces  
git tag x.x.x  
git push origin x.x.x  