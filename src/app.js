const dialogflow = require('dialogflow');
const uuid = require('uuid');
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = process.env.PORT || 8080;

// A unique identifier for the given session
const sessionId = uuid.v4();

app.use(
  bodyParser.urlencoded({
    extended: false
  })
);

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
async function communicateDialogFlow(msg, projectId = 'eleptra-rgxqtr') {  
  // Create a new session
  const sessionClient = new dialogflow.SessionsClient({
    keyFilename: './config/dialogflow/Eleptra-b07e039c0c7d.json'
  })
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
    },
  };

  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  console.log('Detected intent');
  const result = responses[0].queryResult;
  console.log(`Query: ${result.queryText}`);
  console.log(`Response: ${result.fulfillmentText}`);
  
  if (result.intent) {
    console.log(`Intent: ${result.intent.displayName}`);
  } else {
    console.log(`No intent matched.`);
  }

  return result.fulfillmentText;
}

// Starting the server
app.listen(port, () => {
  console.log("Server running on port: " + port);
});