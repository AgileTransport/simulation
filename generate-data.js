const fs = require('fs');
var mongoose = require('mongoose');
// Use native Node promises.
mongoose.Promise = global.Promise;

// Connect to MongoDB.
mongoose.connect('mongodb://localhost/agile-transport')
  .then(() =>  console.log('Connected to MongoDB.'))
  .catch((err) => console.error(err));

// Load the MongoDB models.
var Schema = mongoose.Schema;

var LineSchema = new Schema({
	'id' : String,
	'endOne' : String,
	'endTwo' : String,
	'type' : String
});
var LineModel = mongoose.model('Line', LineSchema);

var StopSchema = new Schema({
	'id' : Number,
	'name' : String,
	'latitude' : Number,
	'longitude' : Number
});
var StopModel = mongoose.model('Stop', StopSchema);

var LineStopSchema = new Schema({
	'line' : String,
	'route' : Number,
	'stopSequence' : Number,
	'stop' : Number,
	'nextStopDistance' : Number,
	'direction' : Number
});
LineStopModel = mongoose.model('LineStop', LineStopSchema);

var LineTimetableSchema = new Schema({
	'line' : String,
	'endOne' : String,
	'endTwo' : String
});
LineTimetableModel = mongoose.model('LineTimetable', LineTimetableSchema);

// Delete all data from the database.
var promises = [];
promises.push(LineModel.remove({}));
promises.push(StopModel.remove({}));
promises.push(LineStopModel.remove({}));
promises.push(LineTimetableModel.remove({}));

Promise.all(promises).then(values => { 
    console.log('Removed: ' + values);
    createData();
}).catch(reason => {
    console.log(reason);
});

function createData() {
    // Read all the "dummy" data from the JSON files and add them
    // to the database.
    const timetableDirectory = './timetable/';
    const stopsDirectory = './stops/';

    var lines = require('./lines.json');
    var stops = require('./stops.json');

    var linesSavePromises = [];
    lines.forEach(line => {
        var Line = new LineModel({
            id : line.line,
            endOne : line.endOne,
            endTwo : line.endTwo,
            type : line.type
        });

        linesSavePromises.push(Line.save());
    });

    var linesPromise = new Promise(function (resolve, reject) {
        Promise.all(linesSavePromises).then(lines => {
            lines.forEach(line => {
                console.log('Line "' + line.id + '" saved.');
            });
            resolve(lines);
        }).catch(reason => {
            console.log(reason);
            reject(reason);
        });
    });
    
    var stopsSavePromises = [];
    stops.forEach(stop => {
        var Stop = new StopModel({
            id : stop.id,
            name : stop.name,
            latitude : stop.latitude,
            longitude : stop.longitude
        });

        stopsSavePromises.push(Stop.save());
    });

    var stopsPromise = new Promise(function (resolve, reject) {
        Promise.all(stopsSavePromises).then(stops => {
            stops.forEach(stop => {
                console.log('Stop "' + stop.name + '" saved.');
            });
            resolve(stops);
        }).catch(reason => {
            console.log(reason);
            reject(reason);
        });
    });

    var timetablesPromise = new Promise(function (resolve, reject) {
        fs.readdir(timetableDirectory, (err, lineNames) => {
            lineNames.forEach(lineName => {
                var data = require(timetableDirectory + lineName);
                var timetablesSavePromises = [];
                var lineId = lineName.split(".")[0];

                data.forEach(time => {
                    var Timetable = new LineTimetableModel({
                        line : lineId,
                        endOne : time.endOne,
                        endTwo : time.endTwo
                    });

                    timetablesSavePromises.push(Timetable.save());
                });

                Promise.all(timetablesSavePromises).then(timetables => {
                    timetables.forEach(t => {
                        console.log('Timetable for ' + t.line + ' (' + t.endOne + ') saved.');
                    });
                    resolve(timetables);
                }).catch(reason => {
                    console.log(reason);
                    reject(reason);
                });
            });
        });
    });
    

    var lineStopsPromise = new Promise(function (resolve, reject) {
        fs.readdir(stopsDirectory, (err, lineNames) => {
            lineNames.forEach(lineName => {
                var data = require(stopsDirectory + lineName);
                var lineStopsSavePromises = [];
                var lineId = lineName.split(".")[0].split("-")[0];
                var routeId = lineName.split(".")[0].split("-")[1];

                data.forEach(lineStop => {
                    var LineStop = new LineStopModel({
                        line : lineId,
                        route : routeId,
                        stopSequence : lineStop.stopSequence,
                        stop : lineStop.stop,
                        nextStopDistance : lineStop.nextStopDistance,
                        direction : lineStop.direction
                    });

                    lineStopsSavePromises.push(LineStop.save());
                });

                Promise.all(lineStopsSavePromises).then(lineStops => {
                    lineStops.forEach(s => {
                        console.log('Line stop for ' + s.line + ' (' + s.stop + ') saved.');
                    });
                    resolve(lineStops);
                }).catch(reason => {
                    console.log(reason);
                    reject(reason);
                });
            });
        });
    });

    Promise.all([linesPromise, stopsPromise, timetablesPromise, lineStopsPromise]).then(values => {
        console.log('Data generated.');
        mongoose.connection.close();
    }).catch(reason => {
        console.log(reason);
        mongoose.connection.close();
    });
}
