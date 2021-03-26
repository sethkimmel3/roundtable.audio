#!/bin/bash

echo "Starting TURN/STUN server"

#turnserver -a -v -L 0.0.0.0 --server-name "${TURN_SERVER_NAME}" --static-auth-secret="${TURN_SECRET}" --realm=${TURN_REALM}  -p ${TURN_PORT} --min-port ${TURN_PORT_START} --max-port ${TURN_PORT_END} ${TURN_EXTRA}
turnserver -a -f --no-stun --listening-port 3478 --realm roundtable.audio --user guest:somepassword -v 
