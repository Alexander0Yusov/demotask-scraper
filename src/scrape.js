const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

// --- Вспомогательные функции ---
function parsePrice(text) {
  if (!text) return null;
  const match = text.match(/[\d,]+\.\d+/);
  if (match) {
    return parseFloat(match[0].replace(/,/g, ""));
  }
  return null;
}

function normalizeAvailability(text) {
  if (!text) return null;
  const lowerText = text.trim().toLowerCase();
  if (lowerText.includes("in stock")) return "in_stock";
  if (lowerText.includes("out of stock")) return "out_of_stock";
  if (lowerText.includes("pre order") || lowerText.includes("pre-order"))
    return "pre_order";
  return null;
}

// --- Основной скрипт (IIFE) ---
(async () => {
  let browser;
  try {
    console.log("Запуск браузера...");
    // headless: true для продакшена. Можно временно переключить в false для визуальной отладки

    try {
      browser = await chromium.launch({
        channel: "chrome",
        headless: true,
      });

      console.log("Using Google Chrome");
    } catch {
      browser = await chromium.launch({
        headless: true,
      });

      console.log("Using Playwright Chromium");
    }

    // Создаем контекст со стандартным User-Agent, чтобы минимизировать шанс блокировки Cloudflare
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    const targetUrl =
      "https://us-store.msi.com/Motherboards/Intel-Platform-Motherboard/INTEL-Z890/MAG-Z890-TOMAHAWK-WIFI";
    console.log(`Переход по адресу ${targetUrl}...`);

    // domcontentloaded гораздо быстрее и надежнее на тяжелых сайтах, чем networkidle
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    // Выводим title для проверки: если там Cloudflare ("Just a moment..."), мы сразу это увидим
    const pageTitle = await page.title();
    console.log(`Заголовок загруженной страницы: "${pageTitle}"`);

    // Ждем, пока заголовок появится в DOM (не обязательно ждать его полной видимости/отрисовки)
    console.log("Ожидание элемента заголовка в DOM...");
    await page.waitForSelector("h2.crop-text-2.title", {
      state: "attached",
      timeout: 15000,
    });

    console.log("Извлечение данных...");

    // 1. Базовая информация
    const url = page.url();
    const titleText = await page.locator("h2.crop-text-2.title").textContent();
    const title = titleText ? titleText.trim() : null;
    const brand = "MSI";

    // 2. Цена и наличие (метод вроде как устарел, но пока работает)
    const priceText = await page
      .$eval("#prices-new", (el) => el.textContent)
      .catch(() => null);
    const price = parsePrice(priceText);

    const availabilityText = await page
      .evaluate(() => {
        const wrapper = document.querySelector("#prices-wrapper");
        if (!wrapper) return null;
        const spans = wrapper.querySelectorAll("span");
        if (spans && spans.length >= 2) {
          return spans[1].textContent;
        }
        return null;
      })
      .catch(() => null);
    const availability = normalizeAvailability(availabilityText);

    // 3. Хлебные крошки (Категории)
    const breadcrumbs = await page
      .$$eval(".breadcrumb .breadcrumb-item", (items) => {
        return items
          .map((item) => {
            const link = item.querySelector("a");
            return {
              name: item.textContent.trim().replace(/\s+/g, " "),
              url: link ? link.href : null,
            };
          })
          .filter((item) => item.name.length > 0);
      })
      .catch(() => []);

    // Отрезаем первый элемент (Home) и последний (сам товар)
    const categoryItems = breadcrumbs.slice(1, -1);
    const product_category =
      categoryItems.map((b) => b.name).join(" > ") || null;
    const category_tree = categoryItems.length > 0 ? categoryItems : [];

    // 4. Изображения
    const image_url = await page
      .$eval("#imagePopup", (el) => el.src)
      .catch(() => null);

    let additional_image_urls = await page
      .$$eval("img.product-detail-thumb-bto", (imgs) => {
        return imgs
          .map((img) => img.getAttribute("popup_img") || img.src)
          .filter(Boolean);
      })
      .catch(() => []);

    // Удаляем дубликаты и исключаем главное изображение
    additional_image_urls = [...new Set(additional_image_urls)];
    if (image_url) {
      additional_image_urls = additional_image_urls.filter(
        (url) => url !== image_url,
      );
    }

    // 5. Характеристики
    let specs = await page
      .$$eval("table.table tr", (rows) => {
        return rows
          .map((row) => {
            const th = row.querySelector("th");
            const td = row.querySelector("td");
            if (th && td) {
              return {
                name: th.textContent.trim(),
                value: td.textContent.trim(),
              };
            }
            return null;
          })
          .filter(Boolean);
      })
      .catch(() => []);

    // 6. Извлечение MPN и очистка от него массива характеристик
    let mpn = null;
    const mpnIndex = specs.findIndex((s) => s.name === "Manufacturer Number");
    if (mpnIndex !== -1) {
      mpn = specs[mpnIndex].value;
      specs.splice(mpnIndex, 1); // удаляем, чтобы избежать дублирования данных
    }

    // 7. Сборка итогового объекта
    const productData = {
      url,
      item_id: null,
      title,
      brand,
      product_category,
      category_tree,
      description: null, // Оставляем null, если нет 100% надежного селектора для маркетингового блока
      price,
      sale_price: null,
      availability,
      image_url,
      additional_image_urls,
      specs,
      star_rating: null,
      review_count: null,
      gtin: null,
      mpn,
      scraped_at: new Date().toISOString(),
    };

    // 8. Сохранение в файл
    const outputDir = path.join(__dirname, "..", "output");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, "product.json");
    fs.writeFileSync(outputPath, JSON.stringify(productData, null, 2), "utf8");

    console.log(`Успех! Данные сохранены в ${outputPath}`);
  } catch (error) {
    console.error("Произошла ошибка во время парсинга:", error);
  } finally {
    if (browser) {
      console.log("Закрытие браузера...");
      await browser.close();
    }
  }
})();
