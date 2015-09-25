var kue = require('kue'),
    config = require('./config'),
    c = require('chalk'),
    pty = require('pty.js'),
    trim = require('trim'),
    fs = require('fs'),
    clear = require('cli-clear'),
    _ = require('underscore'),
    telnet = require('telnet-client'),
    pj = require('prettyjson'),
    queue = kue.createQueue({redis: config.redis});
var Client = require('ssh2').Client;
var ASYNC_CHECK_INTERVAL = 5000;
var SKIP_SYNC = false;
var express = require('express');
var ui = require('kue-ui');
var app = express();

var successLogger = function(type, backup) {
    console.log(c.green.bgBlack.bold(type + ' Backup Processed @ ') + c.white.bold(backup.length) + c.green.bgBlack.bold(' bytes'));
};
ui.setup({
    apiURL: '/api',
    baseURL: '/kue',
    updateInterval: 1000
});

app.use('/api', kue.app);
app.use('/kue', ui.app);
var lconf = __dirname + '/_servers.json';
var lconf2 = __dirname + '/_backupServers.json';
app.get('/_api/devInfo/:state/:type/:dev/:limit/:key?', function(req, res) {
    req.params.key = req.params.key || '';
    kue.Job.rangeByState( req.params.state, 0, 99999, 'desc', function( err, jobs ) {
        if(err)throw err;
        var nJ = jobs.filter(function(j){
            return ( parseInt(j.data.dev) == parseInt(req.params.dev) && j.type == req.params.type)
        }).slice(0,req.params.limit);
        if(req.params.key=='age'){
            nJ = nJ.map(function(j){
                return ( parseInt((new Date().getTime() - j.updated_at) / 1000 ));
            });
        }else if(req.params.key.length>0){
            nJ = nJ.map(function(j){
                return j[req.params.key];
            });
        }
        if(parseInt(req.params.limit)==1){
            nJ=nJ[0];
        }
        return res.json(nJ);
    });
});
app.get('/_api/__devInfo/:state/:dev', function(req, res) {
    var I = [];
    queue[req.params.state](function(err, ids){
        if(err)throw err;
        _.each(ids, function(id){
                  kue.Job.get( id, function( err, job ) {
                      if(err)throw err;
                            return I.push(job.id);
                      if('dev' in job.data){
                      console.log(job.data.dev);
                        if(parseInt(req.params.dev)==parseInt(job.data.dev)){
                            I.push(job.id);
                        }
                      }else
                      console.log(job.id, 'has no dev');
                });

            });
    return res.json(I);
    });/*
    var I = {};
    kue.Job.rangeByState( req.params.state, 10, n, 'asc', function( err, jobs ) {
          jobs.forEach( function( job ) {
                  job.remove( function(){
                            console.log( 'removed ', job.id );
                                });
                    });
    });*/
});
app.get('/_api/servers', function(req, res) {
        var dat = JSON.parse(fs.readFileSync(lconf).toString()) || {};
        return res.send(dat);
});
app.get('/_api/newBackupHost/:name/:host/:port/:user/:pass', function(req, res) {
    try {
        var dat = JSON.parse(fs.readFileSync(lconf2).toString()) || {};
        dat[req.params.name] = {
            name: req.params.name,
            host: req.params.host,
            port: req.params.port,
            path: req.params.path,
            user: req.params.user,
            pass: req.params.pass,
        };
        fs.writeFileSync(lconf2, JSON.stringify(dat));
        res.end('ok');
    } catch (e) {
        res.status(500).end(e);
    }
});
app.get('/_api/new/:name/:host/:dev/:shellPrompt/:intervalSeconds/:backupMode', function(req, res) {
    try {
        var dat = JSON.parse(fs.readFileSync(lconf).toString()) || {};
        dat[req.params.name] = {
            host: req.params.host,
            name: req.params.name,
            shellPrompt: req.params.shellPrompt,
            dev: req.params.dev,
            intervalSeconds: req.params.intervalSeconds,
            backupMode: req.params.backupMode,
        };
        fs.writeFileSync(lconf, JSON.stringify(dat));
        res.end('ok');
    } catch (e) {
        res.status(500).end(e);
    }
});

app.listen(config.ports.app);
kue.app.listen(config.ports.kue);
kue.app.set('title', 'ZFS Manager');
