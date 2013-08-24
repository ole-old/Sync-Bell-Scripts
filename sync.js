var Pouch = require('pouchdb')
var _ = require('underscore')
var Backbone = require('backbone')
var sys = require('sys')
var exec = require('child_process').exec;
var moment = require('moment')
var $ = require('jquery')

var syncServer = 'http://pi:raspberry@sync.local:5984/'
var bellServer = 'http://pi:raspberry@raspberrypi.local:5984/'

var db = new Pouch(syncServer + 'replicator')
var replications = new Backbone.Collection();
replications.replicated = 0


replications.on('done', function() {
  console.log('done')
  // Get the facilityId, save an Action document, and then shutdown the system
  Pouch(bellServer + 'whoami').get('facility', function(err, doc) {
    var facilityId = doc.facilityId  
    // @todo we should think about the schema for memberId. 
    // Might want source/sourceType and target/targetType properties
    var action = {
      memberId: "syncBell",       
      kind: 'Action',
      action: 'synced',
      objectId: facilityId,
      timestamp: moment.utc().unix(),
      context: 'syncBell',
      facilityId: facilityId
    }
    Pouch(bellServer + 'actions').post(action, function(err, response) {
      console.log('Sync has been logged. Going for shutdown')
      //exec('shutdown -p now')
    })
  })
})


replications.on('ready', function() {
  console.log('ready')
  _.each(replications.models, function(model) {
    Pouch.replicate(model.get('source'), model.get('target'), {
      complete: function(err, response) {
        if(err) {
          console.log("Replication " + (replications.replicated + 1) + ":")
          console.log(err)
        }
        console.log("Replication " + (replications.replicated + 1) + ":")
        console.log(response)
        replications.replicated++
        if(replications.replicated == replications.models.length) {
          replications.trigger('done')
        }
      }
    })
  })
})

// Get replications so it will trigger ready event
console.log('Looking for Bell Server')
$.getJSON(bellServer, function() {
  console.log('Found Bell Server! :-)')
  console.log('fetching all docs in replicator')
  db.allDocs({include_docs: true}, function(err, response) { 
    console.log('received all docs in replicator')
    _.each(response.rows, function(row) {
      if(row.doc.kind == 'Replicate') {
        replications.models.push(new Backbone.Model(row.doc))
      }
    })
    replications.trigger('ready')
  });
})
.fail(function() { 
  console.log('Bell Server not found :-(')
})

