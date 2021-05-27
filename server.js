// Add this to the VERY top of the first file loaded in your app
var apm = require('elastic-apm-node').start({
  // Set required service name (allowed characters: a-z, A-Z, 0-9, -, _, and space)
  serviceName: 'guestbook',

  // Use if APM Server requires a token
  secretToken: '',

  // Set custom APM Server URL (default: http://localhost:8200)
  serverUrl: 'http://apm-server:8200'
})
var redis = require('redis'),
    coredis = require('co-redis'),
    views = require('co-views'),
    koa = require('koa'),
    router = require('koa-router')(),
    koabody= require('koa-body')(),
    serve = require('koa-static');

var app = koa();

var db = redis.createClient(6379, 'redis'),
    client = coredis(db);

app.use(router.routes())
app.use(serve(__dirname + '/static'));

var render = views(__dirname + '/views', { ext: 'pug'});

router.get('/', function *(next) {
  var lusers = yield client.lrange('users', 0, -1);
  this.body = yield render('index', { lusers:lusers });
  var index;
  for (index = 0; index < lusers.length; ++index) {
    var obj = yield client.hgetall(lusers[index]);
    this.body += '<strong>' + obj.name + '</strong><br />';
    this.body += '<a href="mailto:' + obj.email + '">' + obj.email + '</a><br />';
    this.body += '<a href="' + obj.website +'">' + obj.website + '</a><br />';
    this.body += obj.msg + '</p>';
  }
});

router.post('/', koabody, function *(next) {
  client.incr('userids');
  var userid = yield client.get('userids');
  client.hmset('user:' + userid,  
               'name', this.request.body.name, 
               'email', this.request.body.email, 
               'website', this.request.body.website, 
               'msg', this.request.body.msg
               );
  client.lpush('users', 'user:' + userid);
  this.redirect('/');   
});

app.listen('8080');
