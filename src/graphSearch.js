/**
 * Created by mike mc on 28/08/2016.
 */

'use strict';

const   _      = require('lodash'),
        nconf  = require('nconf');

// ****************** SET UP LOGGING ***************************
// If log handle not supplied to module then create one
const bunyan            = require('bunyan');
const PrettyStream      = require('bunyan-prettystream');
const prettyStdOut      = new PrettyStream();
prettyStdOut.pipe(process.stdout);

class GraphSearch{

    constructor(graph, configuration){

        if (!_.isObject(graph)){
            throw new Error("Expected graph object to be passed to search");
        }
        this.graph = graph;

        // *************************************
        // Set up logging and configuration data
        // *************************************
        this.config = _.isUndefined(configuration) ? nconf.argv().env() : nconf.argv().env().defaults({configuration});
        const argv  = _.isUndefined(this.config.argv) ? require('optimist').argv : this.config.argv;

        this.log = _.isUndefined(this.config.get("log")) ? bunyan.createLogger({
            name: 'graph',
            serializers: {
                reason: bunyan.stdSerializers.err
            },
            streams: process.env.NODE_ENV === 'test' ?
                []
                : [{
                level: argv.llevel || 'info',
                type: 'raw',
                stream: prettyStdOut
            }]
        }) : this.config.get("log");

    }


    getAllPaths(source,destination){

        let searchPaths = [[source]],
            blackList   = [source],
            scratchList = [],
            done        = false, stillProgressing = false;


        do {
            scratchList = [];
            stillProgressing = false;
            for (let i = 0; i < searchPaths.length; i++) {
                // get leaf node
                let leafPosition = searchPaths[i].length - 1;
                if (searchPaths[i][leafPosition] === destination) {
                    // no need to progress any further along this path
                    scratchList.push(searchPaths[i].slice());
                    done = true;
                }
                else {
                    let adjacentNodes = this.graph.getAdjacentNodes(searchPaths[i][leafPosition]),
                        newPath = [];

                    // strip out any of the adjacents that are in the black list
                    adjacentNodes = _.difference(adjacentNodes,blackList);

                    if (adjacentNodes.length > 0) {
                        stillProgressing = true;
                        for (let x = 0; x < adjacentNodes.length; ++x) {


                            newPath = searchPaths[i].slice(); // clone original path
                            newPath.push(adjacentNodes[x]);
                            scratchList.push(newPath.slice());
                            if (adjacentNodes[x] != destination){
                                blackList.push(adjacentNodes[x]); // prevent cycles
                            }

                        }
                    }
                }
            }
            searchPaths = scratchList;
        } while (stillProgressing);

        this.log.info(searchPaths.length + " Paths found from " + source + " to " + destination);
        for (let x = 0; x < searchPaths.length; ++x) {
            this.log.info(_.join(searchPaths[x],"->"));
        }
        return searchPaths;
    }
}

module.exports = GraphSearch;