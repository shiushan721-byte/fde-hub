<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# HelloMe FDE Hub

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/e2134232-9713-4bf3-a487-41a8cd2a0645

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the web app and API:
   `npm run dev:all`

## Production and SEO

The public site must be served by the Express process (not by uploading `dist/`
to static hosting on its own). Express renders crawlable HTML and page-specific
metadata for:

- `/`
- `/agents` and `/agent/:id`
- `/experts` and `/expert/:id`
- `/inspirations` and `/inspiration/:id`
- `/robots.txt`
- `/sitemap.xml`

Build and start:

```bash
npm run build
npm start
```

Set `SITE_URL=https://www.hellome.art` in production. After adding the site to
Baidu Search Resource Platform, put its verification value in
`BAIDU_SITE_VERIFICATION` and submit `https://www.hellome.art/sitemap.xml`.
