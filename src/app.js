const dialogflow = require('dialogflow');
const uuid = require('uuid');
const express = require('express');
const bodyParser = require('body-parser');
const config = require('config');

const app = express();
const port = process.env.PORT || config.get('app.port');

// A unique identifier for the given session
const sessionId = uuid.v4();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.raw());

// Enabling CORS
app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);

  // Pass to next layer of middleware
  next();
});

// Defining Routes
app.get('/', (req, res) => {
    res.send('Hello from ms-chatbot.')
});

app.all('/snapengage', (req, res) => {
  console.dir(`Body: ${req.body}`);
  // Check for header authorization token
  if (req.header('authorization') !== 'Awdz@2005##') {
    respondToSnapEngage(req, res, 'You are not authorized to chat with me, goodbye!', 'BYE', '');
    return;
  }

  var message = req.body.text;
  if (!message) {
    message = req.body.description;
  }

  // temporary code to ignore the system messages
  // once the API backend no longer sends the system message, this can be removed
  if (message && message.indexOf('[Contact Details') !== -1) {
    message = '';
  }
  // end of temporary code

  // temporary logging
  console.log('message=' + message);

  if (message) {
    message = message.toLowerCase();
    let seText = ``;
    let seCommand = ``;

    if (message.indexOf('get a quote') !== -1) {
      seText = `You can get insurance online without the hassle. Click here: https://www.elephant.com/products/car-insurance` + 
        `\nIs there anything else I could help you with?`;
      respondToSnapEngage(req, res, seText);
    } else if (message.indexOf('get id card') !== -1) {
      seText = `Connecting you with our Live Support Agent to help you with your ID Card requirements.\nPlease wait.`;
      seCommand = `HUMAN_TRANSFER`;
      respondToSnapEngage(req, res, seText, seCommand);
    } else if (message.indexOf('billing') !== -1) {
      seText = `Connecting you with our Live Support Agent to serve you better with your billing related issues.\nPlease wait.`;
      seCommand = `HUMAN_TRANSFER`;
      respondToSnapEngage(req, res, seText, seCommand);
    } else if (message.indexOf('live agent') !== -1 || message.indexOf('live support') !== -1 || message.indexOf('support agent') !== -1) {
      seText = `Connecting you with our Live Support Agent.\nPlease wait.`;
      seCommand = `HUMAN_TRANSFER`;
      respondToSnapEngage(req, res, seText, seCommand);
    } else if (message.indexOf('bye') !== -1 || message.indexOf('close') !== -1 || message.indexOf('exit') !== -1) {
      seText = `Glad to help you here. As requested ending this conversation here.`;
      seCommand = `BYE`;
      respondToSnapEngage(req, res, seText, seCommand);
    } else {
      //Get Message back from DialogFlow
      let dfResponse = ``;
      let dfMessage = ``;
      let seMessage = ``;
      // Communicating with dialogflow and returning back the response data received
      communicateDialogFlow(message)
      .then(data => {
        console.log(data);
        dfResponse = 'success';
        dfMessage = data;
        if(data.queryResult.fulfillmentMessages[0].text.text[0] === '' && data.queryResult.fulfillmentText === ''){
          console.log('Failed to get response from DialogFlow. Transfering to Live Agent.');
          // If unable to communicate with DialogFlow transfer to SnapEngage Live Agents
          seText = `Connecting you with our Live Support Agent.\nPlease wait.`;
          seCommand = `HUMAN_TRANSFER`;
          respondToSnapEngage(req, res, seText, seCommand);
        } else {
          //Convert it into SnapEngage Format and Respond Back to SnapEngage
          convertDFtoSE(req, res, dfMessage);
        }        
      })
      .catch(err => {
        console.log('Failed to get connected with DialogFlow.');
        console.log("Error: " + err);
        dfResponse = 'failure';
        // If unable to communicate with DialogFlow transfer to SnapEngage Live Agents
        seText = `Connecting you with our Live Support Agent.\nPlease wait.`;
        seCommand = `HUMAN_TRANSFER`;
        respondToSnapEngage(req, res, seText, seCommand);
      });
    }
  } else {
    // temporary logging
    console.log('We are in the handler for the empty/undefined message. Object: ' + JSON.stringify(req.body));
    
    // SnapEngage sent an empty message
    respondToSnapEngage(req, res);
  }
});

app.post('/query-bot', (req, res) => {
    console.log(req)
    // Communicating with dialogflow and returning back the response data received
    communicateDialogFlow(req.body.MSG)
    .then(data => {
        console.log(data)
        res.status(200).send({
            Reply: data
        });
    })
    .catch(err => {
        console.log("Error: " + err);
        res.status(400).send({
            error: err
        });
    });
});

/**
 * Send a query to the dialogflow agent, and return the query result.
 * @param {string} projectId The project to be used
**/
async function communicateDialogFlow(msg, projectId = 'elephant-qkkbjf') {  
  // Create a new session
  const sessionClient = new dialogflow.SessionsClient({
    keyFilename: './config/dialogflow/elephant-qkkbjf.json'
  });
  const sessionPath = sessionClient.sessionPath(projectId, sessionId);

  // The text query request.
  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        // The query to send to the dialogflow agent
        text: msg,
        // The language used by the client (en-US)
        languageCode: 'en-US',
      },
      queryParams: {
        subAgents: [
           { project: "projects/claims-xyrqtm" },
           { project: "projects/faq-veousl" }
        ]
      }
    }
  };

  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  //console.log('Detected intent');
  
  const result = responses[0];
  //const result = responses[0].queryResult;
  //console.log(`Query: ${result.queryText}`);
  //console.log(`Response: ${result.fulfillmentText}`);
  
  if (result.intent) {
    console.log(`Intent: ${result.intent.displayName}`);
  } else {
    console.log(`No intent matched.`);
  }

  return result;
}

/*
* respondToSnapEngage: send a JSON response to the webhook
*
* @param req HTTP request context.
* @param res HTTP response context.
* @param text text to send back to the visitor
* @param command (optional) command to send back to SnapEngage
* @param commandParams (optional) command parameters when applicable (i.e. widget ID to
transfer to, URL for the GOTO command)
* @param buttons (option) array of buttons, i.e. [{"text": "Yes"}, {"text": "No"}]
*/
function respondToSnapEngage(req, res, text, command, commandParams, buttons) {
  var request = req.body;
  var response = {};
  response.widget_id = request.widget_id;
  response.case_id = request.case_id;
  var content = [];

  if (buttons) {
    content.push({
      "type": "message",
      "text": text,
      "display_responses": buttons
    });
  } else {
    content.push({
      "type": "message",
      "text": text
    });
  }
  if (command) {
    content.push({
      "type": "command",
      "operation": command,
      "parameters": commandParams
    });
  }
  response.content = content;

  console.log(response);
  res.status(200).send(response);
  //res.status(200).send(JSON.stringify(response));
}

function convertDFtoSE(req, res, data) {
  console.log(data.queryResult.fulfillmentMessages[0].text.text[0]);
  console.log(JSON.stringify(data));
  let dfQueryResult = data.queryResult;
  let dfFulfillmentMessages = dfQueryResult.fulfillmentMessages;
  let lenFulfillmentMessages = Object.keys(dfFulfillmentMessages).length; // Get Length of DialogFlow Fulfillment Messages
  let dfFulfillmentText = dfQueryResult.fulfillmentText;
  let dfQuickReplies = [];

  if (lenFulfillmentMessages > 0) {			
    for (let i=0; i<lenFulfillmentMessages; i++) {
      if (dfFulfillmentMessages[i].message == "text") {
        if (dfFulfillmentText.includes(dfFulfillmentMessages[i].text.text) === false) {
          dfFulfillmentText += "\n" + dfFulfillmentMessages[i].text.text + "\n";
        }
      }
      if (dfFulfillmentMessages[i].message == "quickReplies") {
        dfFulfillmentMessages[i].quickReplies.quickReplies.forEach(element=>{
          let dt = {
            "text": element
          };
          dfQuickReplies.push(dt);
        });
      }
    }

    let seText = dfFulfillmentText;
    let seCommand = ``;
    let seCommandParams = ``;
    let seButtons = dfQuickReplies;

    // Send Response Back to SnapEngage
    respondToSnapEngage(                
      req, 
      res, 
      seText, 
      seCommand,
      seCommandParams,
      seButtons
    );
  } else {
    let seText = ``;
    let seCommand = ``;
    let seCommandParams = ``;
    let seButtons = ``;
    if (dfFulfillmentText === "" || dfFulfillmentText.indexOf('live agent') !== -1) {
      // Transfer to Live Agent
      dfFulfillmentText = `Connecting you to a Live Agent to assist you on this.`
      seText = dfFulfillmentText;
      seCommand = `HUMAN_TRANSFER`;
    } else {
      seText = dfFulfillmentText;
    }          
    
    respondToSnapEngage(                
      req, 
      res, 
      seText, 
      seCommand,
      seCommandParams,
      seButtons
    );
  }
}

// Starting the server
app.listen(port, () => {
  console.log("Server running on port: " + port);
});