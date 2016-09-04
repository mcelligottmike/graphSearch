/**
 * Created by mcellmi on 30/08/2016.
 */

'use strict';

// Add configuration management
const   fs      = require('fs'),
        path    = require('path'),
        nconf   = require('nconf'),
        _       = require('lodash');

// Create a main logging instance which can be used to co-ordinate logging
// across all modules
const   bunyan          = require('bunyan'),
        PrettyStream    = require('bunyan-prettystream'),
        prettyStdOut    = new PrettyStream();
prettyStdOut.pipe(process.stdout);

nconf.argv().env().file({file: './config/configuration.json'});

const   log             = bunyan.createLogger({
                            name: nconf.get('log:name'),
                            serializers: {
                                reason: bunyan.stdSerializers.err
                            },
                            streams: [{
                                level: nconf.get('log:logLevel'),
                                type: 'raw',
                                stream: prettyStdOut
                            }]
                        });

const Graph = require('../src/graph');
const Search = require('../src/graphSearch');

var express = require('express');
var app = express();

app.use(express.static('public'));
app.use(express.static('coverage'));


let graph = new Graph({
        log: log,
        dataFile: nconf.get('data:file'),
        maxDepth: nconf.get('search:maxDepth'),
        firstHitOnly: nconf.get('search:firstHitOnly')
    });

graph.readData()
    .then((result) => {

        let search = new Search(graph,{log: log});

        app.get('/index.html', function (req, res) {
            res.sendFile( __dirname + "/" + "index.html" );
        })
        app.get('/bundle.js', function (req, res) {
            res.sendFile( __dirname + "/" + "bundle.js" );
        })

        app.get('/nodeCount', function (req, res) {
            res.end(JSON.stringify(graph.getNodeCount()));
        })



        app.get('/search', function (req, res) {

            // Prepare output in JSON format
            let searchConditions = {
                source:req.query.source,
                destination:req.query.destination,
                searchType:"shortestPath"
            };
            let results = search.getPaths(searchConditions);
            let response = "";
            for (let x = 0; x < results.length; ++x) {
                response = _.join(results[x], "->") + "<br/>";
            }
            console.log(response);
            res.end(JSON.stringify(results));
        })

        app.get('/searchAll', function (req, res) {
            let results = search.revealContacts(req.query.source);

            let numberOfPaths = (_.isArray(results)) ? (results.length - 1) : 0; // exclude self path
            let response = {numPaths:numberOfPaths, paths:[]};

            if (numberOfPaths > 20){
                numberOfPaths = 20; // max limit
            }

            for (let x = 0; x < numberOfPaths; ++x) {
                response.paths.push(results[x]);
            }
            console.log(response);
            res.end(JSON.stringify(response));
        })

        var server = app.listen(8081, function () {

            var host = server.address().address
            var port = server.address().port

            console.log("Example app listening at http://%s:%s", host, port)

        })


        //
        //
        // search.getPaths({source:"DOUG_BARTOLOMEO", destination:"*"});
        //
        // search.revealContacts("DOUG_BARTOLOMEO");
        //
        // let results = search.getPaths({source:"DOUG_BARTOLOMEO", destination:"JOSPEH_MONTUORI", searchType:"shortestPath"});
        //
        // for (let x = 0; x < results.length; ++x) {
        //     console.log(_.join(results[x],"->"));
        // }
    })
    .catch((error) => {
        log.error(error);
    });


