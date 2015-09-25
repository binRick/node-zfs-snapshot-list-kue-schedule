var kue = require('kue-unique'),
    child = require('child_process'),
    lodash = require('lodash'),
    config = require('./config');
var queue = kue.createQueue({
    redis: config.redis
});




var queueName = 'zfsList';
var cmd = config.commands[process.argv[3]];

var dat = {
    cmd: cmd.cmd,
    server: process.argv[2] || 'beo',
};

queue.process(queueName, function(job, ctx, done) {
    console.log('processing job', job.id);
    var cmd = 'ssh ' + config.proxy + ' ssh ' + job.data.server + ' "' + job.data.cmd + '"';
    var out = child.execSync(cmd).toString().split('\n');
    var result = {
        out: out,
    };
    done(null, result);

});

var job = queue.create(queueName, dat)
    .unique(JSON.stringify(dat))
    .save(function(e, job) {
        if (e) throw e;
        console.log('job saved', job.id);
    });
