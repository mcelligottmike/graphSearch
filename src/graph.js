/**
 * Created by mmc on 27/08/2016.
 */
'use strict';

const   _      = require('lodash'),
        fs     = require('fs'),
        nconf  = require('nconf');
// ****************** SET UP LOGGING ***************************
// If log handle not supplied to module then create one
const bunyan            = require('bunyan');
const PrettyStream      = require('bunyan-prettystream');
const prettyStdOut      = new PrettyStream();
prettyStdOut.pipe(process.stdout);


class Graph{

    constructor(configuration) {
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
    addEdge(graph, source, destination){
        if (_.isUndefined(graph) || _.isUndefined(source) || _.isUndefined(destination)){
            this.log.error("Illegal parameter(s) passed to addEdge()");
            throw new Error("Invalid parameter value observed");
        }
        // Look for record of source node in the graph
        if (!_.isUndefined(graph[source])){
            // already have a record of this source so add another edge
            graph[source].push(destination);
        }
        else{
            graph[source] = [destination];
        }
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
                filename = this.config.get("configuration:dataFile");
            }

            // todo: check file exists and has acceptable privs

            let inputStream = fs.createReadStream(filename);

            inputStream.on('error', (err) => {
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
                    this.addEdge(graph,status.elements[0],status.elements[1]);
                }
                catch (e) {
                    this.log.error(e);
                }
                ++numEntries;
            });
            lineReader.on('close', () => {
                this.log.info('Got to the end of the file with ' + numEntries + ' entries observed');
                this.log.debug(graph);
                response.resolve(graph);
            });



        return response.promise;
    }
}

module.exports = Graph;