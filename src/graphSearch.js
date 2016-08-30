/**
 * Created by mike mc on 28/08/2016.
 */

'use strict';

const   _      = require('lodash');

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
        // This class can fallback to an onboard bunyan logger if no logger is supplied
        // to it in the configuration. In this event, logging can be disabled by setting
        // the NODE_ENV environment variable to 'test'
        // *************************************
        this.log = (!_.isUndefined(configuration) || !_.isUndefined(configuration.log)) ?
            configuration.log :
            bunyan.createLogger({
                name: 'graphSearch',
                serializers: {
                    reason: bunyan.stdSerializers.err
                },
                streams: process.env.NODE_ENV === 'test' ?
                    []
                    : [{
                    level: 'info',
                    type: 'raw',
                    stream: prettyStdOut
                }]
            });

        this.maxDepth = 5; // This only comes into effect when we seek to elucidate a user's entire network
        if (!_.isUndefined(configuration) && !_.isUndefined(configuration.maxDepth)) {
            this.maxDepth = configuration.maxDepth;
        }

        this.firstHitOnly = false; // When we find a short path, don't attempt to carry on and find all shortest paths
        if (!_.isUndefined(configuration) && !_.isUndefined(configuration.firstHitOnly)) {
            this.firstHitOnly = configuration.firstHitOnly;
        }
    }


    getPaths(searchConditions){

        let showNetwork = false;

        if (_.isUndefined(searchConditions.source) || (!_.isString(searchConditions.source))){
            console.error("Missing Source Node from search criteria");
            this.log.error("Missing Source Node from search criteria");
            return [];
        }
        if (!this.graph.existingNode(searchConditions.source)){
            console.error("Source node does not exist in the network")
            return [];
        }
        if (_.isUndefined(searchConditions.destination) || (!_.isString(searchConditions.destination))){
            console.error("Missing Destination Node from search criteria");
            this.log.error("Missing Destination Node from search criteria");
            return [];
        }
        if (searchConditions.destination === "*"){
            showNetwork = true;  // display all connection paths for this source node
        }
        else if (!this.graph.existingNode(searchConditions.destination)){
            console.error("Destination node does not exist in the network")
            return [];
        }
        if (_.isUndefined(searchConditions.searchType) || (!_.isString(searchConditions.searchType))){
            searchConditions.searchType = "allPaths";
            this.log.info("Defaulting to finding all search paths");
        }

        let searchPaths = [[searchConditions.source]]; // tracks the paths we are currently investigating

        if ((searchConditions.searchType === "shortestPath") &&
            (searchConditions.source === searchConditions.destination)){
            this.log.info("Source and destination nodes are the same");
        }
        else {

            let blackList = [searchConditions.source],   // used to detect cycles
                scratchList = [],
                foundShortest = false, stillProgressing = false;

            do {
                let leafPosition = 0, layerCount = 0, abandonedPaths = 0;
                scratchList = [];
                stillProgressing = false;
                for (let i = 0; i < searchPaths.length; i++) {

                    // get leaf node
                    leafPosition = searchPaths[i].length - 1;

                    if (searchPaths[i][leafPosition] === searchConditions.destination) {
                        // no need to progress any further along this path
                        scratchList.push(searchPaths[i].slice());
                    }
                    else
                    {
                        let adjacentNodes = this.graph.getAdjacentNodes(searchPaths[i][leafPosition]),
                            newPath = [];

                        // strip out any of the adjacents that are in the black list
                        let before = adjacentNodes.length;
                        adjacentNodes = _.difference(adjacentNodes, blackList);
                        abandonedPaths += before - adjacentNodes.length;


                        if (adjacentNodes.length > 0) {
                            stillProgressing = true;
                            for (let x = 0; x < adjacentNodes.length; ++x) {


                                newPath = searchPaths[i].slice(); // clone original path
                                newPath.push(adjacentNodes[x]);
                                scratchList.push(newPath.slice()); // append copy of newPath into scratchList
                                if (adjacentNodes[x] != searchConditions.destination) {
                                    blackList.push(adjacentNodes[x]); // prevent cycles
                                }

                            }
                        }
                        // else if (showNetwork && searchPaths[i].length <= this.maxDepth){
                        //     // Record the path anyway
                        //     scratchList.push(searchPaths[i]);
                        // }
                    }
                }

                // After traversing down another layer in the graph, lets check if we
                // have reached the destination on any of the paths
                if (searchConditions.searchType === "shortestPath") {
                    let shortestPaths = scratchList.filter(function (path) {
                        return (path[leafPosition] === searchConditions.destination);
                    });
                    if ((shortestPaths.length > 0) && (shortestPaths.length < searchPaths.length)) {
                        scratchList = shortestPaths;
                        foundShortest = true;
                    }
                }

                ++layerCount;
                console.log("At depth: " + layerCount);
                console.log("Current number of paths being considered: " + scratchList.length);
                console.log("Total Abandoned Paths so far [" + abandonedPaths + "] paths");

                searchPaths = scratchList;

                // todo: lets sort the searchpaths so we check those that have the least number of
                // acquaintances first - will optimize for all but the worst case


            } while ((searchConditions.searchType === "allPaths" && stillProgressing) ||
                     (searchConditions.searchType === "shortestPath" && !foundShortest && stillProgressing));
        }
        this.log.info(searchPaths.length + " Paths found from " + searchConditions.source + " to " + searchConditions.destination);
        for (let x = 0; x < searchPaths.length; ++x) {
            this.log.info(_.join(searchPaths[x],"->"));
        }
        return searchPaths;
    }
}

module.exports = GraphSearch;