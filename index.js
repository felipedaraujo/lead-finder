const Airtable = require('airtable');
const puppeteer = require('puppeteer');
const sendgrid = require('@sendgrid/mail');
const fs = require('fs');
const path = require('path');

const { asyncForEach } = require('./utils');

const {
    AIRTABLE_API_KEY,
    AIRTABLE_BASE,
    SENDGRID_API_KEY,
    SENDGRID_FROM,
    SCREENSHOTS_FOLDER
} = process.env;
const GOOGLE_URL = 'https://www.google.com';
const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE);
const status = {
    backloag: 'backlog',
    firstPage: 'first page',
    notFirstPage: 'not first page'
};

this.companies = null;

sendgrid.setApiKey(SENDGRID_API_KEY);

module.exports.handle = async () => {
    await getCompany();
    await searchTerm();
    await emptyImageFolder();
};

function getCompany() {
    const items = [];

    return new Promise((resolve, reject) => {
        // TODO: Add timeout 200 to comply with Airtable's limitation of 5 requests per second
        base('Leads')
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
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await asyncForEach(
            this.companies,
            async ({ id, url, companyName, searchTerm, contact }, index) => {
                await page.goto(`${GOOGLE_URL}/search?q=${searchTerm.replace(/ /g, '+')}`);

                const companyUrl = (await page.$x(`//cite[contains(text(), "${url}")]//..`))[0];

                console.log(`${index + 1}: ${companyName}`);

                if (companyUrl) {
                    console.log('\x1b[31m', 'already 1st page\n', '\x1b[0m');

                    await changeStatus(id, status.firstPage);
                } else {
                    console.log('\x1b[32m', 'screenshot done\n', '\x1b[0m');

                    const screenshot = await page.screenshot({
                        path: `${SCREENSHOTS_FOLDER}/${companyName.replace(/ /g, '-')}.png`,
                        fullPage: true,
                        encoding: 'base64'
                    });

                    await sendEmail({ companyName, contact, screenshot, searchTerm });
                    await changeStatus(id, status.notFirstPage);
                }
            }
        );

        await browser.close();
    } catch (error) {
        console.error(error);
    }

    return;
}

async function changeStatus(id, status) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            base('Leads').update(
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

async function sendEmail({ companyName, contact, screenshot, searchTerm }) {
    const searchUrl = `${GOOGLE_URL}/search?q=${searchTerm.replace(/ /g, '+')}`;
    const message = {
        to: contact,
        from: SENDGRID_FROM,
        subject: "That is upsetting, I couldn't find you on Google",
        text: `
          I googled ${companyName} and I couldn't find it on Google's 1st page.
          If you would like to be on top on Google searches I can help you.
          If the image below doesn't load, you see the search result on Google at ${searchUrl}.
          Sincerely,
          Sender's name
          (Embeded screenshot)
        `,
        html: `
            <p>I googled ${companyName} and I couldn't find it on Google's 1st page.</p>
            <p>If you would like to be on top on Google searches I can help you.</p>
            <p>If the image below doesn't load, you see the search result on Google <a href="${searchUrl}">clicking here</a></p>
            <br />
            <p>Sincerely,</p>
            <p>Sender's name</p>
            <div><img alt="Google search screenshot" src="cid:screenshot" /></div>
        `,
        attachments: [
            {
                filename: `${companyName.replace(/ /g, '-')}.png`,
                contentType: 'image/png',
                content: screenshot,
                content_id: 'screenshot',
                disposition: 'inline'
            }
        ]
    };

    try {
        await sendgrid.send(message);
    } catch (error) {
        console.error(JSON.stringify(error, null, 2));
    }

    return;
}

async function emptyImageFolder() {
    fs.readdir(SCREENSHOTS_FOLDER, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(SCREENSHOTS_FOLDER, file), err => {
                if (err) throw err;
            });
        }
    });
}
