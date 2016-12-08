var mongoose = require('mongoose');
// Use native Node promises.
mongoose.Promise = global.Promise;

// Connect to MongoDB.
mongoose.connect('mongodb://localhost/agile-transport')
  .then(() =>  console.log('Connected to MongoDB.'))
  .catch((err) => console.error(err));

// Load the MongoDB models.
var Schema = mongoose.Schema;

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

var TrackSchema = new Schema({
	'id' : String,
	'line' : String,
	'route' : Number,
	'nextStop' : Number,
	'latitude' : Number,
	'longitude' : Number,
	'speed' : Number
});
TrackModel = mongoose.model('Track', TrackSchema);

// Delete the existent Track data and start simulation.
var promise = TrackModel.remove({});

promise.then(value => { 
    console.log('Removed: ' + value);
    prepareSimulation();
}).catch(reason => {
    console.log(reason);
});

global.linesToSimulate = [{ line: "25", route: 1 }];

function prepareSimulation() {
    var lineStopsPromise = LineStopModel.find().exec();
    lineStopsPromise.then(lineStops => {
        var detailedLineStops = new Map();

        global.linesToSimulate.forEach(lineToSimulate => {
            detailedLineStops.set(lineToSimulate, lineStops.filter(stop => {
                return stop.line == lineToSimulate.line && stop.route == lineToSimulate.route;
            }).map(stop => {
                return {
                    line : stop.line,
	                route : stop.route,
	                stopSequence : stop.stopSequence,
	                stop : stop.stop,
	                nextStopDistance : stop.nextStopDistance,
	                direction : stop.direction
                };
            }).sort((left, right) => {
                return left.stopSequence - right.stopSequence;
            }));

            lineToSimulate.totalLength = detailedLineStops.get(lineToSimulate)
                .map(stop => stop.nextStopDistance)
                .reduce((accumulator, current) => {
                    return accumulator + current;
                }, 0);

            var sumOfLength = 0;
            detailedLineStops.get(lineToSimulate).forEach(stop => {
                sumOfLength = sumOfLength + stop.nextStopDistance;
                stop.totalLength = sumOfLength;
            });
        });

        var lineTimetablesPromise = LineTimetableModel.find().exec();
        lineTimetablesPromise.then(timetables => {
            newTimetables = [];
            timetables.forEach(oldRecord => {
                var record = {
                    line: oldRecord.line,
                    endOne: oldRecord.endOne,
                    endTwo: oldRecord.endTwo
                };
                var line = global.linesToSimulate.find(lineToSimulate => {
                    return lineToSimulate.line == record.line;
                });

                if (line) {
                    if (record.endOne) {
                        var hour = parseInt(record.endOne.split(":")[0]);
                        var minute = parseInt(record.endOne.split(":")[1]);
                        record.endOneRealStart = new Date();
                        record.endOneRealStart.setHours(hour,minute,0,0);
                        // Average speed of a vehicle is 30km/h.
                        var secondsNeeded = line.totalLength * 36 / 300;
                        record.endOneEstimatedEnd = new Date(record.endOneRealStart.getTime());
                        record.endOneEstimatedEnd.setSeconds(record.endOneRealStart.getSeconds() + secondsNeeded);
                    }
                    if (record.endTwo) {
                        var hour = parseInt(record.endTwo.split(":")[0]);
                        var minute = parseInt(record.endTwo.split(":")[1]);
                        record.endTwoRealStart = new Date();
                        record.endTwoRealStart.setHours(hour,minute,0,0);
                        // Average speed of a vehicle is 30km/h.
                        var secondsNeeded = line.totalLength * 36 / 300;
                        record.endTwoEstimatedEnd = new Date(record.endTwoRealStart.getTime());
                        record.endTwoEstimatedEnd.setSeconds(record.endTwoRealStart.getSeconds() + secondsNeeded);
                    }
                    newTimetables.push(record);
                }
            });

            startSimulation(detailedLineStops, newTimetables);
        }).catch(reason => {
            console.log(reason);
        });
    }).catch(reason => {
        console.log(reason);
    });
}

function startSimulation(linesToSimulate, timetables) {
    console.log(linesToSimulate);
    console.log(timetables);
}
