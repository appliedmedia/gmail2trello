# {{product_name}}

> {{site_tagline}}

Website: [{{site_url}}]({{site_url}})

## About

This repository contains the deployed website for {{product_name}}.

**This is a deployment target only.** All source files live in [appliedmedia/internal](https://github.com/appliedmedia/internal).

## How Updates Work

1. Edit templates in `appliedmedia/internal/templates/landing-page/`
2. Edit site config in `appliedmedia/internal/templates/landing-page/site-configs/{{site_domain}}.yaml`
3. Run "Sync Template to Sites" workflow in internal repo
4. Changes are pushed here automatically

## Files

- `index.html` — Landing page (generated from template)
- `css/` — Stylesheets (shared across sites)
- `assets/` — Logos and brand assets
- `images/` — Badges and images
- `CNAME` — Custom domain configuration

---

🇺🇸 Made in the USA by [Applied Media](https://github.com/appliedmedia)
