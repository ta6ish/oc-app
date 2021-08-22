//  OpenShift sample Node application
var express = require('express'),
    app = express();
const data = {
    "san-leandro": {},
    fremont: {},
    "buena-park": {},
};
var cors = require('cors');

var allowCrossDomain = function (req, res, next) {

    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');

    next();
};

app.use(cors());
app.use(allowCrossDomain);

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";


app.get("/", function (req, res) {
    const d = new Date().toUTCString();
    res.send(d.concat(" V1"));
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/qOpen", function (req, res) {
    const quoteNo = req.query.quoteNo;
    const name = req.query.name;
    const location = req.query.location || "san-leandro";

    if (quoteNo in data[location]) {
        // Is the quote already locked?

        if (name == data[location][quoteNo].name) {
            // Is the request from the same user who locked it the first time?

            // Update the last Update time
            data[location][quoteNo].lastUpdateTime = Date.now();

            // nothing really to do, access has already been granted
            res.send('{"result":"ok"}');
        } else {
            // A different user is requesting access

            // deny it
            res.send('{"result":"no","name":"' + name + '"}');
        }
    } else {
        // First time this quote is getting locked

        // store quote no in the list along with: who is locking it, and the current time
        data[location][quoteNo] = { name: name, lastUpdateTime: Date.now() };

        // Grant access
        res.send('{"result":"ok"}');
    }
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/qClose", function (req, res) {
    console.log("Got a Close request");
    var quoteNo = req.query.quoteNo;
    var location = req.query.location || "san-leandro";

    delete data[location][quoteNo];

    res.send('{"result":"ok"}');
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/clearUserQuotes", function (req, res) {
    console.log("Got a request to clear user quotes");
    var full_name = req.query.name;
    var location = req.query.location || "san-leandro";

    for (var quoteNo in data[location]) {
        if (data[location].hasOwnProperty(quoteNo)) {
            if (data[location][quoteNo].name == full_name) {
                delete data[location][quoteNo];
            }
        }
    }

    res.send('{"result":"ok"}');
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/qList", function (req, res) {
    console.log("Got List Request");
    var list = "";
    var location = req.query.location || "san-leandro";

    for (var key in data[location]) {
        if (data[location].hasOwnProperty(key)) {
            list +=
                '{"quoteNo":"' + key + '","name":"' + data[location][key].name + '"},';
        }
    }

    res.send('{"list": [' + list.substr(0, list.length - 1) + "]}");
});

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get("/qReset", function (req, res) {
    var location = req.query.location || "san-leandro";
    
    if(data[location]) {
        data[location] = {};
    }
    res.send('{"result":"ok"}');
});

function checkStatus() {
    var timeNow = Date.now();

    //console.log("");
    //console.log("-------------");
    //console.log('Status Check at ' + timeNow);
    Object.keys(data).forEach((location) => {
        for (var key in data[location]) {
            //console.log(key + " " + data[key].name + " " + data[key].lastUpdateTime);

            // check how much time has elapsed for each quote

            var timeLapsed = timeNow - data[location][key].lastUpdateTime;

            if (timeLapsed > 60000) {
                // more then 1 minute since we heard last from the browser

                //console.log('No response for ' + timeLapsed + 'seconds. Delete It: ' + key + " " + data[key].name);

                // browser is not sending any messages, release lock on quote
                delete data[location][key];
            }
        }
    });
    // console.log("-------------");
    // console.log("");
}

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

checkStatus();
setInterval(checkStatus, 60000);

module.exports = app;
