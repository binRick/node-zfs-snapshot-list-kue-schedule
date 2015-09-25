var kue = require('kue-unique'),
    child = require('child_process'),
    lodash = require('lodash'),
    config = require('./config');
var queue = kue.createQueue({
    redis: config.redis
});




var queueName = 'Servers';

var dat = {
    server: process.argv[2] || 'beo',
};
/*
queue.process(queueName, function(job, ctx, done) {
    console.log('processing job', job.id);
    var result = {
        out: 123,
    };
    done(null, result);
});
*/

var job = queue.create(queueName, dat)
    .unique(JSON.stringify(dat))
    .save(function(e, job) {
        if (e) throw e;
        console.log('Server In Database as #', job.id);
    });
