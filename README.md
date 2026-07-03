````markdown
# Junior JavaScript Scraper Test Task

## Goal

Build a small production‑style scraper for one MSI product detail page.

- **Estimated time:** 2–3 hours
- **Stack:** Node.js, JavaScript, Playwright
- **Deliverable:** Public GitHub repository with source code, package.json, and sample JSON output

---

## Target Page

Scrape the following product detail page:  
[MSI MAG Z890 TOMAHAWK WIFI](https://us-store.msi.com/Motherboards/Intel-Platform-Motherboard/INTEL-Z890/MAG-Z890-TOMAHAWK-WIFI)

---

## Requirements

- Use Playwright with JavaScript (TypeScript optional).
- Open the product page, wait for required content, and extract product data.
- Use robust selectors or data extraction logic.
- Normalize prices to numbers (e.g., `$299.99` → `299.99`).
- Normalize missing fields as `null`, empty arrays only for list fields.
- Save result to `output/product.json`.
- Do not hardcode product data (URL may be constant).
- Do not commit `node_modules`, browser binaries, secrets, or local env files.

---

## Expected Schema

```json
{
  "url": "string",
  "item_id": "string | null",
  "title": "string | null",
  "brand": "string | null",
  "product_category": "string | null",
  "category_tree": [{ "name": "string", "url": "string | null" }],
  "description": "string | null",
  "price": "number | null",
  "sale_price": "number | null",
  "availability": "in_stock | out_of_stock | pre_order | null",
  "image_url": "string | null",
  "additional_image_urls": ["string"],
  "specs": [{ "name": "string", "value": "string | null" }],
  "star_rating": "number | null",
  "review_count": "number | null",
  "gtin": "string | null",
  "mpn": "string | null",
  "scraped_at": "ISO 8601 datetime string"
}
```
````

---

## Project Structure

```
msi-product-scraper/
  package.json
  src/
    scrape.js
  output/
    product.json
```

---

## Example CLI Behavior

```bash
npm install
npx playwright install chromium
npm run scrape
```

After running, `output/product.json` should be created or overwritten.

---

## Acceptance Criteria

- Project runs successfully from clean install.
- Scraper uses Playwright in headless mode.
- Output is valid JSON matching schema.
- At least: title, brand, price/sale_price, availability, image_url, and several specs are extracted.
- Code is readable, split into helper functions, with basic error handling.
- Implementation avoids unnecessary complexity, fits 2–3 hour timebox.

---

## Evaluation Focus

- **Page analysis:** Can you inspect DOM and page behavior?
- **Selector quality:** Stable and understandable selectors.
- **Data normalization:** Prices, empty values, arrays, strings normalized.
- **Code quality:** Easy to read, run, maintain.
- **Practical judgment:** Solved without over‑engineering.

---

## Submission

1. Create a public GitHub repository.
2. Make it accessible without permission requests.
3. Commit full solution: source code, package.json, output/product.json.
4. Share repository link with recruiter/hiring team.

---

## Notes

- CSS selectors, XPath, or page scripts may be used.
- Inspect network requests if useful structured data is exposed.
- If a field is not available, set it to `null`.
- Keep solution focused on this single product page.

```

---
```
