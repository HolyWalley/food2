#!/bin/bash

# Create default databases
curl -X PUT http://admin:password@localhost:5984/_users
curl -X PUT http://admin:password@localhost:5984/_replicator
curl -X PUT http://admin:password@localhost:5984/_global_changes

# Create the food2 database
curl -X PUT http://admin:password@localhost:5984/food2

# Set public access to food2 database
curl -X PUT http://admin:password@localhost:5984/food2/_security -d '{"admins":{"names":[],"roles":[]},"members":{"names":[],"roles":[]}}'

# Set CORS for the database
curl -X PUT http://admin:password@localhost:5984/_node/nonode@nohost/_config/cors/origins -d '"*"'
curl -X PUT http://admin:password@localhost:5984/_node/nonode@nohost/_config/cors/credentials -d '"true"'
curl -X PUT http://admin:password@localhost:5984/_node/nonode@nohost/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'
curl -X PUT http://admin:password@localhost:5984/_node/nonode@nohost/_config/cors/headers -d '"accept, authorization, content-type, origin, referer, x-csrf-token"'

echo "Database food2 created and CORS configured successfully"

