const { chromium } = require("playwright");
const fs = require("fs/promises");
const path = require("path");

const URL =
  "https://us-store.msi.com/Motherboards/Intel-Platform-Motherboard/INTEL-Z890/MAG-Z890-TOMAHAWK-WIFI";

const OUTPUT_DIR = "inspect-output";

(async () => {
  const browser = await chromium.launch({
    headless: false,
  });

  const page = await browser.newPage({
    viewport: {
      width: 1600,
      height: 1200,
    },
  });

  console.log("Opening page...");

  await page.goto(URL, {
    waitUntil: "networkidle",
  });

  await page.waitForTimeout(3000);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  //------------------------------------------------------------
  // Save HTML
  //------------------------------------------------------------

  await fs.writeFile(
    path.join(OUTPUT_DIR, "page.html"),
    await page.content(),
    "utf8",
  );

  //------------------------------------------------------------
  // Collect everything
  //------------------------------------------------------------

  const report = await page.evaluate(() => {
    function text(el) {
      return el?.textContent?.replace(/\s+/g, " ").trim() || "";
    }

    function attrs(el) {
      return {
        tag: el.tagName,
        id: el.id || null,
        class: el.className || null,
      };
    }

    //----------------------------------------------------------

    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(
      (e) => ({
        level: e.tagName,
        text: text(e),
        ...attrs(e),
      }),
    );

    //----------------------------------------------------------

    const images = [...document.images].map((img) => ({
      src: img.src,
      alt: img.alt,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }));

    //----------------------------------------------------------

    const links = [...document.links].map((a) => ({
      text: text(a),
      href: a.href,
    }));

    //----------------------------------------------------------

    const tables = [...document.querySelectorAll("table")].map(
      (table, index) => ({
        index,
        text: text(table),
      }),
    );

    //----------------------------------------------------------

    const lists = [...document.querySelectorAll("ul,ol")].map(
      (list, index) => ({
        index,
        items: [...list.querySelectorAll("li")].map((li) => text(li)),
      }),
    );

    //----------------------------------------------------------

    const definitions = [...document.querySelectorAll("dl")].map(
      (dl, index) => ({
        index,
        entries: [...dl.querySelectorAll("dt")].map((dt) => ({
          name: text(dt),
          value: text(dt.nextElementSibling),
        })),
      }),
    );

    //----------------------------------------------------------

    const interestingWords = [
      "price",
      "product",
      "spec",
      "stock",
      "avail",
      "gallery",
      "image",
      "breadcrumb",
      "rating",
      "review",
      "brand",
      "sku",
    ];

    const interesting = [];

    document.querySelectorAll("*").forEach((el) => {
      const key = `${el.id} ${el.className}`.toLowerCase();

      if (interestingWords.some((word) => key.includes(word))) {
        interesting.push({
          tag: el.tagName,
          id: el.id || null,
          class: el.className || null,
          text: text(el).slice(0, 300),
        });
      }
    });

    //----------------------------------------------------------

    return {
      title: document.title,

      url: location.href,

      headings,

      images,

      links,

      tables,

      lists,

      definitions,

      interesting,
    };
  });

  //------------------------------------------------------------

  await fs.writeFile(
    path.join(OUTPUT_DIR, "report.json"),
    JSON.stringify(report, null, 2),
    "utf8",
  );

  //------------------------------------------------------------

  console.log("====================================");
  console.log("Inspection finished");
  console.log("====================================");

  console.log("Title:", report.title);
  console.log("Headings:", report.headings.length);
  console.log("Images:", report.images.length);
  console.log("Links:", report.links.length);
  console.log("Tables:", report.tables.length);
  console.log("Lists:", report.lists.length);
  console.log("Definitions:", report.definitions.length);
  console.log("Interesting elements:", report.interesting.length);

  console.log("\nOutput folder:", OUTPUT_DIR);

  await browser.close();
})();
