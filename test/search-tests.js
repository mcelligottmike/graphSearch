/**
 * Created by mikemc on 28/08/2016.
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
                            name: 'search-tests',
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
const Search = require('../src/graphSearch');

/** @test {Graph Search} */
describe('Graph Search Tests', function () {

    /** @test {Basic Validation} */
    describe('Basic setup', function () {

        /** @test {validateEntry} */
        it('should complain if no graph object supplied', function (done) {
            try {

                let search = new Search();

                done("Should not have been able to construct search object");

            }
            catch (e) {
                done();
            }
        });

        /** @test {validateEntry} */
        it('should successfully build a search object', function (done) {
            try {

                let graph = new Graph({
                                log: log
                            }),
                    search = new Search(graph,{log: log});

                done();

            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });


    });

    /** @test {Search} */
    describe('Graph searching', function () {


        /** @test {validateEntry} */
        it('should successfully find all paths in graph', function (done) {
            try {

                let graph = new Graph({
                        log: log
                    }),
                    search = new Search(graph,{log: log});

                graph.addEdge("A","B");
                graph.addEdge("A","C");
                graph.addEdge("A","D");
                graph.addEdge("B","H");
                graph.addEdge("B","I");
                graph.addEdge("B","J");
                graph.addEdge("C","K");
                graph.addEdge("C","M");
                graph.addEdge("H","M");
                graph.addEdge("A","M");

                let results = search.getPaths({source:"A", destination:"M", searchType:"allPaths"});
                results.should.be.instanceof(Array).and.have.lengthOf(3);

                done();

            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

        it('should successfully deal with cycles in graph', function (done) {
            try {

                let graph = new Graph({
                        log: log
                    }),
                    search = new Search(graph,{log: log});

                graph.addEdge("A","B");
                graph.addEdge("A","C");
                graph.addEdge("A","D");
                graph.addEdge("B","H");
                graph.addEdge("B","I");
                graph.addEdge("B","J");
                graph.addEdge("C","K");
                graph.addEdge("C","M");
                graph.addEdge("H","B"); // created a cycle here A->B->H->B->H->B....
                graph.addEdge("A","M");

                let results = search.getPaths({source:"A", destination:"M", searchType:"allPaths"});

                results.should.be.instanceof(Array).and.have.lengthOf(2);
                done();

            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

        it('should successfully find shortest path in graph', function (done) {
            try {

                let graph = new Graph({
                        log: log
                    }),
                    search = new Search(graph,{log: log});

                graph.addEdge("A","B");
                graph.addEdge("A","C");
                graph.addEdge("A","D");
                graph.addEdge("B","H");
                graph.addEdge("B","I");
                graph.addEdge("B","J");
                graph.addEdge("C","K");
                graph.addEdge("C","M");
                graph.addEdge("H","M");
                graph.addEdge("A","M"); // shortest path

                let results = search.getPaths({source:"A", destination:"M", searchType:"shortestPath"});
                results.should.be.instanceof(Array).and.have.lengthOf(1);

                done();

            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

        it('should deal with source being same as destination for shortest path', function (done) {
            try {

                let graph = new Graph({
                        log: log
                    }),
                    search = new Search(graph,{log: log});

                graph.addEdge("A","B");
                graph.addEdge("A","C");
                graph.addEdge("A","D");
                graph.addEdge("B","H");
                graph.addEdge("B","I");
                graph.addEdge("B","J");
                graph.addEdge("C","K");
                graph.addEdge("C","M");
                graph.addEdge("H","M");
                graph.addEdge("A","M");

                let results = search.getPaths({source:"A", destination:"A", searchType:"shortestPath"});
                results.should.be.instanceof(Array).and.have.lengthOf(1);

                done();

            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

        it('should find multiple shortest paths when more than 1 exist', function (done) {
            try {

                let graph = new Graph({
                        log: log
                    }),
                    search = new Search(graph,{log: log});

                graph.addEdge("A","B");
                graph.addEdge("A","C");
                graph.addEdge("A","D");
                graph.addEdge("B","H");
                graph.addEdge("B","I");
                graph.addEdge("B","J");
                graph.addEdge("C","K");
                graph.addEdge("C","M"); // shortest path
                graph.addEdge("H","M");
                graph.addEdge("D","M"); // shortest path


                let results = search.getPaths({source:"A", destination:"M", searchType:"shortestPath"});
                results.should.be.instanceof(Array).and.have.lengthOf(2);

                done();

            }
            catch (e) {
                log.error(e);
                done(e);
            }
        });

    });


});

