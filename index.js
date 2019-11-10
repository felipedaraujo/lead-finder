const Airtable = require('airtable');
const puppeteer = require('puppeteer');
const { asyncForEach } = require('./utils');

const { AIRTABLE_API_KEY, AIRTABLE_BASE } = process.env;
const GOOGLE_URL = 'https://www.google.com';
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE);
const status = {
    backloag: 'backlog',
    firstPage: 'already 1st page',
    notFirstPage: 'not on 1st page'
};

this.companies = null;

module.exports.handle = async () => {
    await getCompany();
    await searchTerm();
};

function getCompany() {
    const items = [];

    return new Promise((resolve, reject) => {
        // TODO: Add timeout 200 to comply with Airtable's limitation of 5 requests per second
        base('Companies')
            .select({
                filterByFormula: '({status}="backlog")'
            })
            .eachPage(
                function page(records, fetchNextPage) {
                    records.forEach(({ id, fields }) => {
                        items.push({ id, ...fields });
                    });

                    fetchNextPage();
                },
                function done(err) {
                    if (err) {
                        console.error(err);
                        reject(err);
                    }

                    this.companies = items;

                    resolve();
                }
            );
    });
}

async function searchTerm() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await asyncForEach(this.companies, async ({ id, url, companyName, searchTerm }, index) => {
        await page.goto(`${GOOGLE_URL}/search?q=${searchTerm.replace(/ /g, '+')}`);

        const companyUrl = (await page.$x(`//cite[contains(text(), "${url}")]//..`))[0];

        console.log(`${index + 1}: ${companyName}`);

        if (companyUrl) {
            console.log('\x1b[31m', 'already 1st page\n', '\x1b[0m');

            await changeStatus(id, status.firstPage);
        } else {
            console.log('\x1b[32m', 'screenshot done\n', '\x1b[0m');

            await page.screenshot({
                path: `screenshots/${companyName.replace(/ /g, '-')}.png`,
                fullPage: true
            });

            await changeStatus(id, status.notFirstPage);
        }
    });

    await browser.close();

    return;
}

async function changeStatus(id, status) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            base('Companies').update(
                [
                    {
                        id,
                        fields: {
                            status
                        }
                    }
                ],
                err => {
                    if (err) {
                        console.error(err);
                        reject(err);
                    }

                    resolve();
                }
            );
        }, 200);
    });
}
