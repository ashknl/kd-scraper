import { TimeoutError } from "puppeteer";
import puppeteer from "puppeteer-extra";


let scrapeKeywords = async (searchKeyword) => {
    const KeywordsEverywhereDir = "./keywordsEverywhere"
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--disable-extensions-except=${KeywordsEverywhereDir}`,
            `--load-extension=${KeywordsEverywhereDir}`,
        ],

    });

    // create browser context
    const context = await browser.defaultBrowserContext();


    context.overridePermissions('https://google.com', ['clipboard-read']);
    const page = await browser.newPage()

    // refresh page

    await page.setViewport({ width: 1280, height: 1080, deviceScaleFactor: 1 })
    await page.reload()

    await page.goto("https://google.com", { waitUntil: 'load', timeout: 35000 });
    page.bringToFront()

    // locale search bar
    const searchbox = await page.waitForSelector(".SDkEP")
    await searchbox.type(searchKeyword)
    await searchbox.press("Enter")

    // wait for selector of Keywords Everywhere dom elements
    let relatedSearchSelector = ("#xt-related-search .xt-g-table-no-credits")
    let longTailKeywordsSelector = "#xt-google-ltkwid .xt-g-table-no-credits"

    let relatedSearchTableContents;
    let longtTailKeywordsContents;

    await page.waitForNavigation()


    try {
        if (await page.$(relatedSearchSelector) !== null) {
            relatedSearchTableContents = await page.$eval(relatedSearchSelector, (el) => { return el.getInnerHTML() });
        } else {
            relatedSearchTableContents = "Table not present"
        }

        if (await page.$(longTailKeywordsSelector) !== null) {
            longtTailKeywordsContents = await page.$eval(longTailKeywordsSelector, (el) => { return el.getInnerHTML() });
        } else {
            longtTailKeywordsContents = "Table not present"
            // console.log("from scraper",longtTailKeywordsContents)
        }
        // console.log("from scraper",relatedSearchTableContents)
        return [relatedSearchTableContents, longtTailKeywordsContents]


    } catch (err) {
        console.log("Some Error occured: ", err)
        return "Table data missing"
    } finally {
        await browser.close()
    }
}

export { scrapeKeywords }