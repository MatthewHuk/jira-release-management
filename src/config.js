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
    },
    JIRA_HOST: {
        alias: 'jira-host',
        describe: 'jira host environment',
        demand: false
    },
    JIRA_HOST: {
        alias: 'email-group',
        describe: 'The teams email to send an appointment',
        demand: false
    }
})
    .env()
    .defaults({
        JIRA_USER: "",
        JIRA_PASSWORD: "",
        EXCHANGE_USER: "",
        EXCHANGE_PASSWORD: "",
        JIRA_HOST: "",
        EMAIL_GROUP: '' 
    });


    
