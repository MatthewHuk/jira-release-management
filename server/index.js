const express = require("express");

const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const JiraClient = require("jira-connector");
var request = require("request");

const jiraHost = "";
const username = "";
const baseurl = "";


const projectId = "11702";
const releaseManagmentId = "11701";
const releaseIssueTypeId = "10600";
const boardId = "366";

const moment = require("moment");
require("moment/locale/en-gb");

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

let jira;

app.get("/ping", function(req, res) {
  return res.send("pong");
});

app.get("/releases", function(req, res) {
  return res.status(200).send([
    {
      label: "API nodes (.NET Framework)",
      value: "API-QT"
    },
    {
      label: "Enquiry Orchestrator (.NET Core)",
      value: "EO-QT"
    },
    {
      label: "Provider Nodes",
      value: "P-QT"
    },
    {
      label: "Provider Shims",
      value: "PSH-QT"
    },
    {
      label: "Retrieval Aggregator",
      value: "RA-QT"
    },
    {
      label: "Risk migrator",
      value: "RM-QT"
    },
    {
      label: "Terminator",
      value: "T-QT"
    },
    {
      label: "API Shims",
      value: "ASH-QT"
    },
    {
      label: "Rabbit",
      value: "RB-QT"
    },
    {
      label: "AWS",
      value: "AWS-QT"
    },
    {
      label: "Diagnostics",
      value: "DIAG-QT"
    },
    {
      label: "Auxiliary Data Manager",
      value: "AUX-QT"
    },
    {
      label: "Search Engine",
      value: "SE-QT"
    }
  ]);
});


app.use(async function(req, res, next) {
  jira = new JiraClient({
    host: jiraHost,
    basic_auth: {
      username: username,
      password: ""
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

    var options = {
      method: "GET",
      url: `${baseurl}/search?jql=Sprint in (${currentSprintId},${previousSprintid})&fields=id,key&maxResults=75`,
      auth: {
        username: username,
        password: ""
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
  } catch (error) {
    console.log(error);
    return next(error);
  }
});

app.post("/create-release", async function(req, res) {
  try {
  
    let chosenService = req.body.release // The service you are releasing
    let chosenStartdate = req.body.date // The date you want to release
    
    let issues = await CheckIssuesExist(req.body.issues) // The chosen issues to release
 
    // await Promise.all(issues.map(async (issue) => {
    //   console.log(issue.key)
    //   await Promise.all(issue.fields.fixVersions.map(async (fixversion) => {
    //     console.log(fixversion.name)
    //   }));
    // }));

    let createdReleaseIssue = await CreateReleaseIssue(issues, chosenStartdate, chosenService);
  
    let createdIssueLink = await CreateIssueLink(issues,createdReleaseIssue);
  
    let createdVersion = await CreateVersion(chosenStartdate, chosenService, createdReleaseIssue);
    
    let createdFixversion = await CreateFixVersion(issues, createdVersion);

    //var createdReleaseIssue=[];
    //var createdVersion=[];
    //var createdIssueLink=[];
    //var createdFixversion=[];

    //await SendEmail(chosenIssues, chosenService, chosenStartdate, createdReleaseIssue, createdVersion);
    

    let result = {
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

      console.log(JSON.stringify(i))

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
          } generated by the quoting release management tool`
        }
      };

      await jira.issueLink.createIssueLink({ issueLink: iLink });
      return JSON.stringify(iLink);

    }))
    
  } catch {
    throw Error(`Issue ${issueKey} failed to link to ${createdReleaseIssue.key}.`);
  }
}

async function CreateReleaseIssue(issues, startdate, release) {
  let datetimestart = moment(startdate).utc().format("YYYY-MM-DD H:mm");
  let datetimeend = moment(startdate).add(2, "hours").format("YYYY-MM-DD H:mm")

  let i = {
    fields: {
      project: {
        id: releaseManagmentId //Release Management
      },
      summary: `Quoting Release for ${release.label} : ${datetimestart} - ${datetimeend}`, // In the title, add the team, service, date and time of the release,
      description: `Release for ${release.label} created at ${moment().utc(startdate).toDate()} for ${JSON.stringify(issues.map(
        x => x.key))} generated by the quoting release management tool`,
      issuetype: {
        id: releaseIssueTypeId, // Release into production" issuetype
        name: "Release"
      },
      customfield_11200: {id: "21248"}, // Team affected
      customfield_10802: [{ id: "21249"}], // Products affected
      customfield_11502: moment(startdate).format(), //startdate
      customfield_11501: moment(startdate).add(2, "hours").format() //enddate
    }
  };

  console.log(JSON.stringify(i));

  var issue = await jira.issue.createIssue(i);

  return issue;
}

async function CreateVersion(startdate, release, createdReleaseIssue) {
  let date = moment(startdate).utc().format("YYYY-MM-DD");

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

async function SendEmail(chosenIssues, chosenService, chosenStartdate, createdReleaseIssue, createdVersion) {


  let datetimestart = moment(chosenStartdate).utc().format("YYYY-MM-DD H:mm");
  let datetimeend = moment(chosenStartdate).add(2, "hours").format("YYYY-MM-DD H:mm")

try{
    
    var options = {
      method: "POST",
      url: `https://outlook.office365.com/api/v1.0/me/events`,
      auth: {
        username: username,
        password: ""
      },
       headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
      body: JSON.stringify({
        "Subject": "IM AN OUTLOOK API Calendar event. How did I get here? Im not good with computer",
        "Body": {
          "ContentType": "HTML",
          "Content": "It's your boi!"
        },
        "Start":"2018-12-21T05:35:05Z",
        "End":  "2018-12-21T05:35:05Z",
        "Attendees": [
          {
            "EmailAddress": {
              "Address": username,
              "Name": "Matthew Huk"
            },
            "Type": "Required"
          }
        ]
      })
     
    };

    console.log(options);
    await request.post(options, function(error, response, body) {
      if (error) throw new Error(error);
      return;
    });

  } catch(error) {
    throw Error(`Email failed ${error}`);
  }
};
  
// Choose the port and start the server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
