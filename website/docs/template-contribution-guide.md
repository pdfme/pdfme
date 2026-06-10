# Template Contribution Guide ❤️

Add your template to pdfme's Example Templates!  
**The [playground template gallery](https://playground.pdfme.com/) is one of the most important entry points for pdfme, created to help new users find templates that match their requirements and save time.**

By adding your template, you can contribute to the pdfme community.  
We use GitHub pull requests for template additions - usually this only requires template files and metadata.

Even if you're new to OSS contributions, you can easily contribute by following this guide.

## Template Addition Steps

### 1. Create Your Template
Design your template in the [playground Designer](https://playground.pdfme.com/designer), then download `template.json` using the `Template JSON` button

### 2. Prepare Repository
1. **[Create Fork]**  
   Click the `Fork` button at the top-right of [pdfme repository](https://github.com/pdfme/pdfme) to copy to your GitHub account
   
2. **[Clone Locally]**  
   Run in terminal (replace `YOUR-GITHUB-USERNAME` with your GitHub username):
   ```bash
   git clone git@github.com:YOUR-GITHUB-USERNAME/pdfme.git
   cd pdfme
   ```

3. **[Create Branch]**  
   Create new branch (example using template name `my-new-template`):
   ```bash
   git checkout -b add-my-new-template
   ```

### 3. Add Template Files
1. **[Create Directory]**  
   Create new directory in kebab-case (e.g. `my-new-template`):
   ```bash
   mkdir -p playground/public/template-assets/my-new-template
   ```
   - Directory name will appear as `My New Template` in the [playground template gallery](https://playground.pdfme.com/)

2. **[Place Files]**  
   Place downloaded `template.json` in the new directory  
   (Optional) Add `author` field for credit:
   ```json
   {
     "author": "YOUR-GITHUB-USERNAME",
     "basePdf": ...
   }
   ```

3. **[Add Metadata]**
   Add `metadata.json` in the same directory. This metadata is used by the template gallery filters and cards.
   ```json
   {
     "description": "A short description of what this template is useful for.",
     "tags": ["Invoice", "Business"]
   }
   ```

   Optional fields:
   - `title`: display title. If omitted, the directory name is converted from kebab-case.
   - `order`: gallery sort order for featured templates. Most contributions can omit this.
   - `tags`: short filter labels such as `Invoice`, `Business`, `CJK`, `Form`, or `Table`.

Reference: https://github.com/pdfme/pdfme/tree/main/playground/public/template-assets/invoice

4. **[Regenerate Gallery Metadata]**
   Run:
   ```bash
   npm --prefix playground run generate-template-assets
   ```

   This updates the generated template index used by the playground.

### 4. Commit Changes
1. **[Record Changes]**  
   Run in terminal:
   ```bash
   git add .
   git commit -m "feat: Add My New Template"
   ```

2. **[Push to GitHub]**  
   Push to your repository:
   ```bash
   git push origin add-my-new-template
   ```

### 5. Create Pull Request
1. **Create PR on GitHub**  
   Go to your repository page → `Pull requests` → `New pull request`

2. **Select Branches**  
   - `base repository`: pdfme/pdfme (main branch)
   - `head repository`: YOUR-GITHUB-USERNAME/pdfme (add-my-new-template branch)

3. **Enter Information**  
   - Title: `Add [My New Template] template`
   - Include brief description of template features and use cases

4. **Submit PR**  
   Click `Create pull request` to complete!

### 6. Await Merge
After maintainer review, your template will be merged and listed officially 🎉  
(If modifications needed, you'll receive comments on GitHub)

**Thank you! Your contribution makes a big impact on pdfme's community 🚀**

## Need Help?

If you have questions, ask with screenshots in [Discord #template-contribution](https://discord.gg/awct6DMZSf) for smooth support!
