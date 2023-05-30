
# Keywords Everywhere Scraper

![Annotated Example](./annotely_image(1).png)

Node cli script to open a chrome browser puppeteer and collect related and long keywords from the Keywords Everywhere free api. Scrapes the data and saves it to a text file.

## Installation

- clone the directory.
- Make sure node and npm are installed. Requires node v16 or greater.
- run:
```
npm install
```

## Usage
### Argument
`-s, --keyword`: The keywords to search for. Use quotes if multi-word strings.
`-p, --path`: Path/name of the text file to save data to

Example:
```
node main.js -s "nlp insights" -p "data.txt"
```

Example output:
```
Related Keywords 
nlp insights python
natural language processing for social media pdf
nlp in social media
nlp review analysis
sentiment analysis nlp
nlp on news
media monitor nlp project
nlp applications


Longtail keywords 
nlp insights for successful meetings
iqvia nlp insights hub
cb insights nlp
workshop on insights from negative results in nlp
nlp sentiment score
5 nlp insights successful meetings
log analytics vs application insights
what is insight analytics
app insights log information
what is nlp analysis
```
