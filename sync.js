var Pouch = require('pouchdb')
var _ = require('underscore')
var Backbone = require('backbone')
var sys = require('sys')
var exec = require('child_process').exec;
var moment = require('moment')

var syncServer = 'http://pi:raspberry@sync.local:5984/'
var bellServer = 'http://pi:raspberry@raspberrypi.local:5984/'

var db = new Pouch(syncServer + 'replicator')
var replications = new Backbone.Collection();
replications.replicated = 0


replications.on('done', function() {
  console.log('done')
  // Get the facilityId, save an Action document, and then shutdown the system
  Pouch(bellServer + 'whoami').get('facility', function(err, doc) {
    console.log(doc)
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
    console.log(action)
    Pouch(bellServer + 'actions').post(action, function(err, response) {
      console.log(err)
      console.log(response)
      console.log('Sync has been logged. Going for shutdown')
      //exec('shutdown -p now')
    })
  })
})
 
replications.on('ready', function() {
  console.log('ready')
  _.each(replications.models, function(model) {
    Pouch.replicate(model.get('source'), model.get('target'), {
      complete: function() {
        replications.replicated++
        if(replications.replicated == replications.models.length) {
          replications.trigger('done')
        }
      }
    })
  })
})

// Get replications so it will trigger ready event
db.allDocs({include_docs: true}, function(err, response) { 
  _.each(response.rows, function(row) {
    if(row.doc.kind == 'Replicate') {
      replications.models.push(new Backbone.Model(row.doc))
    }
  })
  replications.trigger('ready')
});


