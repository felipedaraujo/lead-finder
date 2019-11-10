# Lead Finder

Welcome to the Lead Finder project. You can use this script to pull companies' information (names, URLs and search terms) from a spreadsheet to look those companies up on Google. If the script doesn't find a company link on Google's first page, an email is sent to that company saying they are not on the first page on Google.

### Pre-requisite

1. Log into your [Airtable](https://airtable.com/invite/r/CDcO4Uqa) and [SendGrid](https://sendgrid.com/) accounts, copy your API keys and paste inside `example.env.sh` which you need to rename to `env.sh`.
1. Create a new base on Airtable and name its first table `Leads`. Add five columns and name them exactly `url`, `companyName`, `contact`, `searchTerm`, and `status`. The column `status` should be on the type `Single select` and have the options `backlog`, `first page`, `not first page`. [Here is an example](https://airtable.com/shrd7I0sWKSib677y) of how it should look like.
1. Add your email address which your email will be "sent from" (using SendGrid) to the environment variable `SENDGRID_FROM` inside `env.sh`.
1. Create a folder called `screenshots` at the root of the project.
1. Last, change the email content inside `index.js` function `sendEmail`, both the `text` and `html` versions.

### How to use

1. Make sure your `Leads` table is populated and each row's `status` is set to `backlog`. The script only reads the rows set to `backlog`.
1. On Mac computers, open the `Terminal.app` and navigate to the root of the project. If you don't know how, [here is how you can do it](https://help.ubuntu.com/community/UsingTheTerminal#File_.26_Directory_Commands).
1. Use the command `npm start` to run the script.
