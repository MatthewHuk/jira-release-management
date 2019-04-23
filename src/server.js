const express = require("express");

const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const request = require("request");
const moment = require("moment");  require("moment/locale/en-gb"); require("moment-timezone");
const nconf = require('nconf');
const ews = require("ews-javascript-api");

require('./config'); // Register Configuration

const JiraClient = require("jira-connector");

const {services} = require("./services");

// Details for connecting to Jira
const jiraHost = nconf.get('JIRA_HOST');
const baseurl = `https://${jiraHost}/rest/api/3`;
const username = nconf.get('JIRA_USER');
const password = nconf.get('JIRA_PASSWORD');

// Details for sending email
const emailGroupTo = nconf.get('EMAIL_GROUP') // The teams email to send an appointment
const exchangeUser = nconf.get('EXCHANGE_USER');
const exchangePass = nconf.get('EXCHANGE_PASSWORD');
const appointmentLocation = "Quoting Towers"
const boardId = "366"; // Quoting Sprint board

// Identifiers for creating a version
const projectId = "11702"; // Quoting

// Identifiers for a Release Issue
const releaseManagmentId = "11701"; // Release Management
const releaseIssueTypeId = "10600"; // Release into production" issuetype

// Custom fields required for a Release Issue
const teamAffected = "21248"; // Team affected
const productsAffected = "21249"; // Products affected

const path = require('path');
const app = express();

// enhance app security with Helmet
app.use(helmet());

app.use(bodyParser.urlencoded({ extended: true }));
// use bodyParser to parse application/json content-type
app.use(bodyParser.json());

// enable all CORS requests
app.use(cors());

// log HTTP requests
app.use(morgan("combined"));

let jira;  // The JiraClient calling out to the Jira Api

app.get("/releases", function(req, res) {
  return res.status(200).send(services);
});

app.use(async function(req, res, next) {

  jira = new JiraClient({ // Basic auth expiries the client after awhile, so i'm replacing the client with each request (because I'm that lazy)
    host: jiraHost,
    basic_auth: {
      username: username,
      password: password
    }
  });

  next();
});

app.get("/issues-in-sprint", async function(req, res) {
  
  try {
    let sprint = await jira.board.getSprintsForBoard({boardId: boardId});
    var currentSprintindex = sprint.values.findIndex(sprint => sprint.state === "active");
    let currentSprintId = sprint.values[currentSprintindex].id
    let previousSprintid = sprint.values[currentSprintindex -1].id 

    //return await jira.search.search({regexp: `Sprint in (${currentSprintId},${previousSprintid})&fields=id,key&maxResults=75`});
    // Jira client api does not yet support /search endpoint, so call it with a regular request.
    var options = {
      method: "GET",
      url: `${baseurl}/search?jql=Sprint in (${currentSprintId},${previousSprintid})&fields=id,key&maxResults=75`,
      auth: {
        username: username,
        password: password
      },
      headers: {
        Accept: "application/json"
      }
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);

      let map = JSON.parse(response.body).issues.map(
        x =>
          (obj = {
            label: x.key,
            value: x.id
          })
      );

      return res.status(response.statusCode).send(map);
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({error: err.message});
  }
});

app.post("/create-release", async function(req, res) {
  try {
    
    let chosenService = req.body.release // The service you are releasing
    let chosenStartdate = moment(req.body.date).utc(); // The date you want to release
    let comments = req.body.comments // Any comments about the release (CI Builds)
  
    let issues = await CheckIssuesExist(req.body.issues) // The chosen issues to release

    let createdReleaseIssue = await CreateReleaseIssue(issues, chosenStartdate, chosenService);
  
    let createdIssueLink = await CreateIssueLink(issues,createdReleaseIssue);
  
    let createdVersion = await CreateVersion(chosenStartdate, chosenService, createdReleaseIssue);
    
    let createdFixversion = await CreateFixVersion(issues, createdVersion);
   
    // var issues = [];
    // var createdReleaseIssue=[];
    // var createdVersion=[];
    // var createdIssueLink=[];
    // var createdFixversion=[];

    await SendEmail(issues, chosenService, req.body.date, createdReleaseIssue, comments);


    let result = {
      issues: issues,
      createdReleaseIssue: createdReleaseIssue,
      createdIssueLink: createdIssueLink,
      createdVersion: createdVersion,
      createdFixversion: createdFixversion
    };

    return res.status(200).send(result);
  } catch (err) {
    console.log(err)
    res.status(500).send({error: err.message});
  }
});

async function CreateFixVersion(issues, createdVersion) {
  let issueKey;
  // createdVersion = {
  //   name:  "RM-QT/2019-01-17"
  // }

  try
  {
    return await Promise.all(issues.map(async (issue) => {
      issueKey = issue.key

      // Edit the current issue to have the FixVersion we just created
      let i = {
        fields: {
          fixVersions: [{
            name: createdVersion.name,
          }]
        }
      };

      // Find out if we have any existing FixVersions on this issue already
      let existingFixVersions = issue.fields.fixVersions.map(
        x =>
          (fixVersions = {
            name:  x.name
          })
      );


      // If we do have existing FixVersions on the issue, then add them back on, along with the new FixVersion
      if(existingFixVersions && existingFixVersions.length > 0){
        existingFixVersions.forEach(FixVersion => {
          i.fields.fixVersions.push(FixVersion) 
        });
      }

      //console.log(JSON.stringify(i))

      // issue key eg: QT-2000
      await jira.issue.editIssue({issueKey: issueKey, issue: i }); // If fix version exists, need to replace it not edit
      return JSON.stringify(i); 

    }))
    
  } catch(err) {
    console.log(err)
    throw Error(`Issue ${issueKey} failed to create fix version for ${createdVersion.name}.`);
  }
}

async function CheckIssuesExist(issues){  // Call every endpoint, if it fails to find an issue it will throw
  let issueKey;
  try
  {
    return await Promise.all(issues.map(async (issue) => {
        issueKey = issue.label
        return await jira.issue.getIssue({issueKey: issueKey, fields:["key,fixVersions"]});
    }));
    
  } catch(err) {
    console.log(err);
    throw Error(`Issue ${issueKey} does not exist or you do not have permission to see it.`);
  }
}


async function CreateIssueLink(issues, createdReleaseIssue) {
  let issueKey;

  try
  {
    return await Promise.all(issues.map(async (issue) => {
      
      issueKey = issue.key
      let iLink = {
        type: {
          name: "Releases"
        },
        inwardIssue: {
          key: createdReleaseIssue.key
        },
        outwardIssue: {
          key: issueKey
        },
        comment: {
          body: `Linked related issue! ${createdReleaseIssue.key} to ${
            issueKey
          }`
        }
      };

      await jira.issueLink.createIssueLink({ issueLink: iLink });
      return JSON.stringify(iLink);

    }))
    
  } catch(err) {
    throw Error(`Issue ${issueKey} failed to link to ${createdReleaseIssue.key}.`);
  }
}

async function CreateReleaseIssue(issues, startdate, release) {
  let datetimestart = startdate.format("YYYY-MM-DD H:mm");
  let datetimeend = startdate.add(2, "hours").format("YYYY-MM-DD H:mm")

  let i = {
    fields: {
      project: {
        id: releaseManagmentId //Release Management
      },
      summary: `Quoting Release for ${release.label} : ${datetimestart} - ${datetimeend}`, // In the title, add the team, service, date and time of the release,
      description: `Release for ${release.label} created at ${moment().utc().toDate()} for ${JSON.stringify(issues.map(
        x => x.key))} generated by the quoting release management tool`,
      issuetype: {
        id: releaseIssueTypeId, // Release into production" issuetype
        name: "Release"
      },
      customfield_11200: {id: teamAffected}, // Team affected
      customfield_10802: [{ id: productsAffected}], // Products affected
      customfield_11502: startdate.format(), // Startdate
      customfield_11501: startdate.add(2, "hours").format() // EndDate
    }
  };

  console.log(JSON.stringify(i));

  var issue = await jira.issue.createIssue(i);

  return issue;
}

async function CreateVersion(startdate, release, createdReleaseIssue) {
  let date = startdate.format("YYYY-MM-DD");

  let v = {
    name: `${release.value}/${date}`,
    startDate: date,
    releaseDate: date,
    description: `${createdReleaseIssue.key}`,
    projectId: projectId,
    released: false
  };

  let version = await jira.version.createVersion({ version: v });
  console.log(version);
  return version;
}


async function SendEmail(issues, chosenService, chosenStartdate, createdReleaseIssue, comments) {

  let datetimestart = moment(chosenStartdate).utc().format("DD-MM-YYYY H:mm");
  let datetimeend =  moment(chosenStartdate).utc().add(2, "hours").format("DD-MM-YYYY H:mm")
  
  let startDate = moment(chosenStartdate).utc();

  if(startDate.isUTC())
  {
    console.log('Its stupid DST');
    startDate.add(-1, "h")
  }
  
  ews.EwsLogging.DebugLogEnabled = false;

  var exch = new ews.ExchangeService(ews.ExchangeVersion.Exchange2016);

  exch.Credentials = new ews.ExchangeCredentials(exchangeUser, exchangePass);
  
  exch.Url = new ews.Uri("https://outlook.office365.com/EWS/Exchange.asmx");

  var appointment = new ews.Appointment(exch);

  appointment.Subject = `Quoting release for ${chosenService.label}`;
  appointment.Body = new ews.MessageBody(ews.BodyType.HTML,`The quoting Jira release app wants to book a release with you at ${datetimestart} to ${datetimeend} for ${createdReleaseIssue.key} \r\n Issues: ${JSON.stringify(issues.map(x => x.key))} \r\n CI Build and comments: ${comments} \r\n `);
 
  appointment.Start = new ews.DateTime(startDate);
  appointment.End = appointment.Start.Add(2, "h");

  appointment.Location = appointmentLocation;
  appointment.RequiredAttendees.Add(emailGroupTo);

  console.log(appointment.Start)
  console.log(appointment.End)

  appointment.Save(ews.SendInvitationsMode.SendToAllAndSaveCopy).then(function () {
      console.log("done - check email");
      
  }, function (error) {
      console.log(error);
  });

};
  

app.use(express.static(path.join(__dirname, '../build')));

 app.get('/', function(req, res) {
   res.sendFile(path.join(__dirname, '../build', 'index.html'));
 });

// Choose the port and start the server
const PORT = process.env.PORT || 5011;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});


