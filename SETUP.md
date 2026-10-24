# Portfolio Setup Guide

## Quick Start

1. **Configure API Keys**
   - Copy `config.js` to keep your keys safe (already gitignored)
   - Get your API keys from the services below
   - Update `config.js` with your actual keys

2. **Get API Keys**

   ### EmailJS (Contact Form)
   - Sign up at https://www.emailjs.com/
   - Create a new Email Service
   - Create an Email Template
   - Copy your Public Key, Service ID, and Template ID to `config.js`

   ### Google Gemini (AI Chat Agent)
   - Get your API key at https://aistudio.google.com/app/apikey
   - Copy it to `config.js` under `GEMINI_API_KEY`

3. **Update Domain References**
   - Confirm `https://rohanpedada.com/` is the production domain used in `portfolio.html`, `robots.txt`, and `sitemap.xml`
   - Update social media links with your actual profiles

4. **Deploy**
   - Push to your hosting platform (Netlify, Vercel, GitHub Pages, etc.)
   - Make sure `config.js` is NOT committed to version control

## File Structure

```
Portfolio/
├── portfolio.html      # Main HTML file
├── portfolio.css       # Main styles
├── portfolio.js        # Main JavaScript
├── agent-chat.css      # AI Chat widget styles
├── agent-chat.js       # AI Chat widget logic
├── config.js           # API Keys (DO NOT COMMIT - gitignored)
├── portfolio-data.json # Portfolio content data
├── .gitignore          # Git ignore rules
├── SETUP.md            # This file
└── [assets]            # Images, logos, resume, etc.
```

## Security Notes

- `config.js` is in `.gitignore` - never commit it
- For production, consider using environment variables
- The AI chat agent runs client-side - API calls are visible in network tab
- Consider adding rate limiting for the chat agent in production

## Accessibility Features

- Skip to content link
- Proper ARIA labels and roles
- Focus states for keyboard navigation
- Reduced motion support
- Semantic HTML structure
- Alt text on all images

## SEO Features

- Meta description
- Open Graph tags
- Twitter Card tags
- JSON-LD structured data
- Canonical URL
- Proper heading hierarchy

## Customization

### Update Personal Info
Edit `portfolio-data.json` for:
- About section
- Skills
- Services
- Projects
- Education
- Contact info

The LOCAL_PORTFOLIO_DATA object in agent-chat.js is a fallback if hosting cannot serve the JSON file. Keep it synchronized when updating portfolio-data.json.

### Update Social Links
Edit `portfolio.html`:
- LinkedIn URL
- GitHub URL
- Twitter/X URL
- Instagram URL

### Styling
Edit `portfolio.css`:
- `:root` variables for colors
- Animation speeds
- Spacing and layout
