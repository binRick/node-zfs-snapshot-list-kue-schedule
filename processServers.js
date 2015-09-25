var kue = require('kue-unique'),
    async = require('async'),
    child = require('child_process'),
    lodash = require('lodash'),
    config = require('./config'),
    queue = kue.createQueue({
        redis: config.redis
    }),
    queueName = 'Servers';

queue.process(queueName, function(job, ctx, done) {
    console.log('Processing Server # ', job.id);
    var dat = {server: job.data.server};
    async.mapSeries(config.commands, function(command, _cb){
    dat.cmd = command.cmd;
    var job = queue.create(command.queueName, dat)
        .unique(JSON.stringify(dat))
        .save(_cb);
    }, done);
});
