import edge from 'edge.js'
import env from '#start/env'
import { edgeIconify } from 'edge-iconify'

edge.use(edgeIconify)

edge.global('appUrl', env.get('APP_URL'))
