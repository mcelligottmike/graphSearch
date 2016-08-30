/**
 * Created by mmc on 27/08/2016.
 */
'use strict';

const   _      = require('lodash'),  // basic utilities
        fs     = require('fs');      // file handling

// ****************** SET UP LOGGING ***************************
// If log handle not supplied to module then create one
const bunyan            = require('bunyan');
const PrettyStream      = require('bunyan-prettystream');
const prettyStdOut      = new PrettyStream();
prettyStdOut.pipe(process.stdout);


class Graph{

    constructor(configuration) {

        // This class can fallback to an onboard bunyan logger if no logger is supplied
        // to it in the configuration. In this event, logging can be disabled by setting
        // the NODE_ENV environment variable to 'test'

        this.log = (!_.isUndefined(configuration) || !_.isUndefined(configuration.log)) ?
                configuration.log :
                bunyan.createLogger({
                    name: 'graph',
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
        this.dataFile = "./data/SocialNetwork.txt";

        if (!_.isUndefined(configuration) && !_.isUndefined(configuration.dataFile)) {
            this.dataFile = configuration.dataFile;
        }


        this.matrix = {};
    }


    /**
     * Validate entry to ensure that is a string in the form A,B </br>
     * </br>
     * </br>
     * @param {string} entry - String describing source and destination nodes
     * @returns {object} - Result object contains status (true/false) along with
     *                      message in the event of a false status code. If entry is
     *                      deemed legal then pair is stored in elements attribute of
     *                      return object
     */
    validateEntry(entry){
        let status = {'result': true};
        let e = _.split(entry,',');
        // entry should only have two elements - e.g. A,B
        if (e.length != 2){
            status.result = false;
            status.message = "Line does not follow expected format (A,B), observed " + entry;
        }
        else{
            status.elements = e;
        }
        return status;
    }

    /**
     * Add record of connection from source -> destination to existing </br>
     * records stored in graph </br>
     * </br>
     * @param {array} graph - Where to store the relationship
     * @param {string} source - name of the node edge is going from
     * @param {string} destination - name of the node edge is going to
     *
     */
    addEdge(source, destination){
        if (_.isUndefined(source) || _.isUndefined(destination)){
            this.log.error("Illegal parameter(s) passed to addEdge()");
            throw new Error("Invalid parameter value observed");
        }
        // Convert all node names to uppercase
        source.toUpperCase();
        destination.toUpperCase();

        // Look for record of source node in the graph
        if (!_.isUndefined(this.matrix[source])){
            // already have a record of this source so add another edge
            this.matrix[source].push(destination);
        }
        else{
            this.matrix[source] = [destination];
        }
    }

    /**
     * Remove described edge from supplied matrix. </br>
     * Fail silently if edge does not exist </br>
     * </br>
     * @param {array} graph - Where to store the relationship
     * @param {string} source - name of the node edge is going from
     * @param {string} destination - name of the node edge is going to
     *
     */
    removeEdge(source, destination){
        if (_.isUndefined(source) || _.isUndefined(destination)){
            this.log.error("Illegal parameter(s) passed to removeEdge()");
            throw new Error("Invalid parameter value observed");
        }
        // Look for record of source node in the graph
        if (_.isUndefined(this.matrix[source])) {
            throw new Error("Request to remove edge from non-existent node");
        }
        this.matrix[source] = _.difference(this.matrix[source],[destination]);
    }

    getAdjacentNodes(node){
        if (!_.isUndefined(this.matrix[node])) {
            return this.matrix[node];
        }
        return [];
    }

    findEdge(source, destination){
        if (_.isUndefined(source) || _.isUndefined(destination)){
            this.log.error("Illegal parameter(s) passed to removeEdge()");
            throw new Error("Invalid parameter value observed");
        }
        // Look for record of source node in the graph
        if (_.isUndefined(this.matrix[source])) {
            throw new Error("Request to find edge from non-existent node");
        }
        let matches = _.intersection(this.matrix[source],[destination]);

        if (matches.length == 0){
            return false;
        }
        return true;
    }

    existingNode(nodeName){
        if (_.isUndefined(this.matrix[nodeName])) {
            return false;
        }
        return true;
    }

    /**
     * Read data from file and store in local matrix</br>
     * </br>
     * </br>
     * @param {string} filename - data file with entries describing nodes and edges
     * @returns {Promise} - resolve to matrix capturing graph structure
     *
     */
    readData(filename){
            let response    = Promise.defer();
            let numEntries  = 0;
            let graph       = {};

            if (_.isUndefined(filename)) {
                filename = this.dataFile;  // unless client has overridden the file to be checked, use default
            }

            // todo: check file exists and has acceptable privs
            this.log.info("Reading graph data from: " + filename);

            let inputStream = fs.createReadStream(filename);

            inputStream.on('error', (err) => {
                this.log.error("Could not process file: " + filename);
                this.log.error(err.message);
                response.reject(err);
            });

            var lineReader = require('readline').createInterface({
                input: inputStream
            });

            lineReader.on('line', (line) => {
                this.log.debug('Line from file:' + line);
                let status = this.validateEntry(line);
                if (!status.result){
                    response.reject("Invalid File: line " + (numEntries + 1) + " : " + status.message);
                }
                try{
                    this.addEdge(status.elements[0],status.elements[1]);
                }
                catch (e) {
                    this.log.error(e);
                }
                ++numEntries;
            });
            lineReader.on('close', () => {
                this.log.info('Got to the end of the file with ' + numEntries + ' entries observed');
                this.log.debug(this.matrix);
                response.resolve(numEntries);
            });



        return response.promise;
    }
}

module.exports = Graph;