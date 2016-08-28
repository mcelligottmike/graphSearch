/**
 * Created by mikemc on 27/08/2016.
 */

// jscs:disable validateLineBreaks
'use strict';

var it = require("mocha/lib/mocha.js").it;
var describe;
describe = require("mocha/lib/mocha.js").describe;


const   should          = require('should'),
        bunyan          = require('bunyan'),
        PrettyStream    = require('bunyan-prettystream'),
        prettyStdOut    = new PrettyStream();

prettyStdOut.pipe(process.stdout);

const   log             = bunyan.createLogger({
                            name: 'graph-tests',
                            serializers: {
                                reason: bunyan.stdSerializers.err
                            },
                            streams: [{
                                level: 'info',
                                type: 'raw',
                                stream: prettyStdOut
                            }]
                        });

const Graph = require('../src/graph');

/** @test {Graph} */
describe('Graph Functionality Tests', function () {

    /** @test {Basic Validation} */
    describe('Entry Validation', function () {

        /** @test {validateEntry} */
        it('should successfully validate a legal entry', function (done) {
            try {

                var graph = new Graph({
                    log: log,
                });

                let status = graph.validateEntry("A,B");

                if (status.result) {
                    done();
                }
                else {
                    done(status.message)
                }
            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

        /** @test {inValidateEntry} */
        it('should successfully inValidate an illegal entry', function (done) {
            try {

                var graph = new Graph({
                    log: log,
                });

                let status = graph.validateEntry("A,B,C");

                if (status.result) {
                    done("Incorrectly validated tuple as a legal entry");
                }
                else {
                    done()
                }
            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

    });


    /** @test {File Handling} */
    describe('File handling test cases', function () {

        /** @test {ReadDataFromFile} */
        it('should read a valid file', function (done) {
            try {

                var graph = new Graph({
                    log: log,
                    dataFile: "./test/data/test.txt"
                });

                graph.readData().then((result) => {
                    log.info(result);
                    done();
                })
                    .catch((error) => {
                        done(error);
                    });
            } catch (e) {
                log.error(e);
                done(e);
            }
        });

        /** @test {ReadDataFromFile} */
        it('should fail for non-existent file', function (done) {
            try {

                var graph = new Graph({
                    log: log,
                    dataFile: "./dir-does-not-exist/test.txt"
                });

                graph.readData().then(() => {
                    done("This should not have worked");
                })
                    .catch((error) => {
                        if (error.code === "ENOENT"){
                            done();
                        }
                        else{
                            done(error);
                        }
                    });

            } catch (e) {
                log.error(e);
                done(e);
            }
        });
    });

    /** @test {Basic Graph Maintenance} */
    describe('Graph basic query and update', function () {

        /** @test {node query} */
        it('should successfully check for edge existence', function (done) {
            try {
                let graph = new Graph({
                    log: log
                });

                graph.addEdge("A","B");
                graph.addEdge("A","C");
                graph.addEdge("A","D");

                if (graph.findEdge("A","B") &&
                    graph.findEdge("A","C") &&
                    graph.findEdge("A","D")){
                    done();
                }
                else{
                    done("Edge finding not behaving as expected");
                }
            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

        /** @test {node addition} */
        it('should successfully add two nodes and edge', function (done) {
            try {

                var graph = new Graph({
                    log: log
                });


                graph.addEdge("A","B");
                graph.getAdjacentNodes("A").should.be.instanceof(Array);
                graph.getAdjacentNodes("A").should.eql(["B"]);
                graph.addEdge("A","C");
                graph.getAdjacentNodes("A").should.eql(["B","C"]);

                done();
            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

        /** @test {edge removal} */
        it('should successfully remove an edge', function (done) {
            try {

                var graph = new Graph({
                    log: log
                });

                graph.addEdge("A","B");
                graph.addEdge("A","F");
                graph.addEdge("A","X");

                graph.removeEdge("A", "F");
                graph.getAdjacentNodes("A").should.eql(["B","X"]);

                graph.removeEdge("A", "WWW"); // non existent - should not affect
                graph.getAdjacentNodes("A").should.eql(["B","X"]);

                graph.removeEdge("A", "B");
                graph.removeEdge("A", "X");
                graph.getAdjacentNodes("A").should.eql([]);

                done();
            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

    });

});

