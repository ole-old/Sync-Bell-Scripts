This script will sync databases as directed in the http://sync.local:5984/replicator database and then shutdown the system if the user running the script has permissions to do so. 

# Schema of the replicator docs
{
  kind: "Replicate",
  target: "http://...",
  source: "http://..."
}

# Installation

To run on start place "sudo node [absolute path to sync.js]" at the end of /etc/rc.local but before "exit 0".

To avoid restarts, make sure there is no raspberrypi.local on the network.
