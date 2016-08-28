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

    /** @test {Build from file} */
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


    /** @test {Build from file} */
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
});

