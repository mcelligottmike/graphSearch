/**
 * Created by mcellmi on 30/08/2016.
 */

'use strict';

// Add configuration management
const   fs      = require('fs'),
        path    = require('path'),
        nconf   = require('nconf');

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

let graph = new Graph({
        log: log,
        dataFile: nconf.get('data:file'),
        maxDepth: nconf.get('search:maxDepth'),
        firstHitOnly: nconf.get('search:firstHitOnly')
    });

graph.readData()
    .then((result) => {

        let search = new Search(graph,{log: log});

        search.getPaths({source:"DOUG_BARTOLOMEO", destination:"*"});
    })
    .catch((error) => {
        log.error(error);
    });


