const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/config');

async function scrapeNHVR() {
  try {
    console.log('Scraping NHVR news...');
    
    const response = await axios.get('https://www.nhvr.gov.au/news-events/latest-news', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Look for article elements
    $('article, .news-item, .post-item').each((i, element) => {
      const $el = $(element);
      const title = $el.find('h1, h2, h3, a').first().text().trim();
      const link = $el.find('a').first().attr('href');

      if (title && title.length > 10) {
        articles.push({
          title: title,
          url: link?.startsWith('http') ? link : `https://www.nhvr.gov.au${link}`,
          source: 'NHVR',
          scrapedAt: new Date()
        });
      }
    });

    console.log(`Found ${articles.length} articles`);
    articles.forEach((article, i) => {
      console.log(`${i+1}. ${article.title}`);
    });

    return articles;

  } catch (error) {
    console.error('Scraping failed:', error.message);
    return [];
  }
}

// Run the scraper if this file is executed directly
if (require.main === module) {
  scrapeNHVR();
}

module.exports = { scrapeNHVR };
