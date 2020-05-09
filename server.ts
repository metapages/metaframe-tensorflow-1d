import fastify = require("fastify");
import fastifyStatic = require("fastify-static");
import fastifyBlipp = require("fastify-blipp");
// import * as fastify from "fastify";
// import * as fastifyStatic from "fastify-static";
// import * as fastifyBlipp from "fastify-blipp";
// import fastify from "fastify";
// import fastifyStatic from "fastify-static";
// import fastifyBlipp from "fastify-blipp";

import { Server, IncomingMessage, ServerResponse } from "http";
import { execSync } from "child_process";
import * as path from "path";

const assets = 'dist';

const server: fastify.FastifyInstance<
  Server,
  IncomingMessage,
  ServerResponse
> = fastify();

server.register(fastifyBlipp);

server.post('/deploy', (request, response) => {
  if (request.query.secret !== process.env.SECRET) {
    response.status(401).send()
    return
  }
  
  if (request.body.ref !== 'refs/heads/glitch') {
    response.status(200).send('Push was not to glitch branch, so did not deploy.')
    return
  }
  
  const repoUrl = request.body.repository.git_url

  console.log('Fetching latest changes.')
  const output = execSync(
    `git checkout -- ./ && git pull -X theirs ${repoUrl} glitch && refresh`
  ).toString()
  console.log(output)
  response.status(200).send()
})

server.get('/ping', async (request, reply) => {
  return 'pong\n'
})

server.get('/', async (request, response: any) => {
  response.sendFile(path.join(__dirname, assets, 'index.html'))
})

server.register(fastifyStatic, {
  root: path.join(__dirname, assets),
  prefix: '/',
})


const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const start = async () => {
  try {
    const address = await server.listen(port, "0.0.0.0");
    console.log(`Server listening at ${address}`)
    server.blipp();
  } catch (err) {
    console.log(err);
    server.log.error(err);
    process.exit(1);
  }
};

start();


// server.listen(8080, (err, address) => {
//   if(err) {
//     console.error(err)
//     process.exit(1)
//   }
  
// })




// const express = require('express')
// const app = express()

// const bodyParser = require('body-parser')


// app.use(bodyParser.json())

// app.get('/', (request, response) => {
//   response.sendFile(path.join(__dirname, 'README.md'))
// })

// app.post('/deploy', (request, response) => {
//   if (request.query.secret !== process.env.SECRET) {
//     response.status(401).send()
//     return
//   }
  
//   if (request.body.ref !== 'refs/heads/glitch') {
//     response.status(200).send('Push was not to glitch branch, so did not deploy.')
//     return
//   }
  
//   const repoUrl = request.body.repository.git_url

//   console.log('Fetching latest changes.')
//   const output = execSync(
//     `git checkout -- ./ && git pull -X theirs ${repoUrl} glitch && refresh`
//   ).toString()
//   console.log(output)
//   response.status(200).send()
// })

// const listener = app.listen(process.env.PORT, function() {
//   console.log('Your app is listening on port ' + listener.address().port);
// })
