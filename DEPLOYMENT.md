# Deployment Guide for Food Planning App

This guide will walk you through deploying the Food Planning App to Cloudflare Pages and Cloudflare Functions.

## Prerequisites

1. A [Cloudflare account](https://dash.cloudflare.com/sign-up)
2. [Node.js](https://nodejs.org/) installed (version 16+)
3. [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/) installed
4. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed
   ```bash
   npm install -g wrangler
   ```
5. Git repository for your project

## Step 1: Prepare Your Project

Make sure your project is ready for deployment:

1. Run tests to ensure everything works correctly:
   ```bash
   npm run test
   ```

2. Build the project locally to check for any build errors:
   ```bash
   npm run build
   ```

3. Create a `.env.production` file with the necessary environment variables (excluding any secrets)

## Step 2: Configure Cloudflare Pages

1. Log in to Wrangler CLI:
   ```bash
   wrangler login
   ```

2. Connect your Git repository to Cloudflare Pages:
   - Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to "Pages"
   - Click "Create a project"
   - Select "Connect to Git"
   - Select your repository and follow the on-screen instructions

3. Configure the build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - Add environment variables if needed

## Step 3: Deploy Cloudflare Functions

1. Deploy the functions to Cloudflare:
   ```bash
   wrangler deploy
   ```

   This will deploy your Workers functions according to the configuration in `wrangler.toml`.

2. Verify your functions are deployed:
   - Go to the Cloudflare Dashboard
   - Navigate to "Workers & Pages"
   - You should see your functions listed

## Step 4: Set Up Custom Domain (Optional)

1. In the Cloudflare Dashboard, navigate to your Pages project
2. Go to the "Custom domains" section
3. Click "Set up a custom domain"
4. Follow the instructions to add and verify your domain

## Step 5: Configure Environment Variables

1. In the Cloudflare Dashboard, navigate to your Pages project
2. Go to the "Settings" tab and then "Environment variables"
3. Add any required environment variables:
   - For production environment:
     - ENVIRONMENT = "production"
     - Add any other required variables

   > ⚠️ **Important**: Never store API keys, secrets, or sensitive data in your code or public repositories. Always use environment variables for sensitive information.

## Step 6: Set Up Continuous Deployment

Cloudflare Pages will automatically deploy new versions when you push changes to your main branch. If you want to set up additional deployment workflows:

1. Create a `.github/workflows/deploy.yml` file for GitHub Actions, or use the CI/CD tools of your Git provider
2. Configure the workflow to run tests and deploy to Cloudflare

## Step 7: Verify Deployment

1. Visit your Cloudflare Pages URL (or your custom domain if configured)
2. Test all the main features to ensure they work correctly:
   - Creating and viewing foods
   - Creating and viewing recipes
   - Creating and viewing menus
   - Generating and using shopping lists from menus
   - Testing checkable shopping list functionality
   - Dark mode toggling
   - View transitions between related content
   - Offline functionality
   - Sync functionality (if implemented)

## Troubleshooting

### Build Failures

- Check the build logs in Cloudflare Dashboard
- Ensure all dependencies are properly listed in `package.json`
- Verify that the build command and output directory are correctly configured

### Function Errors

- Check the Worker logs in Cloudflare Dashboard
- Verify that your functions are properly configured in `wrangler.toml`
- Test your functions locally using `wrangler dev` before deploying

### Database Issues

- Ensure your PouchDB is properly configured for production
- If using remote sync, verify that your CouchDB or compatible database is accessible

## Maintenance

### Updating Your Deployment

1. Push changes to your repository
2. Cloudflare Pages will automatically rebuild and deploy your site

### Monitoring

- Monitor your application performance using Cloudflare Analytics
- Set up alerts for any critical errors or performance issues

## Security Considerations

- Regularly update dependencies to patch security vulnerabilities
- Use proper authentication and authorization for any admin or sensitive features
- Secure any API endpoints with appropriate access controls
- Never expose sensitive information in the frontend code

## Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [PouchDB Documentation](https://pouchdb.com/guides/)