import { scrapeAndParseKeywords } from "./parser.js";
import { parseArgs } from "util";
import * as fs from "node:fs"

const args = parseArgs({
    options:{
        keyword:{
            type:"string",
            short:"s"
        },
        path:{
            type:"string",
            short:"p"
        }

    }
})

let [relatedKeywords, longTailKeywords] = await scrapeAndParseKeywords(args.values.keyword)

let stream = fs.createWriteStream(args.values.path)
stream.once('open',() => {
    stream.write("Related Keywords \n")

    for(let keyword of relatedKeywords){
        stream.write(keyword)
        stream.write("\n")
    }
    stream.write("\n\n")
    stream.write("Longtail keywords \n")

    for(let keyword of longTailKeywords){
        stream.write(keyword)
        stream.write("\n")
    }

    stream.end()
})
