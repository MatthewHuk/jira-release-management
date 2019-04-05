const nconf = require('nconf');

nconf.argv({
    JIRA_USER: {
        alias: 'jira-user',
        describe: 'Jira quoting bot user',
        demand: false
    },
    JIRA_PASSWORD: {
        alias: 'jira-password',
        describe: 'Jira quoting bot password',
        demand: false
    },
    EXCHANGE_USER: {
        alias: 'exchange-user',
        describe: 'user for sending a meeting request via outlook',
        demand: false
    },
    EXCHANGE_PASSWORD: {
        alias: 'exchange-password',
        describe: 'password for sending a meeting request via outlook',
        demand: false
    }
})
    .env()