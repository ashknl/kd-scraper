import { scrapeKeywords } from "./scraper.js"
import { parse } from 'node-html-parser'

let scrapeAndParseKeywords = async (searchKeyword) => {

    let [relatedSearch, longTailKeywords] = await scrapeKeywords(searchKeyword)
    let relatedSearchHTML = parse(relatedSearch)
    let longTailKeywordsHTML = parse(longTailKeywords)
    // let relatedSearchTbody = relatedSearchHTML.getElementsByTagName("tbody")

    let relatedSearchTr = relatedSearchHTML.querySelectorAll("tr")
    let longTailKeywordsTr = longTailKeywordsHTML.querySelectorAll("tr")
    let relatedSearchContent = []
    let longTailKeywordsContent = []

    for (let element of relatedSearchTr) {
        relatedSearchContent.push(element.innerText)
    }


    for (let element of longTailKeywordsTr) {
        longTailKeywordsContent.push(element.innerText)
    }

    relatedSearchContent.shift()
    longTailKeywordsContent.shift()

    return [relatedSearchContent, longTailKeywordsContent]
}

export { scrapeAndParseKeywords }