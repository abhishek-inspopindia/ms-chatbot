// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';
 
const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const TextResponse = require('dialogflow-fulfillment/src/rich-responses/text-response');
const CardResponse = require('dialogflow-fulfillment/src/rich-responses/card-response');
const SuggestionsResponse = require('dialogflow-fulfillment/src/rich-responses/suggestions-response');
const PayloadResponse = require('dialogflow-fulfillment/src/rich-responses/payload-response');
const PLATFORMS = require('dialogflow-fulfillment/src/rich-responses/rich-response');
const axios = require('axios');
const qs = require('querystring');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  //console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  //console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  const PC = {
    'endpoint': 'https://claims-qa6.dev-elephant.com/cc/service/edge/claim/claim',
    'headers': {
        'Connection': 'keep-alive',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImtleS1pZC0xIiwidHlwIjoiSldUIn0.eyJqdGkiOiIyZDM5ZmM4N2Q4MDc0ZmQ2YWZhMjE2YjY1YzEwZTI3NyIsInN1YiI6IjgzYmY4MjJjLWM4M2ItNGEzMi05MmNkLTZiYThiOTRjNzZkMCIsInNjb3BlIjpbImd1aWRld2lyZS5lZGdlLnBvbGljeS4yNDQtMDAwLTAwMC01Mi5hbGwiLCJndWlkZXdpcmUuZWRnZS5hY2NvdW50LjEwMDAwMTc5LmFsbCIsInVhYS5vZmZsaW5lX3Rva2VuIiwiZ3VpZGV3aXJlLmVkZ2UubGVnYWN5YWNjb3VudC4xMDAwMDE3OS5hbGwiXSwiY2xpZW50X2lkIjoiYWRtaW4tdXNyLW1nbXQiLCJjaWQiOiJhZG1pbi11c3ItbWdtdCIsImF6cCI6ImFkbWluLXVzci1tZ210IiwiZ3JhbnRfdHlwZSI6InBhc3N3b3JkIiwidXNlcl9pZCI6IjgzYmY4MjJjLWM4M2ItNGEzMi05MmNkLTZiYThiOTRjNzZkMCIsIm9yaWdpbiI6InVhYSIsInVzZXJfbmFtZSI6InJhamEzMUB2dnYuY29tIiwiZW1haWwiOiJyYWphMzFAdnZ2LmNvbSIsImF1dGhfdGltZSI6MTU5MTEzMzQ5NiwicmV2X3NpZyI6IjI1MzBjMzk1IiwiaWF0IjoxNTkxMTMzNDk2LCJleHAiOjE1OTExMzUyOTYsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC91YWEvb2F1dGgvdG9rZW4iLCJ6aWQiOiJ1YWEiLCJhdWQiOlsiYWRtaW4tdXNyLW1nbXQiLCJ1YWEiLCJndWlkZXdpcmUuZWRnZS5hY2NvdW50LjEwMDAwMTc5IiwiZ3VpZGV3aXJlLmVkZ2UubGVnYWN5YWNjb3VudC4xMDAwMDE3OSIsImd1aWRld2lyZS5lZGdlLnBvbGljeS4yNDQtMDAwLTAwMC01MiJdfQ.P9jxTOShIyOVBpwTn9rwO-W5k5vENtquTK5yk0gyqyYztm47CWzZBjItMS8cIdp3MkO7BkQrAvUlHaTKeQnbp5jgFzulqj_AllZEPZhEq0SasrmiC9cA4Pvkj2ZwsBNIW9FCgwWGC5lbNq7QsVSwjTyemb4XdLKKOJhkTcS_1tsPqURAPBpeSEnUvLMoWjIL31Go_1if46V52MUuFTDFIfUhsd9ffl1lccseJA-r-bCXjMSmLQA24sTgu_NV07-g35KcD7G8eVDg7x-GN8YBNaTwhJ2dzSf4qNsqW8oOJ0sc-F881zBAN8w6rACXpRa8xU9MEemOsiRsbYQdoeLdqw',
      'Content-Type': 'application/json; charset=utf-8',
      'Host': 'claims-qa6.dev-elephant.com',
      'Origin': 'https://claims-qa6.dev-elephant.com',
      'Referer': 'https://claims-qa6.dev-elephant.com/',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin'
    },
    'body': {
      "id":"9d7ac1db-5217-4654-9cca-c80225934784",
      "jsonrpc":"2.0",
      "method":"getClaimSummaries",
      "params":[
        {
          "claimStates":["open","draft","closed"]
        },
        {
          "offsetStart":0,
          "offsetEnd":24
        }
      ]
    }
  };
  
  function getAllClaims(agent, PC) {
  	// Fetch Bot Responses from DialogFlow Webhook
    const config = {
    headers: PC.headers
    };
    
    // Initiate a POST request to DialogFlow Webhook 
    axios.post(
        PC.endpoint,
        qs.stringify(PC.body), 
        config
    ).then(response => {
        console.log(response);
        agent.add(JSON.stringify(response));
    }).catch(err => {
        console.log("Error h: " + err);
    });
  }  

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();

  intentMap.set('claims.start_getPolicyNumber',getAllClaims);
  
  agent.handleRequest(intentMap);
});
