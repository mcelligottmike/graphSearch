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


    /**
     * Given a node, discover all nodes they are connected to. If the node is connected to the same node </br>
     * through multiple paths, then only the most direct path is revealed <br/>
     * Note that we only traverse upto a maximum depth determined by maxDepth in the configuration (default 5 if missing) <br/>
     * </br>
     * @param {string} name - node we want to discover network for
     * @returns {array} contacts - list of paths to distinct contacts
     *
     */

    revealContacts(nodeName){

        let searchPaths = [[nodeName]]; // tracks the paths we are currently investigating

        if (_.isUndefined(nodeName) || (!_.isString(nodeName))){
            console.error("Missing Source Node from search criteria");
            this.log.error("Missing Source Node from search criteria");
            return [];
        }

        let blackList = {},  // used to prevent cycles
            stillProgressing = false;

        let leafPosition = 0, layerCount = 0, abandonedPaths = 0;

        blackList[nodeName] = 1;
        do {
            stillProgressing = false;
            for (let i = 0; i < searchPaths.length; i++) {

                // get leaf node
                leafPosition = searchPaths[i].length - 1;

                let adjacentNodes = this.graph.getAdjacentNodes(searchPaths[i][leafPosition]),
                    newPath = [];

                if (adjacentNodes.length > 0) {

                    for (let x = 0; x < adjacentNodes.length; ++x) {
                        // have we encountered this node already? If so then discard
                        if (_.isUndefined(blackList[adjacentNodes[x]])) {
                            newPath = searchPaths[i].slice(); // clone original path
                            newPath.push(adjacentNodes[x]);
                            searchPaths.push(newPath.slice()); // append copy of newPath into scratchList
                            blackList[adjacentNodes[x]] = 1; // prevent cycles

                            stillProgressing = true;
                        }
                        else {
                            // else ignore this node as we have already taken it into account
                            abandonedPaths++;
                        }
                    }
                }
            }

            ++layerCount;
            if (layerCount >= this.maxDepth){
                this.log.info("Hit maximum search depth for user network search");
                stillProgressing = false;
            }
            this.log.info("At depth: " + layerCount);
            this.log.info("Current number of paths being considered: " + searchPaths.length);
            this.log.info("Total Abandoned Paths so far [" + abandonedPaths + "] paths");

        } while (stillProgressing);

        this.log.info(searchPaths.length + " Paths found from " + nodeName);
        for (let x = 0; x < searchPaths.length; ++x) {
            this.log.debug(_.join(searchPaths[x],"->"));
        }

        return searchPaths;
    }

    /**
     * Get the paths from source node to destination node</br>
     * </br>
     * @param {object} conditions - <ul> <li> conditions.source => search from this node </li>
     *                              <li> conditions.destination => search for connection to this node </li>
     *                              <li> conditions.searchType => "allPaths" => find all paths from source to dest, "shortestPath" => find shortest path(s) to dest </li></ul>
     * @returns {array} paths - list of paths to specified contact
     *
     */
    getPaths(searchConditions){

        let searchPaths = [];

        if (_.isUndefined(searchConditions.source) || (!_.isString(searchConditions.source))){
            console.error("Missing Source Node from search criteria");
            this.log.error("Missing Source Node from search criteria");
            return [];
        }
        if (!this.graph.existingNode(searchConditions.source)){
            this.log.error("Source node does not exist in the network")
            return [];
        }
        if (_.isUndefined(searchConditions.destination) || (!_.isString(searchConditions.destination))){
            console.error("Missing Destination Node from search criteria");
            this.log.error("Missing Destination Node from search criteria");
            return [];
        }
        if (!this.graph.existingNode(searchConditions.destination)){
            this.log.error("Destination node does not exist in the network");
            return [];
        }
        if (_.isUndefined(searchConditions.searchType) || (!_.isString(searchConditions.searchType))){
            searchConditions.searchType = "allPaths";
            this.log.info("Defaulting to finding all search paths");
        }

        searchPaths = [[searchConditions.source]]; // tracks the paths we are currently investigating

        if ((searchConditions.searchType === "shortestPath") &&
            (searchConditions.source === searchConditions.destination)){
            this.log.info("Source and destination nodes are the same");
            searchPaths[0].push(searchConditions.destination);
        }
        else {
            // *************************************************
            // Initiate a breadth first search for shortest path
            // *************************************************
            let blackList = {},  // used to prevent cycles & path search duplication
                scratchList = [],
                foundShortest = false, stillProgressing = false;

            let leafPosition = 0, layerCount = 0, abandonedPaths = 0;

            blackList[searchConditions.source] = 1;   // add the originating node to blacklist
            do {
                scratchList = [];
                stillProgressing = false;
                for (let i = 0; i < searchPaths.length; i++) {

                    // get leaf node
                    leafPosition = searchPaths[i].length - 1;

                    if (searchPaths[i][leafPosition] === searchConditions.destination) {
                        // no need to progress any further along this path - we have found a path
                        scratchList.push(searchPaths[i].slice()); // record copy of path
                    }
                    else
                    {
                        let adjacentNodes = this.graph.getAdjacentNodes(searchPaths[i][leafPosition]),
                            newPath = [];

                        if (adjacentNodes.length > 0) {
                            for (let x = 0; x < adjacentNodes.length; ++x) {

                                // have we encountered this node already? If so then discard
                                if (_.isUndefined(blackList[adjacentNodes[x]])) {
                                    newPath = searchPaths[i].slice(); // clone original path
                                    newPath.push(adjacentNodes[x]);
                                    scratchList.push(newPath.slice()); // append copy of newPath into scratchList
                                    if (adjacentNodes[x] != searchConditions.destination) {
                                        blackList[adjacentNodes[x]] = 1; // prevent cycles
                                    }
                                    stillProgressing = true;
                                }
                                else{
                                    // else ignore this node as we have already taken it into account
                                    abandonedPaths++;
                                }


                            }
                        }
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
                this.log.info("At depth: " + layerCount);
                this.log.info("Current number of paths being considered: " + scratchList.length);
                this.log.info("Total Abandoned Paths so far [" + abandonedPaths + "] paths");

                searchPaths = scratchList;

                // todo: sort the searchpaths so we check those that have the least number of
                // acquaintances first - will optimize for all but the worst case


            } while ((searchConditions.searchType === "allPaths" && stillProgressing) ||
                     (searchConditions.searchType === "shortestPath" && !foundShortest && stillProgressing));
        }
        this.log.info(searchPaths.length + " Paths found from " + searchConditions.source + " to " + searchConditions.destination);
        for (let x = 0; x < searchPaths.length; ++x) {
            this.log.debug(_.join(searchPaths[x],"->"));
        }
        return searchPaths;
    }
}

module.exports = GraphSearch;