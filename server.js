//  OpenShift sample Node application
var express = require('express'),
    app     = express();
var data = {};
var cors = require('cors');
    
var allowCrossDomain = function(req, res, next) {
 
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
   
      next();
};

app.use(cors());
app.use(allowCrossDomain);

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";



app.get('/', function (req, res) {
  var d =  new Date().toUTCString();
  res.send(d);  
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/qOpen', function(req, res) {
    var quoteNo = req.query.quoteNo;
    var name = req.query.name;


    if (quoteNo in data) {  // Is the quote already locked?

        if (name == data[quoteNo].name) {   // Is the request from the same user who locked it the first time?

            // Update the last Update time
            data[quoteNo].lastUpdateTime = Date.now();

            // nothing really to do, access has already been granted
            res.send('{"result":"ok"}');
        }
        else {
            // A different user is requesting access

            // deny it
            res.send('{"result":"no","name":"' + name + '"}');
        }
    }
    else {
        // First time this quote is getting locked


        // store quote no in the list along with: who is locking it, and the current time
        data[quoteNo] = {name: name, lastUpdateTime: Date.now()};

        // Grant access
        res.send('{"result":"ok"}');
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/qClose', function(req, res) {
    console.log("Got a Close request");
    var quoteNo = req.query.quoteNo;

    delete data[quoteNo];

    res.send('{"result":"ok"}');
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/clearUserQuotes', function(req, res) {
    console.log("Got a request to clear user quotes");
    var full_name = req.query.name;
    
    for(var quoteNo in data) {
      
      if(data.hasOwnProperty(quoteNo)) {
        if(data[quoteNo].name == full_name) {
          delete data[quoteNo];
        }
      }
    }

    res.send('{"result":"ok"}');
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/qList', function(req, res) {
    console.log('Got List Request');
    var list='';

    for (var key in data) {
        if (data.hasOwnProperty(key)) {
            list += '{"quoteNo":"' + key + '","name":"' + data[key].name + '"},';
        }
    }

    res.send('{"list": [' + list.substr(0, list.length-1) + ']}');
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/qReset', function(req, res) {
    data = {};
    res.send('{"result":"ok"}');
});

function checkStatus() {
      var timeNow = Date.now();

      //console.log("");
      //console.log("-------------");
      //console.log('Status Check at ' + timeNow);

      for (var key in data) {
           //console.log(key + " " + data[key].name + " " + data[key].lastUpdateTime);

          // check how much time has elapsed for each quote

           var timeLapsed = timeNow - data[key].lastUpdateTime;

           if (timeLapsed > 60000) {
               // more then 1 minute since we heard last from the browser

               //console.log('No response for ' + timeLapsed + 'seconds. Delete It: ' + key + " " + data[key].name);

               // browser is not sending any messages, release lock on quote
               delete data[key];
           }
      }
     // console.log("-------------");
     // console.log("");
 }

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

checkStatus();
 setInterval(checkStatus, 60000);

module.exports = app ;
